import React, { useState, useEffect, useRef } from "react";
import { PendulumSystem, CanonicalState, SimulationSettings } from "./physics/types";
import { validateSystem } from "./physics/validation";
import { getEnergies } from "./physics/hamiltonian";
import { getMassPositions } from "./physics/geometry";
import { DampingForce, ConstantTorqueForce, PeriodicTorqueForce } from "./physics/external-forces";
import { getEquationsOfMotion } from "./physics/equations-of-motion";
import { calculatePowerRates } from "./physics/energy-balance";
import { INTEGRATORS } from "./integration/integrator";
import { SimulationClock } from "./integration/simulation-clock";
import { PRESETS } from "./app/presets";

// Components
import SystemControls from "./components/SystemControls";
import SimulationCanvas from "./components/SimulationCanvas";
import PlaybackControls from "./components/PlaybackControls";
import HamiltonianPanel from "./components/HamiltonianPanel";
import EnergyPlot from "./components/EnergyPlot";
import AnglePlot from "./components/AnglePlot";
import PhasePlot from "./components/PhasePlot";

export const App: React.FC = () => {
  // 1. Core State Models
  const [system, setSystem] = useState<PendulumSystem>(
    JSON.parse(JSON.stringify(PRESETS[0].system)) // load default "Small-Angle Ideal" preset
  );

  const [state, setState] = useState<CanonicalState>({
    timeSec: 0.0,
    q: system.links.map((l) => (l.initialAngleDeg * Math.PI) / 180),
    p: new Array(system.links.length).fill(0.0), // starting from rest
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [physicsDt, setPhysicsDt] = useState<number>(0.01); // default step size
  const [integratorId, setIntegratorId] = useState<string>("rk4"); // default high accuracy solver

  // Plot tabs
  const [activeTab, setActiveTab] = useState<"energy" | "angles" | "phase">("energy");

  // History buffers for plotting
  const [energyHistory, setEnergyHistory] = useState<any[]>([]);
  const [angleHistory, setAngleHistory] = useState<any[]>([]);
  const [phaseHistory, setPhaseHistory] = useState<any[]>([]);
  const [trailHistory, setTrailHistory] = useState<{ x: number; y: number }[]>([]);

  // Integrated Power Work
  const [integratedWork, setIntegratedWork] = useState<number>(0.0);
  const [integratedDampingLoss, setIntegratedDampingLoss] = useState<number>(0.0);

  // Invariants
  const [initialEnergy, setInitialEnergy] = useState<number | null>(null);
  const [hasError, setHasError] = useState<string | null>(null);

  // Refs for tracking simulation time accumulator
  const clockRef = useRef(new SimulationClock(physicsDt, playbackSpeed));
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);

  // Sync clock properties on parameter change
  useEffect(() => {
    clockRef.current.physicsDtSec = physicsDt;
    clockRef.current.playbackSpeed = playbackSpeed;
  }, [physicsDt, playbackSpeed]);

  // Physics Derivative function [dq/dt, dp/dt]
  const deriv = (s: number[], t: number): number[] => {
    const half = s.length / 2;
    const qVec = s.slice(0, half);
    const pVec = s.slice(half);

    const forces = [
      new DampingForce(),
      new ConstantTorqueForce(),
      new PeriodicTorqueForce(),
    ];

    return getEquationsOfMotion(qVec, pVec, t, system, forces);
  };

  // Main Loop step updates
  const advanceSimulation = (realElapsedTimeSec: number) => {
    if (hasError) return;

    // Determine how many fixed steps to run based on accumulator
    const stepsToTake = clockRef.current.update(realElapsedTimeSec);
    if (stepsToTake === 0) return;

    setState((prevState) => {
      const half = prevState.q.length;
      let nextStateVec = [...prevState.q, ...prevState.p];
      let nextTime = prevState.timeSec;
      const dt = clockRef.current.physicsDtSec;

      let unstable = false;
      let localWork = integratedWork;
      let localLoss = integratedDampingLoss;

      const masses = system.links.map((l) => l.massKg);
      const lengths = system.links.map((l) => l.lengthM);
      const g = system.gravityMPerSec2;

      for (let step = 0; step < stepsToTake; step++) {
        // Compute velocities and powers at the current step midpoint
        const qCur = nextStateVec.slice(0, half);
        const pCur = nextStateVec.slice(half);

        const { dq } = getEnergies(qCur, pCur, masses, lengths, g);

        // Compute external applied torques at joint indices
        const dampingCoeffs = system.links.map((l) => l.dampingCoefficient);
        const appliedTorques = new Array(half).fill(0.0);

        if (system.periodicTorque.enabled && system.periodicTorque.targetJointIndex < half) {
          const pTorque = system.periodicTorque;
          appliedTorques[pTorque.targetJointIndex] +=
            pTorque.amplitudeNm *
            Math.cos(pTorque.angularFrequencyRadPerSec * nextTime + pTorque.phaseRad);
        }
        if (system.constantTorque.enabled && system.constantTorque.targetJointIndex < half) {
          appliedTorques[system.constantTorque.targetJointIndex] += system.constantTorque.torqueNm;
        }

        const rates = calculatePowerRates(dq, dampingCoeffs, appliedTorques);
        localWork += rates.inputPower * dt;
        localLoss += rates.dampingLoss * dt;

        // Perform integrator step
        const integrator = INTEGRATORS[integratorId] ?? INTEGRATORS.rk4;
        try {
          nextStateVec = integrator.step(deriv, nextStateVec, nextTime, dt);
          nextTime += dt;
        } catch (err: any) {
          unstable = true;
          setHasError(err.message || "Linear system solution failed.");
          break;
        }

        // Check for NaN/Inf instability
        if (nextStateVec.some((val) => !Number.isFinite(val))) {
          unstable = true;
          setHasError("Numerical instability detected (NaN/Infinity). Try RK4 or reduce time step.");
          break;
        }
      }

      if (unstable) {
        setIsPlaying(false);
        return prevState;
      }

      const qNext = nextStateVec.slice(0, half);
      const pNext = nextStateVec.slice(half);

      // Compute final energy states for traces
      const { T, V, H } = getEnergies(qNext, pNext, masses, lengths, g);

      // Save initial energy comparison point if null
      if (initialEnergy === null) {
        setInitialEnergy(H);
      }

      // Update histories
      setIntegratedWork(localWork);
      setIntegratedDampingLoss(localLoss);

      setEnergyHistory((prev) => {
        const next = [...prev, { time: nextTime, T, V, H }];
        return next.slice(-200); // limit energy buffer
      });

      setAngleHistory((prev) => {
        const next = [...prev, { time: nextTime, q: [...qNext] }];
        return next.slice(-200);
      });

      setPhaseHistory((prev) => {
        const next = [...prev, { q: [...qNext], p: [...pNext] }];
        return next.slice(-500); // limit phase portrait buffer
      });

      // Compute mass tip trail
      const positions = getMassPositions(qNext, lengths);
      const tipCoord = positions[positions.length - 1]; // get final mass coordinates
      setTrailHistory((prev) => {
        const next = [...prev, tipCoord];
        return next.slice(-200);
      });

      return {
        timeSec: nextTime,
        q: qNext,
        p: pNext,
      };
    });
  };

  // requestAnimationFrame animation loop wrapper
  const loop = (timeMs: number) => {
    if (previousTimeRef.current !== null) {
      const realElapsedTimeSec = (timeMs - previousTimeRef.current) / 1000;
      advanceSimulation(realElapsedTimeSec);
    }
    previousTimeRef.current = timeMs;
    requestRef.current = requestAnimationFrame(loop);
  };

  // Start / Stop animation loops
  useEffect(() => {
    if (isPlaying && !hasError) {
      previousTimeRef.current = null;
      requestRef.current = requestAnimationFrame(loop);
    } else {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    }
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, integratorId, system, hasError]);

  // Apply & Reset
  const handleReset = () => {
    setIsPlaying(false);
    clockRef.current.reset();
    previousTimeRef.current = null;

    const error = validateSystem(system);
    if (error) {
      setHasError(error);
      return;
    }

    const qInit = system.links.map((l) => (l.initialAngleDeg * Math.PI) / 180);
    const pInit = new Array(system.links.length).fill(0.0);

    setState({
      timeSec: 0.0,
      q: qInit,
      p: pInit,
    });

    const masses = system.links.map((l) => l.massKg);
    const lengths = system.links.map((l) => l.lengthM);
    const { T, V, H } = getEnergies(qInit, pInit, masses, lengths, system.gravityMPerSec2);

    setInitialEnergy(H);
    setEnergyHistory([{ time: 0.0, T, V, H }]);
    setAngleHistory([{ time: 0.0, q: qInit }]);
    setPhaseHistory([{ q: qInit, p: pInit }]);

    const positions = getMassPositions(qInit, lengths);
    setTrailHistory([positions[positions.length - 1]]);

    setIntegratedWork(0.0);
    setIntegratedDampingLoss(0.0);
    setHasError(null);
  };

  // Trigger initial reset setup
  useEffect(() => {
    handleReset();
  }, [system]);

  // Handles manual Step increments (forward exactly by physicsDt)
  const handleStep = () => {
    if (hasError) return;
    advanceSimulation(physicsDt);
  };

  // Change parameters angle via mouse dragging
  const handleAngleChangeDrag = (idx: number, deg: number) => {
    setIsPlaying(false);
    const updatedLinks = system.links.map((link, j) => {
      if (j === idx) {
        return { ...link, initialAngleDeg: deg };
      }
      return link;
    });

    setSystem({ ...system, links: updatedLinks });

    // Explicitly update live coordinates and velocity states
    setState((prev) => {
      const nextQ = [...prev.q];
      nextQ[idx] = (deg * Math.PI) / 180;
      const nextP = [...prev.p];
      nextP[idx] = 0.0; // rest momentum

      // Re-evaluate initial energies
      const masses = system.links.map((l) => l.massKg);
      const lengths = system.links.map((l) => l.lengthM);
      const { T, V, H } = getEnergies(nextQ, nextP, masses, lengths, system.gravityMPerSec2);

      setInitialEnergy(H);
      setEnergyHistory([{ time: 0.0, T, V, H }]);
      setAngleHistory([{ time: 0.0, q: nextQ }]);
      setPhaseHistory([{ q: nextQ, p: nextP }]);

      const positions = getMassPositions(nextQ, lengths);
      setTrailHistory([positions[positions.length - 1]]);

      setIntegratedWork(0.0);
      setIntegratedDampingLoss(0.0);
      setHasError(null);

      return {
        timeSec: 0.0,
        q: nextQ,
        p: nextP,
      };
    });
  };

  // Calculate energy drift percent
  let energyDriftPercent: number | null = null;
  if (initialEnergy !== null && energyHistory.length > 0) {
    const curH = energyHistory[energyHistory.length - 1].H;
    const expectedH = initialEnergy + integratedWork + integratedDampingLoss;
    const denominator = Math.max(Math.abs(initialEnergy), 1e-5);
    energyDriftPercent = ((curH - expectedH) / denominator) * 100;
  }

  // Get current velocities for presentation
  const masses = system.links.map((l) => l.massKg);
  const lengths = system.links.map((l) => l.lengthM);
  let dq: number[] = new Array(system.links.length).fill(0.0);
  try {
    const energyOutputs = getEnergies(state.q, state.p, masses, lengths, system.gravityMPerSec2);
    dq = energyOutputs.dq;
  } catch (e) {}

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200">
        <div>
          <h1 className="text-lg font-bold text-stone-850">Pendulum Hamiltonian Lab</h1>
          <p className="text-xs text-stone-500">
            Build a multi-link pendulum system and inspect its energy, momentum, and chaotic coordinates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded cursor-pointer"
          >
            Reset State
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 overflow-hidden">
        {/* Left column: System configuration (3 cols) */}
        <section className="lg:col-span-3 h-full overflow-hidden">
          <SystemControls
            system={system}
            onChangeSystem={setSystem}
            isPlaying={isPlaying}
            onReset={handleReset}
          />
        </section>

        {/* Center column: Simulation, widgets, and plots (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4 h-full overflow-hidden">
          {/* Canvas area */}
          <div className="flex-1 min-h-[300px]">
            {hasError ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50 border border-amber-200 rounded p-6 text-center">
                <span className="text-amber-800 font-bold mb-2">Simulation Stopped</span>
                <p className="text-xs text-amber-700 max-w-sm mb-4">{hasError}</p>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded transition-colors cursor-pointer"
                >
                  Reset Parameters
                </button>
              </div>
            ) : (
              <SimulationCanvas
                q={state.q}
                lengths={lengths}
                masses={masses}
                trailHistory={trailHistory}
                isPlaying={isPlaying}
                onAngleChange={handleAngleChangeDrag}
              />
            )}
          </div>

          {/* Controls widget panel */}
          <PlaybackControls
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onStep={handleStep}
            onReset={handleReset}
            playbackSpeed={playbackSpeed}
            onChangeSpeed={setPlaybackSpeed}
          />

          {/* Status readouts bar */}
          <div className="flex justify-between items-center px-3 py-1 bg-stone-100 border border-stone-200 rounded text-[11px] font-mono-num text-stone-500">
            <span>t = {state.timeSec.toFixed(3)} s</span>
            <span>dt = {physicsDt.toFixed(4)} s</span>
            <span>
              Status:{" "}
              <span className="font-semibold uppercase">
                {hasError ? "Unstable" : isPlaying ? "Running" : "Paused"}
              </span>
            </span>
            {energyDriftPercent !== null && (
              <span>Drift: {energyDriftPercent.toFixed(4)}%</span>
            )}
          </div>

          {/* Tabbed plots panel */}
          <div className="flex flex-col gap-2">
            <div className="flex border-b border-stone-200">
              <button
                onClick={() => setActiveTab("energy")}
                className={`px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
                  activeTab === "energy"
                    ? "border-stone-700 text-stone-800"
                    : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                Energy
              </button>
              <button
                onClick={() => setActiveTab("angles")}
                className={`px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
                  activeTab === "angles"
                    ? "border-stone-700 text-stone-800"
                    : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                Angles
              </button>
              <button
                onClick={() => setActiveTab("phase")}
                className={`px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
                  activeTab === "phase"
                    ? "border-stone-700 text-stone-800"
                    : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                Phase space
              </button>
            </div>

            <div className="flex-1 min-h-[220px]">
              {activeTab === "energy" && <EnergyPlot history={energyHistory} />}
              {activeTab === "angles" && (
                <AnglePlot history={angleHistory} linkCount={system.links.length} />
              )}
              {activeTab === "phase" && (
                <PhasePlot history={phaseHistory} linkCount={system.links.length} />
              )}
            </div>
          </div>
        </section>

        {/* Right column: Hamiltonian formulation substitutions (4 cols) */}
        <section className="lg:col-span-4 h-full overflow-hidden">
          <HamiltonianPanel
            system={system}
            state={state}
            dq={dq}
            integratedWork={integratedWork}
            integratedDampingLoss={integratedDampingLoss}
            energyDriftPercent={energyDriftPercent}
          />
        </section>
      </main>
    </div>
  );
};
export default App;

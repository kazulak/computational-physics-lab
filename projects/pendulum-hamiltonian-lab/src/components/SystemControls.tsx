import React from "react";
import { PendulumSystem, PendulumLink, PeriodicTorque, ConstantTorque } from "../physics/types";
import { PRESETS } from "../app/presets";
import { formatFloat } from "../formatting/numbers";

interface SystemControlsProps {
  system: PendulumSystem;
  onChangeSystem: (system: PendulumSystem) => void;
  isPlaying: boolean;
  onReset: () => void;
}

export const SystemControls: React.FC<SystemControlsProps> = ({
  system,
  onChangeSystem,
  isPlaying,
  onReset,
}) => {
  // Update link count
  const handleLinkCountChange = (delta: number) => {
    const currentCount = system.links.length;
    const nextCount = currentCount + delta;
    if (nextCount < 1 || nextCount > 4) return;

    let updatedLinks = [...system.links];
    if (delta > 0) {
      // Append a default link to the end
      const newIndex = currentCount + 1;
      const newLink: PendulumLink = {
        id: `link-${Date.now()}`,
        massKg: 1.0,
        lengthM: 1.0,
        initialAngleDeg: 10.0,
        initialAngularVelocityRadPerSec: 0.0,
        dampingCoefficient: 0.0,
      };
      updatedLinks.push(newLink);
    } else {
      // Pop the last link
      updatedLinks.pop();
    }

    // Pause/Reset the simulation on structural changes
    onChangeSystem({
      ...system,
      links: updatedLinks,
      // Reset target joints for torques if out of bounds
      periodicTorque: {
        ...system.periodicTorque,
        targetJointIndex: Math.min(system.periodicTorque.targetJointIndex, nextCount - 1),
      },
      constantTorque: {
        ...system.constantTorque,
        targetJointIndex: Math.min(system.constantTorque.targetJointIndex, nextCount - 1),
      },
    });
    onReset();
  };

  // Update specific link property
  const handleLinkChange = (index: number, field: keyof PendulumLink, value: number) => {
    const updatedLinks = system.links.map((link, idx) => {
      if (idx === index) {
        return { ...link, [field]: value };
      }
      return link;
    });

    onChangeSystem({ ...system, links: updatedLinks });

    // For structure/initial conditions, trigger a reset if paused
    if (field !== "dampingCoefficient" && !isPlaying) {
      // trigger reset state
    }
  };

  // Update gravity
  const handleGravityChange = (val: number) => {
    onChangeSystem({ ...system, gravityMPerSec2: val });
  };

  // Preset gravities
  const gravityPresets = [
    { name: "Zero", value: 0.0 },
    { name: "Moon", value: 1.62 },
    { name: "Earth", value: 9.81 },
    { name: "Jupiter", value: 24.79 },
  ];

  // Update periodic driving torque
  const handlePeriodicChange = (field: keyof PeriodicTorque, value: any) => {
    onChangeSystem({
      ...system,
      periodicTorque: { ...system.periodicTorque, [field]: value },
    });
  };

  // Update constant torque
  const handleConstantChange = (field: keyof ConstantTorque, value: any) => {
    onChangeSystem({
      ...system,
      constantTorque: { ...system.constantTorque, [field]: value },
    });
  };

  // Preset loading handler
  const loadPreset = (presetName: string) => {
    const preset = PRESETS.find((p) => p.name === presetName);
    if (!preset) return;

    const confirmLoad = window.confirm(
      `Load preset "${presetName}"? This will overwrite your current configuration.`
    );
    if (confirmLoad) {
      onChangeSystem(JSON.parse(JSON.stringify(preset.system)));
      onReset();
    }
  };

  // Export JSON
  const exportConfiguration = () => {
    const jsonStr = JSON.stringify(system, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pendulum_lab_config_${system.links.length}link.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const importConfiguration = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as PendulumSystem;
        // Simple structure check
        if (imported.links && Array.isArray(imported.links) && imported.links.length > 0) {
          onChangeSystem(imported);
          onReset();
        } else {
          alert("Invalid file format: Missing links array.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset input
  };

  return (
    <div className="flex flex-col gap-6 p-4 bg-white border border-stone-200 rounded h-full overflow-y-auto">
      {/* JSON Import/Export and Preset Loading */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
          Presets & Configuration
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={exportConfiguration}
            className="px-2 py-1.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded cursor-pointer"
          >
            Export JSON
          </button>
          <label className="px-2 py-1.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded text-center cursor-pointer select-none">
            Import JSON
            <input
              type="file"
              accept=".json"
              onChange={importConfiguration}
              className="hidden"
            />
          </label>
        </div>

        <select
          onChange={(e) => {
            if (e.target.value) {
              loadPreset(e.target.value);
              e.target.value = ""; // reset
            }
          }}
          className="w-full px-2 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded text-stone-800 focus:outline-none cursor-pointer"
        >
          <option value="">-- Select Preset --</option>
          {PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* 1. Links Counter */}
      <div className="flex flex-col gap-2 border-t border-stone-100 pt-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">
            Pendulum Chain (Links)
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLinkCountChange(-1)}
              disabled={system.links.length <= 1 || isPlaying}
              className="px-2 py-0.5 font-bold text-sm bg-stone-100 text-stone-600 border border-stone-300 rounded hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              −
            </button>
            <span className="font-mono-num font-bold text-stone-800 text-sm select-none">
              {system.links.length}
            </span>
            <button
              onClick={() => handleLinkCountChange(1)}
              disabled={system.links.length >= 4 || isPlaying}
              className="px-2 py-0.5 font-bold text-sm bg-stone-100 text-stone-600 border border-stone-300 rounded hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
        {isPlaying && (
          <div className="text-[10px] text-amber-600 font-medium">
            * Pause simulation to modify link count, lengths, or masses.
          </div>
        )}
      </div>

      {/* 2. Links Rows List */}
      <div className="flex flex-col gap-4 border-t border-stone-100 pt-3">
        {system.links.map((link, idx) => (
          <div key={link.id} className="p-3 bg-stone-50 border border-stone-200 rounded text-xs flex flex-col gap-3">
            <div className="font-bold text-stone-600 border-b border-stone-200 pb-1">
              Link {idx + 1}
            </div>

            {/* Mass */}
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-stone-500 font-medium">Mass:</span>
              <input
                type="range"
                min="0.1"
                max="10.0"
                step="0.1"
                value={link.massKg}
                disabled={isPlaying}
                onChange={(e) => handleLinkChange(idx, "massKg", parseFloat(e.target.value))}
                className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex items-center gap-1 justify-end font-mono-num">
                <input
                  type="number"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                  value={link.massKg}
                  disabled={isPlaying}
                  onChange={(e) => handleLinkChange(idx, "massKg", parseFloat(e.target.value) || 0)}
                  className="w-12 px-1 py-0.5 bg-white border border-stone-300 rounded text-right"
                />
                <span className="text-[10px] text-stone-400">kg</span>
              </div>
            </div>

            {/* Length */}
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-stone-500 font-medium">Length:</span>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={link.lengthM}
                disabled={isPlaying}
                onChange={(e) => handleLinkChange(idx, "lengthM", parseFloat(e.target.value))}
                className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex items-center gap-1 justify-end font-mono-num">
                <input
                  type="number"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={link.lengthM}
                  disabled={isPlaying}
                  onChange={(e) => handleLinkChange(idx, "lengthM", parseFloat(e.target.value) || 0)}
                  className="w-12 px-1 py-0.5 bg-white border border-stone-300 rounded text-right"
                />
                <span className="text-[10px] text-stone-400">m</span>
              </div>
            </div>

            {/* Initial Angle */}
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-stone-500 font-medium">Angle:</span>
              <input
                type="range"
                min="-180"
                max="180"
                value={link.initialAngleDeg}
                disabled={isPlaying}
                onChange={(e) => handleLinkChange(idx, "initialAngleDeg", parseFloat(e.target.value))}
                className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex items-center gap-1 justify-end font-mono-num">
                <input
                  type="number"
                  min="-180"
                  max="180"
                  value={link.initialAngleDeg}
                  disabled={isPlaying}
                  onChange={(e) => handleLinkChange(idx, "initialAngleDeg", parseFloat(e.target.value) || 0)}
                  className="w-12 px-1 py-0.5 bg-white border border-stone-300 rounded text-right"
                />
                <span className="text-[10px] text-stone-400">°</span>
              </div>
            </div>

            {/* Initial Velocity */}
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-stone-500 font-medium">Velocity:</span>
              <input
                type="range"
                min="-10.0"
                max="10.0"
                step="0.5"
                value={link.initialAngularVelocityRadPerSec}
                disabled={isPlaying}
                onChange={(e) => handleLinkChange(idx, "initialAngularVelocityRadPerSec", parseFloat(e.target.value))}
                className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex items-center gap-1 justify-end font-mono-num">
                <input
                  type="number"
                  min="-10.0"
                  max="10.0"
                  step="0.1"
                  value={link.initialAngularVelocityRadPerSec}
                  disabled={isPlaying}
                  onChange={(e) => handleLinkChange(idx, "initialAngularVelocityRadPerSec", parseFloat(e.target.value) || 0)}
                  className="w-12 px-1 py-0.5 bg-white border border-stone-300 rounded text-right"
                />
                <span className="text-[10px] text-stone-400">rad/s</span>
              </div>
            </div>

            {/* Joint Damping */}
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-stone-500 font-medium">Damping (b):</span>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={link.dampingCoefficient}
                onChange={(e) => handleLinkChange(idx, "dampingCoefficient", parseFloat(e.target.value))}
                className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex items-center gap-1 justify-end font-mono-num">
                <input
                  type="number"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={link.dampingCoefficient}
                  onChange={(e) => handleLinkChange(idx, "dampingCoefficient", parseFloat(e.target.value) || 0)}
                  className="w-12 px-1 py-0.5 bg-white border border-stone-300 rounded text-right"
                />
                <span className="text-[9px] text-stone-400">Nms/r</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Global Gravity */}
      <div className="flex flex-col gap-2 border-t border-stone-100 pt-3 text-xs">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">
          Global Gravity
        </label>
        <div className="flex items-center justify-between gap-4 font-mono-num">
          <input
            type="number"
            min="0.0"
            max="30.0"
            step="0.1"
            value={system.gravityMPerSec2}
            disabled={isPlaying}
            onChange={(e) => handleGravityChange(parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 bg-white border border-stone-300 rounded text-right text-sm"
          />
          <span className="text-stone-500">m/s²</span>
        </div>

        <div className="grid grid-cols-4 gap-1 mt-1">
          {gravityPresets.map((gp) => (
            <button
              key={gp.name}
              disabled={isPlaying}
              onClick={() => handleGravityChange(gp.value)}
              className="px-1 py-1 text-[10px] font-medium text-stone-600 bg-stone-50 border border-stone-300 rounded hover:bg-stone-150 active:bg-stone-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {gp.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Composable External Driving Forces */}
      <div className="flex flex-col gap-4 border-t border-stone-100 pt-3 text-xs">
        {/* Periodic Drive */}
        <div className="p-3 bg-stone-50 border border-stone-200 rounded flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1">
            <span className="font-bold text-stone-600">Periodic Forcing</span>
            <input
              type="checkbox"
              checked={system.periodicTorque.enabled}
              onChange={(e) => handlePeriodicChange("enabled", e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
          </div>

          {system.periodicTorque.enabled && (
            <>
              {/* Joint Select */}
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Target Joint:</span>
                <select
                  value={system.periodicTorque.targetJointIndex}
                  onChange={(e) => handlePeriodicChange("targetJointIndex", parseInt(e.target.value))}
                  className="px-1 py-0.5 bg-white border border-stone-300 rounded"
                >
                  {system.links.map((_, i) => (
                    <option key={i} value={i}>
                      Joint {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amplitude */}
              <div className="grid grid-cols-3 items-center gap-2">
                <span className="text-stone-500 font-medium">Amplitude:</span>
                <input
                  type="range"
                  min="0.0"
                  max="10.0"
                  step="0.1"
                  value={system.periodicTorque.amplitudeNm}
                  onChange={(e) => handlePeriodicChange("amplitudeNm", parseFloat(e.target.value))}
                  className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex items-center gap-1 justify-end font-mono-num">
                  <input
                    type="number"
                    min="0.0"
                    max="10.0"
                    step="0.1"
                    value={system.periodicTorque.amplitudeNm}
                    onChange={(e) => handlePeriodicChange("amplitudeNm", parseFloat(e.target.value) || 0)}
                    className="w-12 px-1 py-0.5 bg-white border border-stone-300 rounded text-right"
                  />
                  <span className="text-[10px] text-stone-400">N·m</span>
                </div>
              </div>

              {/* Ordinary Frequency (f) */}
              <div className="grid grid-cols-3 items-center gap-2">
                <span className="text-stone-500 font-medium">Freq (f):</span>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={system.periodicTorque.angularFrequencyRadPerSec / (2 * Math.PI)}
                  onChange={(e) =>
                    handlePeriodicChange("angularFrequencyRadPerSec", parseFloat(e.target.value) * 2 * Math.PI)
                  }
                  className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex items-center gap-1 justify-end font-mono-num">
                  <input
                    type="number"
                    min="0.0"
                    max="2.0"
                    step="0.05"
                    value={system.periodicTorque.angularFrequencyRadPerSec / (2 * Math.PI)}
                    onChange={(e) =>
                      handlePeriodicChange(
                        "angularFrequencyRadPerSec",
                        (parseFloat(e.target.value) || 0) * 2 * Math.PI
                      )
                    }
                    className="w-12 px-1 py-0.5 bg-white border border-stone-300 rounded text-right"
                  />
                  <span className="text-[10px] text-stone-400">Hz</span>
                </div>
              </div>

              {/* Angular Frequency Display */}
              <div className="text-[10px] text-stone-400 text-right font-mono-num">
                Derived ω: {formatFloat(system.periodicTorque.angularFrequencyRadPerSec, 2)} rad/s
              </div>
            </>
          )}
        </div>

        {/* Constant Torque */}
        <div className="p-3 bg-stone-50 border border-stone-200 rounded flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1">
            <span className="font-bold text-stone-600">Constant Torque</span>
            <input
              type="checkbox"
              checked={system.constantTorque.enabled}
              onChange={(e) => handleConstantChange("enabled", e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
          </div>

          {system.constantTorque.enabled && (
            <>
              {/* Joint Select */}
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Target Joint:</span>
                <select
                  value={system.constantTorque.targetJointIndex}
                  onChange={(e) => handleConstantChange("targetJointIndex", parseInt(e.target.value))}
                  className="px-1 py-0.5 bg-white border border-stone-300 rounded"
                >
                  {system.links.map((_, i) => (
                    <option key={i} value={i}>
                      Joint {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value */}
              <div className="grid grid-cols-3 items-center gap-2">
                <span className="text-stone-500 font-medium">Torque:</span>
                <input
                  type="range"
                  min="-5.0"
                  max="5.0"
                  step="0.1"
                  value={system.constantTorque.torqueNm}
                  onChange={(e) => handleConstantChange("torqueNm", parseFloat(e.target.value))}
                  className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex items-center gap-1 justify-end font-mono-num">
                  <input
                    type="number"
                    min="-5.0"
                    max="5.0"
                    step="0.1"
                    value={system.constantTorque.torqueNm}
                    onChange={(e) => handleConstantChange("torqueNm", parseFloat(e.target.value) || 0)}
                    className="w-12 px-1 py-0.5 bg-white border border-stone-300 rounded text-right"
                  />
                  <span className="text-[10px] text-stone-400">N·m</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default SystemControls;

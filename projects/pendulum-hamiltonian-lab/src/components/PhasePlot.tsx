import React, { useRef, useEffect, useState } from "react";
import { formatFloat } from "../formatting/numbers";

interface PhaseData {
  q: number[]; // absolute angles in radians
  p: number[]; // canonical momenta
}

interface PhasePlotProps {
  history: PhaseData[];
  linkCount: number;
}

export const PhasePlot: React.FC<PhasePlotProps> = ({ history, linkCount }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  // Reset selected link index if out of bounds on link count updates
  useEffect(() => {
    if (selectedIdx >= linkCount) {
      setSelectedIdx(0);
    }
  }, [linkCount, selectedIdx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI screens
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = rect.height;

    // Clear Canvas
    ctx.fillStyle = "#fafaf9"; // off-white
    ctx.fillRect(0, 0, w, h);

    const padding = { top: 15, right: 15, bottom: 30, left: 50 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    // Render Grid outline
    ctx.strokeStyle = "#e7e5e4";
    ctx.lineWidth = 1;
    ctx.strokeRect(padding.left, padding.top, plotW, plotH);

    if (history.length === 0) {
      ctx.fillStyle = "#a8a29e";
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No data accumulated yet.", w / 2, h / 2);
      return;
    }

    // Helper to wrap angle to [-pi, pi]
    const wrapAngle = (rad: number) => {
      return ((rad + Math.PI) % (2 * Math.PI)) - Math.PI;
    };

    // Calculate vertical momentum range bounds dynamically
    const pHistory = history.map((d) => d.p[selectedIdx] ?? 0.0);
    let minP = Math.min(...pHistory);
    let maxP = Math.max(...pHistory);

    if (minP === maxP) {
      minP -= 1.0;
      maxP += 1.0;
    } else {
      const margin = (maxP - minP) * 0.1 || 0.5;
      minP -= margin;
      maxP += margin;
    }

    const pRange = maxP - minP;

    // Mapping coordinates
    // X axis represents absolute angle wrapped between [-pi, pi]
    const getX = (theta: number) => {
      const wrapped = wrapAngle(theta);
      return padding.left + ((wrapped + Math.PI) / (2 * Math.PI)) * plotW;
    };

    // Y axis represents conjugate momentum
    const getY = (momentum: number) => {
      return padding.top + (1 - (momentum - minP) / pRange) * plotH;
    };

    // Draw vertical angle grids: -pi, -pi/2, 0, pi/2, pi
    const angleLabels = [
      { text: "-π", val: -Math.PI },
      { text: "-π/2", val: -Math.PI / 2 },
      { text: "0", val: 0.0 },
      { text: "π/2", val: Math.PI / 2 },
      { text: "π", val: Math.PI },
    ];

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#78716c";
    ctx.font = "9px Fira Code, monospace";
    ctx.strokeStyle = "#e7e5e4";

    for (const label of angleLabels) {
      const xPos = padding.left + ((label.val + Math.PI) / (2 * Math.PI)) * plotW;

      // Draw grid vertical line
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(xPos, padding.top);
      ctx.lineTo(xPos, padding.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tick label
      ctx.fillText(label.text, xPos, padding.top + plotH + 5);
    }

    // Draw horizontal momentum grids
    const momentumGridsCount = 4;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#78716c";
    ctx.font = "9px Fira Code, monospace";
    ctx.setLineDash([3, 3]);

    for (let i = 0; i <= momentumGridsCount; i++) {
      const frac = i / momentumGridsCount;
      const pVal = minP + frac * pRange;
      const yPos = getY(pVal);

      // Grid line
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(padding.left + plotW, yPos);
      ctx.stroke();

      // Axis label
      ctx.fillText(formatFloat(pVal, 2), padding.left - 6, yPos);
    }
    ctx.setLineDash([]);

    // Plot historical trajectory curve (light purple)
    ctx.strokeStyle = "#c084fc"; // purple-400
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    let first = true;
    for (let i = 0; i < history.length; i++) {
      const d = history[i];
      const theta = d.q[selectedIdx] ?? 0.0;
      const p = d.p[selectedIdx] ?? 0.0;

      const xPos = getX(theta);
      const yPos = getY(p);

      if (first) {
        ctx.moveTo(xPos, yPos);
        first = false;
      } else {
        // Prevent drawing lines across the boundary wraps
        const prevTheta = history[i - 1].q[selectedIdx] ?? 0.0;
        if (Math.abs(wrapAngle(theta) - wrapAngle(prevTheta)) > 5.5) {
          ctx.moveTo(xPos, yPos);
        } else {
          ctx.lineTo(xPos, yPos);
        }
      }
    }
    ctx.stroke();

    // Mark current state index as a distinct larger dot
    const currentState = history[history.length - 1];
    const currQ = currentState.q[selectedIdx] ?? 0.0;
    const currP = currentState.p[selectedIdx] ?? 0.0;
    const currX = getX(currQ);
    const currY = getY(currP);

    ctx.fillStyle = "#7c3aed"; // violet-600
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(currX, currY, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }, [history, selectedIdx]);

  return (
    <div className="flex flex-col gap-3 w-full h-full min-h-[220px] bg-white border border-stone-200 rounded p-2">
      {/* Canvas */}
      <div className="flex-1 min-h-[160px]">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Selector controls */}
      <div className="flex items-center justify-between border-t border-stone-100 pt-2 px-3 text-xs">
        <label htmlFor="joint-select" className="font-semibold text-stone-500 uppercase tracking-wide text-[10px]">
          Phase-space joint:
        </label>
        <select
          id="joint-select"
          value={selectedIdx}
          onChange={(e) => setSelectedIdx(parseInt(e.target.value))}
          className="px-2 py-0.5 bg-white border border-stone-300 rounded font-medium text-stone-700"
        >
          {Array.from({ length: linkCount }).map((_, idx) => (
            <option key={idx} value={idx}>
              Joint {idx + 1} (q_{idx + 1} vs p_{idx + 1})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
export default PhasePlot;

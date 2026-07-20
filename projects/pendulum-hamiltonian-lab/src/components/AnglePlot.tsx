import React, { useRef, useEffect, useState } from "react";
import { formatFloat } from "../formatting/numbers";

interface AngleData {
  time: number;
  q: number[]; // absolute angles in radians
}

interface AnglePlotProps {
  history: AngleData[];
  linkCount: number;
}

export const AnglePlot: React.FC<AnglePlotProps> = ({ history, linkCount }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isWrapped, setIsWrapped] = useState<boolean>(true);
  const [useDegrees, setUseDegrees] = useState<boolean>(true);
  const [visibleLinks, setVisibleLinks] = useState<boolean[]>(
    new Array(4).fill(true)
  );

  // Helper to toggle link visibility
  const toggleVisibility = (idx: number) => {
    const next = [...visibleLinks];
    next[idx] = !next[idx];
    setVisibleLinks(next);
  };

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

    const times = history.map((d) => d.time);
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    const tRange = maxTime - minTime || 1;

    // Process angles based on wrap and units preference
    const processAngle = (radVal: number) => {
      let val = radVal;
      if (isWrapped) {
        // Wrap to [-pi, pi]
        val = ((radVal + Math.PI) % (2 * Math.PI)) - Math.PI;
      }
      if (useDegrees) {
        val = (val * 180) / Math.PI;
      }
      return val;
    };

    // Calculate vertical min/max boundary
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (const d of history) {
      for (let i = 0; i < linkCount; i++) {
        if (!visibleLinks[i]) continue;
        const val = processAngle(d.q[i]);
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
    }

    // Default bounds if limits empty/equal
    if (minVal === Infinity || minVal === maxVal) {
      if (isWrapped) {
        minVal = useDegrees ? -180 : -Math.PI;
        maxVal = useDegrees ? 180 : Math.PI;
      } else {
        minVal = useDegrees ? -90 : -Math.PI / 2;
        maxVal = useDegrees ? 90 : Math.PI / 2;
      }
    } else {
      const margin = (maxVal - minVal) * 0.1 || 1;
      minVal -= margin;
      maxVal += margin;
    }

    const valRange = maxVal - minVal;

    // Coordinate mapping functions
    const getX = (t: number) => {
      return padding.left + ((t - minTime) / tRange) * plotW;
    };

    const getY = (val: number) => {
      return padding.top + (1 - (val - minVal) / valRange) * plotH;
    };

    // Draw horizontal grid lines and labels
    const gridCount = 4;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#78716c";
    ctx.font = "9px Fira Code, monospace";
    ctx.strokeStyle = "#e7e5e4";
    ctx.setLineDash([3, 3]);

    for (let i = 0; i <= gridCount; i++) {
      const frac = i / gridCount;
      const angleVal = minVal + frac * valRange;
      const yPos = getY(angleVal);

      // Grid line
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(padding.left + plotW, yPos);
      ctx.stroke();

      // Axis label
      const suffix = useDegrees ? "°" : "";
      ctx.fillText(`${formatFloat(angleVal, 1)}${suffix}`, padding.left - 6, yPos);
    }
    ctx.setLineDash([]);

    // Draw time axis labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#78716c";
    ctx.font = "9px Fira Code, monospace";
    const timeGridCount = 5;
    for (let i = 0; i <= timeGridCount; i++) {
      const frac = i / timeGridCount;
      const timeVal = minTime + frac * tRange;
      const xPos = getX(timeVal);

      ctx.beginPath();
      ctx.moveTo(xPos, padding.top + plotH);
      ctx.lineTo(xPos, padding.top + plotH + 4);
      ctx.stroke();

      ctx.fillText(`${formatFloat(timeVal, 1)}s`, xPos, padding.top + plotH + 6);
    }

    // Plots curves for each active and visible link
    const colors = ["#06b6d4", "#ec4899", "#10b981", "#f59e0b"]; // cyan, pink, green, orange
    for (let linkIdx = 0; linkIdx < linkCount; linkIdx++) {
      if (!visibleLinks[linkIdx]) continue;

      ctx.strokeStyle = colors[linkIdx % colors.length];
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      let first = true;
      let prevY = 0;

      for (let stepIdx = 0; stepIdx < history.length; stepIdx++) {
        const d = history[stepIdx];
        const xPos = getX(d.time);
        const val = processAngle(d.q[linkIdx]);
        const yPos = getY(val);

        if (first) {
          ctx.moveTo(xPos, yPos);
          first = false;
        } else {
          // If wrapped, prevent vertical drawing lines during phase jumps
          if (isWrapped && Math.abs(val - processAngle(history[stepIdx - 1].q[linkIdx])) > (useDegrees ? 280 : 5.5)) {
            ctx.moveTo(xPos, yPos); // skip drawing jump line
          } else {
            ctx.lineTo(xPos, yPos);
          }
        }
        prevY = yPos;
      }
      ctx.stroke();
    }
  }, [history, linkCount, isWrapped, useDegrees, visibleLinks]);

  const colors = ["#06b6d4", "#ec4899", "#10b981", "#f59e0b"];

  return (
    <div className="flex flex-col gap-3 w-full h-full min-h-[220px] bg-white border border-stone-200 rounded p-2">
      {/* Chart Canvas */}
      <div className="flex-1 min-h-[160px]">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Control Checklist Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-3 pb-1 border-t border-stone-100 pt-2 text-xs">
        {/* Toggle options */}
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-stone-600">
            <input
              type="checkbox"
              checked={isWrapped}
              onChange={(e) => setIsWrapped(e.target.checked)}
              className="w-3.5 h-3.5"
            />
            Wrap [-π, π]
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-stone-600">
            <input
              type="checkbox"
              checked={useDegrees}
              onChange={(e) => setUseDegrees(e.target.checked)}
              className="w-3.5 h-3.5"
            />
            Degrees (°)
          </label>
        </div>

        {/* Link Visibility selection */}
        <div className="flex items-center gap-3">
          <span className="font-semibold text-stone-500 uppercase tracking-wide text-[10px]">
            Show:
          </span>
          {Array.from({ length: linkCount }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => toggleVisibility(idx)}
              className={`px-2 py-0.5 border text-[10px] rounded font-semibold transition-colors cursor-pointer`}
              style={{
                borderColor: visibleLinks[idx] ? colors[idx % colors.length] : "#e7e5e4",
                backgroundColor: visibleLinks[idx] ? `${colors[idx % colors.length]}10` : "transparent",
                color: visibleLinks[idx] ? colors[idx % colors.length] : "#78716c",
              }}
            >
              Bob {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default AnglePlot;

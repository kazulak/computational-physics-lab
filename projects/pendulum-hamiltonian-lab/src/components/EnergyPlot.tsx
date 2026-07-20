import React, { useRef, useEffect } from "react";
import { formatFloat } from "../formatting/numbers";

interface EnergyData {
  time: number;
  T: number;
  V: number;
  H: number;
}

interface EnergyPlotProps {
  history: EnergyData[];
}

export const EnergyPlot: React.FC<EnergyPlotProps> = ({ history }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const padding = { top: 20, right: 90, bottom: 30, left: 55 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    // Render Grid outline
    ctx.strokeStyle = "#e7e5e4";
    ctx.lineWidth = 1;
    ctx.strokeRect(padding.left, padding.top, plotW, plotH);

    // Draw horizontal zero line inside the grid
    ctx.strokeStyle = "#d6d3d1";
    ctx.setLineDash([2, 2]);

    if (history.length === 0) {
      ctx.fillStyle = "#a8a29e";
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No data accumulated yet.", w / 2, h / 2);
      return;
    }

    // Find min and max values to scale
    const times = history.map((d) => d.time);
    const minTime = times[0];
    const maxTime = times[times.length - 1];

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const d of history) {
      if (d.T < minVal) minVal = d.T;
      if (d.V < minVal) minVal = d.V;
      if (d.H < minVal) minVal = d.H;

      if (d.T > maxVal) maxVal = d.T;
      if (d.V > maxVal) maxVal = d.V;
      if (d.H > maxVal) maxVal = d.H;
    }

    // Fallbacks if energies are constant
    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    } else {
      // add a small 10% margin top and bottom
      const margin = (maxVal - minVal) * 0.1;
      minVal -= margin;
      maxVal += margin;
    }

    const tRange = maxTime - minTime || 1;
    const valRange = maxVal - minVal;

    // Maps physics time to canvas x coordinate
    const getX = (t: number) => {
      return padding.left + ((t - minTime) / tRange) * plotW;
    };

    // Maps physics energy to canvas y coordinate
    const getY = (val: number) => {
      return padding.top + (1 - (val - minVal) / valRange) * plotH;
    };

    // Draw grid horizontal helper lines
    const gridLinesCount = 4;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#78716c";
    ctx.font = "9px Fira Code, monospace";
    ctx.setLineDash([3, 3]);

    for (let i = 0; i <= gridLinesCount; i++) {
      const frac = i / gridLinesCount;
      const energyValue = minVal + frac * valRange;
      const yPos = getY(energyValue);

      // Grid line
      ctx.strokeStyle = "#e7e5e4";
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(padding.left + plotW, yPos);
      ctx.stroke();

      // Axis label
      ctx.fillText(formatFloat(energyValue, 3), padding.left - 6, yPos);
    }
    ctx.setLineDash([]);

    // Draw time axis labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "9px Fira Code, monospace";
    ctx.fillStyle = "#78716c";
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

    // Plots the three line curves: T (rose/red), V (cyan), H (gold/yellow)
    const drawLine = (
      points: { x: number; y: number }[],
      color: string,
      width: number
    ) => {
      if (points.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    };

    const tPoints = history.map((d) => ({ x: getX(d.time), y: getY(d.T) }));
    const vPoints = history.map((d) => ({ x: getX(d.time), y: getY(d.V) }));
    const hPoints = history.map((d) => ({ x: getX(d.time), y: getY(d.H) }));

    drawLine(tPoints, "#f43f5e", 1.5); // rose-500
    drawLine(vPoints, "#06b6d4", 1.5); // cyan-500
    drawLine(hPoints, "#fbbf24", 2.5); // amber-400

    // Legends on the right margins
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "bold 10px Inter, sans-serif";

    // Legend 1: Kinetic
    ctx.fillStyle = "#f43f5e";
    ctx.fillText("Kinetic (T)", padding.left + plotW + 10, padding.top + 15);

    // Legend 2: Potential
    ctx.fillStyle = "#06b6d4";
    ctx.fillText("Potential (V)", padding.left + plotW + 10, padding.top + 32);

    // Legend 3: Total
    ctx.fillStyle = "#d97706";
    ctx.fillText("Total (H)", padding.left + plotW + 10, padding.top + 49);
  }, [history]);

  return (
    <div className="w-full h-full min-h-[220px] bg-white border border-stone-200 rounded overflow-hidden p-2">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
export default EnergyPlot;

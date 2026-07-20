import React, { useRef, useEffect, useState } from "react";
import { getMassPositions, Point2D } from "../physics/geometry";

interface SimulationCanvasProps {
  q: number[];
  lengths: number[];
  masses: number[];
  trailHistory: { x: number; y: number }[];
  isPlaying: boolean;
  onAngleChange: (linkIndex: number, newAngleDeg: number) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  q,
  lengths,
  masses,
  trailHistory,
  isPlaying,
  onAngleChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Precompute scaling and positioning parameters based on logical canvas dimensions
  const getCanvasParams = (w: number, h: number) => {
    const cx = w / 2;
    const cy = h / 2.2; // slightly above center to allow hanging space

    // Scale mapping meters to pixels. Max length determines scale
    const totalLength = lengths.reduce((a, b) => a + b, 0);
    const maxDimension = Math.min(w, h);
    const scale = (maxDimension / 2.5) / Math.max(totalLength, 1.0); // scale factor

    return { cx, cy, scale };
  };

  // Convert physics coords to canvas pixels
  const physicsToCanvas = (pt: Point2D, cx: number, cy: number, scale: number) => {
    return {
      x: cx + pt.x * scale,
      y: cy - pt.y * scale, // note: physics y is negative downwards
    };
  };

  // Convert canvas pixels to physics coords
  const canvasToPhysics = (x: number, y: number, cx: number, cy: number, scale: number) => {
    return {
      x: (x - cx) / scale,
      y: -(y - cy) / scale,
    };
  };

  // Animation render
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

    const { cx, cy, scale } = getCanvasParams(w, h);

    // 1. Subtle vertical reference line
    ctx.strokeStyle = "#e7e5e4"; // light stone grey
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Draw motion trail (Tip trajectory)
    if (trailHistory.length > 1) {
      ctx.strokeStyle = "#22d3ee"; // bright cyan
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const pStart = physicsToCanvas(trailHistory[0], cx, cy, scale);
      ctx.moveTo(pStart.x, pStart.y);
      for (let i = 1; i < trailHistory.length; i++) {
        const p = physicsToCanvas(trailHistory[i], cx, cy, scale);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Compute Bob positions
    const positions = getMassPositions(q, lengths);
    const canvasPositions = positions.map((p) => physicsToCanvas(p, cx, cy, scale));

    // 3. Draw Links (Rods)
    ctx.strokeStyle = "#44403c"; // dark warm grey
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(canvasPositions[0].x, canvasPositions[0].y);
    for (let i = 1; i < canvasPositions.length; i++) {
      ctx.lineTo(canvasPositions[i].x, canvasPositions[i].y);
    }
    ctx.stroke();

    // 4. Draw Pivot Bob
    ctx.fillStyle = "#292524";
    ctx.beginPath();
    ctx.arc(canvasPositions[0].x, canvasPositions[0].y, 5, 0, 2 * Math.PI);
    ctx.fill();

    // 5. Draw Bobs (weights)
    const colors = ["#06b6d4", "#ec4899", "#10b981", "#f59e0b"]; // cyan, pink, green, amber
    for (let i = 1; i < canvasPositions.length; i++) {
      const p = canvasPositions[i];
      const mass = masses[i - 1] ?? 1.0;
      const radius = Math.min(Math.max(6 + mass * 3, 8), 24); // bound size

      // Bob fill
      ctx.fillStyle = colors[(i - 1) % colors.length];
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Border outline
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
      ctx.stroke();

      // Text label beside the bob (m1, m2, etc.)
      ctx.fillStyle = "#57534e";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`m${i}`, p.x + radius + 5, p.y);
    }
  }, [q, lengths, masses, trailHistory]);

  // Handle Drag interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying) return; // dragging disabled while running

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { cx, cy, scale } = getCanvasParams(rect.width, rect.height);
    const positions = getMassPositions(q, lengths);

    // Find the closest bob to the mouse pointer within grabbing range
    let closestIndex = -1;
    let minDistance = 18; // grabbing threshold in pixels

    for (let i = 1; i < positions.length; i++) {
      const pCanvas = physicsToCanvas(positions[i], cx, cy, scale);
      const dx = mouseX - pCanvas.x;
      const dy = mouseY - pCanvas.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i - 1; // 0-indexed link index
      }
    }

    if (closestIndex !== -1) {
      setDraggedIndex(closestIndex);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedIndex === null || isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { cx, cy, scale } = getCanvasParams(rect.width, rect.height);
    const positions = getMassPositions(q, lengths);

    // Parent joint coordinates
    const parentPos = positions[draggedIndex]; // index is the same because positions starts with pivot at [0]

    // Cursor position in physics coordinates
    const mousePhysics = canvasToPhysics(mouseX, mouseY, cx, cy, scale);

    // Vector from parent joint to cursor
    const dx = mousePhysics.x - parentPos.x;
    const dy = mousePhysics.y - parentPos.y;

    // Angle theta relative to the downward vertical
    // tan(theta) = dx / -dy. Note: atan2(dx, -dy) yields absolute angle
    let newAngleRad = Math.atan2(dx, -dy);
    let newAngleDeg = (newAngleRad * 180) / Math.PI;

    // Wrap to [-180, 180]
    if (newAngleDeg > 180) newAngleDeg -= 360;
    if (newAngleDeg < -180) newAngleDeg += 360;

    onAngleChange(draggedIndex, newAngleDeg);
  };

  const handleMouseUpOrLeave = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="relative w-full h-full min-h-[300px] border border-stone-200 rounded overflow-hidden select-none bg-stone-50">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className="w-full h-full block cursor-crosshair"
      />
      {!isPlaying && (
        <div className="absolute top-2 left-2 text-[10px] text-stone-500 font-medium bg-white/80 border border-stone-200 px-2 py-0.5 rounded shadow-sm pointer-events-none">
          Click and drag bobs to modify initial angles
        </div>
      )}
    </div>
  );
};
export default SimulationCanvas;

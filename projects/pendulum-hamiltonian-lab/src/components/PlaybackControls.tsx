import React, { useEffect } from "react";

interface PlaybackControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onStep,
  onReset,
  playbackSpeed,
  onChangeSpeed,
}) => {
  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bypassed if user is typing in inputs or textareas
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          onTogglePlay();
          break;
        case "r":
          e.preventDefault();
          onReset();
          break;
        case ".":
          e.preventDefault();
          onStep();
          break;
        case "1":
          e.preventDefault();
          onChangeSpeed(1.0);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onTogglePlay, onStep, onReset, onChangeSpeed]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-stone-100 border border-stone-200 rounded">
      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded hover:bg-stone-50 active:bg-stone-100 transition-colors cursor-pointer"
          title="Shortcut: Space"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          onClick={onStep}
          disabled={isPlaying}
          className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded hover:bg-stone-50 active:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Shortcut: ."
        >
          Step
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded hover:bg-stone-50 active:bg-stone-100 transition-colors cursor-pointer"
          title="Shortcut: R"
        >
          Reset
        </button>
      </div>

      {/* Speed Controls */}
      <div className="flex items-center gap-2">
        <label htmlFor="speed-select" className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Speed:
        </label>
        <select
          id="speed-select"
          value={playbackSpeed}
          onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
          className="px-2 py-1 text-sm bg-white border border-stone-300 rounded text-stone-800 focus:outline-none focus:border-stone-500 cursor-pointer font-mono-num"
        >
          <option value="0.25">0.25×</option>
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="2">2×</option>
          <option value="4">4×</option>
        </select>
      </div>
    </div>
  );
};
export default PlaybackControls;

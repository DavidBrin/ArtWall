"use client";

import type { WallPresetId } from "@/lib/types/wall";

type ToolMode = "brush" | "eraser" | "text";

type ColorOption = {
  value: string;
  label: string;
};

type WallOption = {
  id: WallPresetId;
  label: string;
};

type InstallSheetProps = {
  installAvailable: boolean;
  isIos: boolean;
  isStandalone: boolean;
  statusMessage: string | null;
  toolMode: ToolMode;
  colorOptions: ColorOption[];
  activeColor: string;
  wallOptions: WallOption[];
  activeWall: WallPresetId;
  brushSize: number;
  eraserSize: number;
  textSize: number;
  onInstall: () => Promise<void> | void;
  onSaveImage: () => void;
  onToolModeChange: (mode: ToolMode) => void;
  onColorChange: (color: string) => void;
  onWallChange: (wall: WallPresetId) => void;
  onBrushSizeChange: (size: number) => void;
  onEraserSizeChange: (size: number) => void;
  onTextSizeChange: (size: number) => void;
};

export function InstallSheet({
  installAvailable,
  isIos,
  isStandalone,
  statusMessage,
  toolMode,
  colorOptions,
  activeColor,
  wallOptions,
  activeWall,
  brushSize,
  eraserSize,
  textSize,
  onInstall,
  onSaveImage,
  onToolModeChange,
  onColorChange,
  onWallChange,
  onBrushSizeChange,
  onEraserSizeChange,
  onTextSizeChange,
}: InstallSheetProps) {
  return (
    <div className="grid gap-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[rgba(31,25,20,0.52)]">Menu</p>
        <p className="mt-2 text-sm leading-6 text-[rgba(31,25,20,0.75)]">
          Each wall keeps its own shared artwork. Pick a wall, choose a tool, and save the current state.
        </p>
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(31,25,20,0.58)]">Explore walls</p>
        <label className="sr-only" htmlFor="wall-preset-select">
          Explore walls
        </label>
        <select
          className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--foreground)]"
          id="wall-preset-select"
          onChange={(event) => {
            onWallChange(event.currentTarget.value as WallPresetId);
          }}
          value={activeWall}
        >
          {wallOptions.map((wall) => (
            <option key={wall.id} value={wall.id}>
              {wall.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(31,25,20,0.58)]">Drawing tools</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            aria-pressed={toolMode === "brush"}
            className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-left text-sm font-medium text-[var(--foreground)] transition hover:bg-white aria-pressed:bg-[rgba(37,88,110,0.16)]"
            onClick={() => onToolModeChange("brush")}
            type="button"
          >
            Brush
          </button>
          <button
            aria-pressed={toolMode === "eraser"}
            className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-left text-sm font-medium text-[var(--foreground)] transition hover:bg-white aria-pressed:bg-[rgba(37,88,110,0.16)]"
            onClick={() => onToolModeChange("eraser")}
            type="button"
          >
            Eraser
          </button>
          <button
            aria-pressed={toolMode === "text"}
            className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-left text-sm font-medium text-[var(--foreground)] transition hover:bg-white aria-pressed:bg-[rgba(37,88,110,0.16)]"
            onClick={() => onToolModeChange("text")}
            type="button"
          >
            Text
          </button>
        </div>
        {toolMode === "text" ? (
          <p className="text-xs leading-5 text-[rgba(31,25,20,0.58)]">
            Tap the wall to place a text box, then type and press Enter.
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(31,25,20,0.58)]">Brush color</p>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map((color) => (
            <button
              aria-label={color.label}
              aria-pressed={activeColor === color.value}
              className="h-8 w-8 rounded-full border-2 border-white shadow aria-pressed:scale-110 aria-pressed:border-[var(--accent-deep)]"
              key={color.value}
              onClick={() => onColorChange(color.value)}
              style={{ backgroundColor: color.value }}
              type="button"
            />
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(31,25,20,0.58)]">Brush size</p>
          <span className="text-xs text-[rgba(31,25,20,0.58)]">{brushSize}px</span>
        </div>
        <input
          className="accent-[var(--accent-deep)]"
          max={24}
          min={1}
          onChange={(event) => onBrushSizeChange(Number(event.currentTarget.value))}
          type="range"
          value={brushSize}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(31,25,20,0.58)]">Eraser size</p>
          <span className="text-xs text-[rgba(31,25,20,0.58)]">{eraserSize}px</span>
        </div>
        <input
          className="accent-[var(--accent-deep)]"
          max={24}
          min={4}
          onChange={(event) => onEraserSizeChange(Number(event.currentTarget.value))}
          type="range"
          value={eraserSize}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(31,25,20,0.58)]">Text size</p>
          <span className="text-xs text-[rgba(31,25,20,0.58)]">{textSize}px</span>
        </div>
        <input
          className="accent-[var(--accent-deep)]"
          max={72}
          min={16}
          onChange={(event) => onTextSizeChange(Number(event.currentTarget.value))}
          step={2}
          type="range"
          value={textSize}
        />
      </div>

      <button
        className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-left text-sm font-medium text-[var(--foreground)] transition hover:bg-white"
        onClick={onSaveImage}
        type="button"
      >
        Save current wall as PNG
      </button>

      {installAvailable ? (
        <button
          className="rounded-2xl border border-[var(--line)] bg-[rgba(199,109,58,0.12)] px-4 py-3 text-left text-sm font-medium text-[var(--foreground)] transition hover:bg-[rgba(199,109,58,0.18)]"
          onClick={() => {
            void onInstall();
          }}
          type="button"
        >
          Install on this device
        </button>
      ) : null}

      {!installAvailable && !isStandalone && isIos ? (
        <p className="rounded-2xl border border-[var(--line)] bg-white/60 px-4 py-3 text-sm leading-6 text-[rgba(31,25,20,0.74)]">
          On iPhone or iPad, open Safari&apos;s Share menu and choose <strong>Add to Home Screen</strong>.
        </p>
      ) : null}

      {!installAvailable && !isStandalone && !isIos ? (
        <p className="rounded-2xl border border-[var(--line)] bg-white/60 px-4 py-3 text-sm leading-6 text-[rgba(31,25,20,0.74)]">
          If your browser does not offer install yet, you can still keep the wall and save the current artwork as a PNG.
        </p>
      ) : null}

      {isStandalone ? (
        <p className="rounded-2xl border border-[var(--line)] bg-white/60 px-4 py-3 text-sm leading-6 text-[rgba(31,25,20,0.74)]">
          This device is already running the installed version of Art Wall.
        </p>
      ) : null}

      {statusMessage ? <p className="text-sm leading-6 text-[rgba(31,25,20,0.66)]">{statusMessage}</p> : null}
    </div>
  );
}

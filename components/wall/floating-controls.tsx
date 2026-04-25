"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import type { WallPresetId } from "@/lib/types/wall";
import { InstallSheet } from "./install-sheet";

type ToolMode = "brush" | "eraser" | "text";

type ColorOption = {
  value: string;
  label: string;
};

type WallOption = {
  id: WallPresetId;
  label: string;
};

type FloatingControlsProps = {
  isMenuOpen: boolean;
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
  onToggleMenu: () => void;
  onOpenAbout: () => void;
  onInstall: () => Promise<void> | void;
  onSaveImage: () => void;
  onToolModeChange: (mode: ToolMode) => void;
  onColorChange: (color: string) => void;
  onWallChange: (wall: WallPresetId) => void;
  onBrushSizeChange: (size: number) => void;
  onEraserSizeChange: (size: number) => void;
  onTextSizeChange: (size: number) => void;
};

export function FloatingControls({
  isMenuOpen,
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
  onToggleMenu,
  onOpenAbout,
  onInstall,
  onSaveImage,
  onToolModeChange,
  onColorChange,
  onWallChange,
  onBrushSizeChange,
  onEraserSizeChange,
  onTextSizeChange,
}: FloatingControlsProps) {
  const controlsRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useEffectEvent((event: PointerEvent) => {
    if (!isMenuOpen || !controlsRef.current) {
      return;
    }

    if (!controlsRef.current.contains(event.target as Node)) {
      onToggleMenu();
    }
  });

  useEffect(() => {
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <div className="absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30 flex justify-center px-4">
      <div className="flex flex-col items-center gap-4" ref={controlsRef}>
        {isMenuOpen ? (
          <div className="w-[min(92vw,24rem)] animate-[drift-in_220ms_ease-out] rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[0_24px_70px_var(--shadow)] backdrop-blur-xl">
            <InstallSheet
              activeColor={activeColor}
              activeWall={activeWall}
              brushSize={brushSize}
              colorOptions={colorOptions}
              eraserSize={eraserSize}
              installAvailable={installAvailable}
              isIos={isIos}
              isStandalone={isStandalone}
              onBrushSizeChange={onBrushSizeChange}
              onColorChange={onColorChange}
              onEraserSizeChange={onEraserSizeChange}
              onInstall={onInstall}
              onSaveImage={onSaveImage}
              onTextSizeChange={onTextSizeChange}
              onToolModeChange={onToolModeChange}
              onWallChange={onWallChange}
              statusMessage={statusMessage}
              textSize={textSize}
              toolMode={toolMode}
              wallOptions={wallOptions}
            />
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <button
            aria-expanded={isMenuOpen}
            aria-label="Toggle menu"
            className="rounded-full border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] shadow-[0_12px_30px_var(--shadow)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
            onClick={onToggleMenu}
            type="button"
          >
            Menu
          </button>
          <button
            aria-label="Open about dialog"
            className="rounded-full border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] shadow-[0_12px_30px_var(--shadow)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
            onClick={onOpenAbout}
            type="button"
          >
            About
          </button>
        </div>
      </div>
    </div>
  );
}

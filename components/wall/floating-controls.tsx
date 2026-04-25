"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { InstallSheet } from "./install-sheet";

type FloatingControlsProps = {
  isMenuOpen: boolean;
  installAvailable: boolean;
  isIos: boolean;
  isStandalone: boolean;
  statusMessage: string | null;
  onToggleMenu: () => void;
  onOpenAbout: () => void;
  onInstall: () => Promise<void> | void;
  onSaveImage: () => void;
};

export function FloatingControls({
  isMenuOpen,
  installAvailable,
  isIos,
  isStandalone,
  statusMessage,
  onToggleMenu,
  onOpenAbout,
  onInstall,
  onSaveImage,
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
    <div className="absolute inset-x-0 bottom-5 z-30 flex justify-center px-4">
      <div className="flex flex-col items-center gap-4" ref={controlsRef}>
        {isMenuOpen ? (
          <div
            className="w-[min(92vw,24rem)] animate-[drift-in_220ms_ease-out] rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[0_24px_70px_var(--shadow)] backdrop-blur-xl"
          >
            <InstallSheet
              installAvailable={installAvailable}
              isIos={isIos}
              isStandalone={isStandalone}
              onInstall={onInstall}
              onSaveImage={onSaveImage}
              statusMessage={statusMessage}
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

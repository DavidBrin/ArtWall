"use client";

import { useEffect, useRef } from "react";

type AboutDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab" && closeButtonRef.current) {
        event.preventDefault();
        closeButtonRef.current.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(30,20,12,0.28)] px-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel-strong)] p-6 text-[var(--foreground)] shadow-[0_30px_80px_var(--shadow)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[rgba(31,25,20,0.52)]">
              About
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Digital Art Wall</h2>
          </div>
          <button
            aria-label="Close about dialog"
            className="rounded-full border border-[var(--line)] bg-white/60 px-3 py-2 text-sm transition hover:bg-white"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            Close
          </button>
        </div>
        <p className="mt-5 text-sm leading-7 text-[rgba(31,25,20,0.76)]">
          This site is a shared public wall. Every visitor sees the same canvas, and new strokes are
          meant to appear for everyone in near real time.
        </p>
        <p className="mt-4 text-sm leading-7 text-[rgba(31,25,20,0.76)]">
          There are no accounts in v1. The goal is simple: open the page, draw, and watch the wall
          evolve together.
        </p>
      </div>
    </div>
  );
}

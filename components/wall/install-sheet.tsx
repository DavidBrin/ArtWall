"use client";

type InstallSheetProps = {
  installAvailable: boolean;
  isIos: boolean;
  isStandalone: boolean;
  statusMessage: string | null;
  onInstall: () => Promise<void> | void;
  onSaveImage: () => void;
};

export function InstallSheet({
  installAvailable,
  isIos,
  isStandalone,
  statusMessage,
  onInstall,
  onSaveImage,
}: InstallSheetProps) {
  return (
    <div className="grid gap-3">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[rgba(31,25,20,0.52)]">
          Menu
        </p>
        <p className="mt-2 text-sm leading-6 text-[rgba(31,25,20,0.75)]">
          The wall is public. Draw directly on the canvas, save the current state, or install it as
          a simple homescreen app.
        </p>
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
          On iPhone or iPad, open Safari’s Share menu and choose <strong>Add to Home Screen</strong>.
        </p>
      ) : null}

      {!installAvailable && !isStandalone && !isIos ? (
        <p className="rounded-2xl border border-[var(--line)] bg-white/60 px-4 py-3 text-sm leading-6 text-[rgba(31,25,20,0.74)]">
          If your browser does not offer install yet, you can still keep the wall and save the
          current artwork as a PNG.
        </p>
      ) : null}

      {isStandalone ? (
        <p className="rounded-2xl border border-[var(--line)] bg-white/60 px-4 py-3 text-sm leading-6 text-[rgba(31,25,20,0.74)]">
          This device is already running the installed version of Art Wall.
        </p>
      ) : null}

      {statusMessage ? (
        <p className="text-sm leading-6 text-[rgba(31,25,20,0.66)]">{statusMessage}</p>
      ) : null}
    </div>
  );
}

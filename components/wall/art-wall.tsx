"use client";

import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { serializeStrokeRow } from "@/lib/api/wall";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { CreateStrokeInput, Stroke, WallResponse } from "@/lib/types/wall";
import { AboutDialog } from "./about-dialog";
import { CanvasSurface, type CanvasSurfaceHandle } from "./canvas-surface";
import { FloatingControls } from "./floating-controls";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const BRUSH_WIDTH = 4;
const BRUSH_COLORS = ["#1f1b18", "#7a3b2a", "#25586e", "#89612e", "#3f6b4c"];

type ClientSession = {
  id: string;
  color: string;
  isIos: boolean;
};

function createClientId() {
  if (typeof window === "undefined") {
    return "server-preview";
  }

  const existing = window.localStorage.getItem("artwall-client-id");
  if (existing) {
    return existing;
  }

  const created = `anon-${window.crypto.randomUUID()}`;
  window.localStorage.setItem("artwall-client-id", created);
  return created;
}

function pickBrushColor(clientId: string) {
  let hash = 0;

  for (const char of clientId) {
    hash = (hash * 31 + char.charCodeAt(0)) % BRUSH_COLORS.length;
  }

  return BRUSH_COLORS[Math.abs(hash) % BRUSH_COLORS.length];
}

function isIosDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function getClientSession(): ClientSession {
  if (typeof window === "undefined") {
    return {
      id: "anon-preview",
      color: BRUSH_COLORS[0],
      isIos: false,
    };
  }

  const id = createClientId();
  return {
    id,
    color: pickBrushColor(id),
    isIos: isIosDevice(),
  };
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function ArtWall() {
  const canvasRef = useRef<CanvasSurfaceHandle>(null);
  const pendingStrokeSignaturesRef = useRef(new Set<string>());
  const [clientSession] = useState(getClientSession);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(() =>
    typeof window === "undefined" ? false : isStandaloneDisplayMode(),
  );

  const loadWall = useEffectEvent(async () => {
    try {
      const response = await fetch("/api/wall", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Unable to fetch wall: ${response.status}`);
      }

      const data = (await response.json()) as WallResponse;
      startTransition(() => {
        setStrokes(data.strokes);
      });
      setStatusMessage(null);
    } catch (error) {
      console.error("Failed to load wall", error);
      setStatusMessage("Live wall unavailable until Supabase is configured.");
    } finally {
      setIsLoading(false);
    }
  });

  const registerServiceWorker = useEffectEvent(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (error) {
      console.error("Failed to register service worker", error);
    }
  });

  useEffect(() => {
    void registerServiceWorker();

    const frame = window.requestAnimationFrame(() => {
      void loadWall();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
      setStatusMessage("Art Wall installed on this device.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const hasSupabase =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (!hasSupabase) {
      return;
    }

    let unsubscribe = () => undefined;

    try {
      const supabase = getBrowserSupabase();
      const channel = supabase
        .channel("digital-art-wall")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "strokes",
          },
          (payload: RealtimePostgresInsertPayload<Record<string, unknown>>) => {
            const incoming = serializeStrokeRow({
              id: String(payload.new.id),
              points: payload.new.points,
              color: String(payload.new.color),
              width: Number(payload.new.width),
              created_at: String(payload.new.created_at),
              client_id: String(payload.new.client_id),
            });

            const incomingSignature = JSON.stringify({
              points: incoming.points,
              color: incoming.color,
              width: incoming.width,
              clientId: incoming.clientId,
            });

            if (
              incoming.clientId === clientSession.id &&
              pendingStrokeSignaturesRef.current.has(incomingSignature)
            ) {
              pendingStrokeSignaturesRef.current.delete(incomingSignature);
              return;
            }

            startTransition(() => {
              setStrokes((current) =>
                current.some((stroke) => stroke.id === incoming.id) ? current : [...current, incoming],
              );
            });
          },
        )
        .subscribe();

      unsubscribe = () => {
        void supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error("Failed to start realtime subscription", error);
    }

    return () => {
      unsubscribe();
    };
  }, [clientSession.id]);

  async function handleStrokeCommit(input: Omit<CreateStrokeInput, "clientId" | "color" | "width">) {
    const optimisticId = `local-${crypto.randomUUID()}`;
    const strokeSignature = JSON.stringify({
      points: input.points,
      color: clientSession.color,
      width: BRUSH_WIDTH,
      clientId: clientSession.id,
    });
    pendingStrokeSignaturesRef.current.add(strokeSignature);
    const optimisticStroke: Stroke = {
      id: optimisticId,
      points: input.points,
      color: clientSession.color,
      width: BRUSH_WIDTH,
      createdAt: new Date().toISOString(),
      clientId: clientSession.id,
    };

    startTransition(() => {
      setStrokes((current) => [...current, optimisticStroke]);
    });

    try {
      const response = await fetch("/api/wall/strokes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          points: input.points,
          color: clientSession.color,
          width: BRUSH_WIDTH,
          clientId: clientSession.id,
        } satisfies CreateStrokeInput),
      });

      if (!response.ok) {
        throw new Error(`Unable to save stroke: ${response.status}`);
      }

      const data = (await response.json()) as { stroke: Stroke };
      pendingStrokeSignaturesRef.current.delete(strokeSignature);
      startTransition(() => {
        setStrokes((current) =>
          current.map((stroke) => (stroke.id === optimisticId ? data.stroke : stroke)),
        );
      });
      setStatusMessage(null);
    } catch (error) {
      console.error("Failed to save stroke", error);
      pendingStrokeSignaturesRef.current.delete(strokeSignature);
      startTransition(() => {
        setStrokes((current) => current.filter((stroke) => stroke.id !== optimisticId));
      });
      setStatusMessage("Stroke not saved. Check the connection and try again.");
    }
  }

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const result = await installPrompt.userChoice;

    if (result.outcome === "accepted") {
      setStatusMessage("Art Wall added to your device.");
    }

    setInstallPrompt(null);
  }

  function handleSave() {
    canvasRef.current?.savePng(`digital-art-wall-${new Date().toISOString().slice(0, 10)}.png`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(239,182,113,0.42),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(37,88,110,0.16),_transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,_rgba(255,255,255,0.58),_transparent_42%,rgba(72,42,20,0.05)_100%)]" />

      <CanvasSurface
        ref={canvasRef}
        color={clientSession.color}
        strokes={strokes}
        width={BRUSH_WIDTH}
        onCommit={handleStrokeCommit}
      />

      <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-center">
        {isLoading ? (
          <div className="rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-[rgba(31,25,20,0.62)] shadow-[0_14px_38px_var(--shadow)] backdrop-blur">
            Loading wall
          </div>
        ) : null}
        {!isLoading && statusMessage ? (
          <div className="rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2 text-sm text-[rgba(31,25,20,0.74)] shadow-[0_14px_38px_var(--shadow)] backdrop-blur">
            {statusMessage}
          </div>
        ) : null}
      </div>

      <FloatingControls
        isIos={clientSession.isIos}
        isMenuOpen={menuOpen}
        isStandalone={isStandalone}
        onInstall={handleInstall}
        onOpenAbout={() => {
          setMenuOpen(false);
          setAboutOpen(true);
        }}
        onSaveImage={handleSave}
        onToggleMenu={() => setMenuOpen((current) => !current)}
        installAvailable={Boolean(installPrompt)}
        statusMessage={statusMessage}
      />

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}

"use client";

import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type {
  CreateStrokeInput,
  CreateTextInput,
  Stroke,
  WallItem,
  WallPresetId,
  WallResponse,
  WallText,
} from "@/lib/types/wall";
import { AboutDialog } from "./about-dialog";
import { CanvasSurface, type CanvasSurfaceHandle } from "./canvas-surface";
import { FloatingControls } from "./floating-controls";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type ToolMode = "brush" | "eraser" | "text";

type WallPreset = {
  id: WallPresetId;
  label: string;
  imageUrl: string;
  eraserColor: string;
};

type ClientSession = {
  id: string;
  isIos: boolean;
};

const DEFAULT_BRUSH_WIDTH = 4;
const DEFAULT_ERASER_WIDTH = 18;
const DEFAULT_TEXT_SIZE = 34;
const COLOR_OPTIONS = [
  { value: "#1f1b18", label: "Charcoal" },
  { value: "#7a3b2a", label: "Clay" },
  { value: "#25586e", label: "Ocean" },
  { value: "#89612e", label: "Ochre" },
  { value: "#3f6b4c", label: "Moss" },
  { value: "#6c2b5c", label: "Mulberry" },
  { value: "#c55036", label: "Terracotta" },
  { value: "#d4a017", label: "Amber" },
  { value: "#4b60b8", label: "Indigo" },
  { value: "#f2ecdf", label: "Chalk" },
] as const;

const WALL_PRESETS: WallPreset[] = [
  {
    id: "street",
    label: "Landing / Street",
    imageUrl: "/walls/solid-concrete-wall.jpg",
    eraserColor: "#d1d0cc",
  },
  {
    id: "ideas",
    label: "Ideas",
    imageUrl: "/walls/ideas-wall.svg",
    eraserColor: "#f4e9cd",
  },
  {
    id: "chalkboard",
    label: "Chalkboard",
    imageUrl: "/walls/chalkboard-wall.jpg",
    eraserColor: "#224236",
  },
];

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
      isIos: false,
    };
  }

  return {
    id: createClientId(),
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

function insertWallItem(current: WallItem[], incoming: WallItem) {
  if (current.some((item) => item.id === incoming.id)) {
    return current;
  }

  return [...current, incoming].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export function ArtWall() {
  const canvasRef = useRef<CanvasSurfaceHandle>(null);
  const pendingStrokeSignaturesRef = useRef(new Set<string>());
  const pendingTextSignaturesRef = useRef(new Set<string>());
  const loadRequestRef = useRef(0);
  const [clientSession] = useState(getClientSession);
  const [items, setItems] = useState<WallItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(() =>
    typeof window === "undefined" ? false : isStandaloneDisplayMode(),
  );
  const [toolMode, setToolMode] = useState<ToolMode>("brush");
  const [activeColor, setActiveColor] = useState<string>(COLOR_OPTIONS[0].value);
  const [activeWall, setActiveWall] = useState<WallPresetId>("street");
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_WIDTH);
  const [eraserSize, setEraserSize] = useState(DEFAULT_ERASER_WIDTH);
  const [textSize, setTextSize] = useState(DEFAULT_TEXT_SIZE);

  const activeWallPreset = useMemo(
    () => WALL_PRESETS.find((preset) => preset.id === activeWall) ?? WALL_PRESETS[0],
    [activeWall],
  );

  const drawColor = toolMode === "eraser" ? activeWallPreset.eraserColor : activeColor;
  const drawWidth = toolMode === "eraser" ? eraserSize : brushSize;

  const loadWall = useEffectEvent(async (wallId: WallPresetId, requestId: number, silent = false) => {
    try {
      const response = await fetch(`/api/wall?wallId=${wallId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Unable to fetch wall: ${response.status}`);
      }

      const data = (await response.json()) as WallResponse;

      if (requestId !== loadRequestRef.current) {
        return;
      }

      startTransition(() => {
        setItems(data.items);
      });
      setStatusMessage(null);
    } catch (error) {
      console.error("Failed to load wall", error);

      if (requestId !== loadRequestRef.current) {
        return;
      }

      if (!silent) {
        setStatusMessage("Live wall unavailable until the database is configured.");
      }
    } finally {
      if (!silent && requestId === loadRequestRef.current) {
        setIsLoading(false);
      }
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
  }, []);

  useEffect(() => {
    loadRequestRef.current += 1;
    const requestId = loadRequestRef.current;

    const frame = window.requestAnimationFrame(() => {
      void loadWall(activeWall, requestId);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activeWall]);

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
    const poll = window.setInterval(() => {
      void loadWall(activeWall, loadRequestRef.current, true);
    }, 2500);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadWall(activeWall, loadRequestRef.current, true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeWall]);

  async function handleStrokeCommit(input: Omit<CreateStrokeInput, "clientId" | "color" | "width" | "wallId">) {
    const optimisticId = `local-stroke-${crypto.randomUUID()}`;
    const strokeSignature = JSON.stringify({
      wallId: activeWall,
      points: input.points,
      color: drawColor,
      width: drawWidth,
      clientId: clientSession.id,
    });
    pendingStrokeSignaturesRef.current.add(strokeSignature);

    const optimisticStroke: Stroke = {
      kind: "stroke",
      id: optimisticId,
      wallId: activeWall,
      points: input.points,
      color: drawColor,
      width: drawWidth,
      createdAt: new Date().toISOString(),
      clientId: clientSession.id,
    };

    startTransition(() => {
      setItems((current) => insertWallItem(current, optimisticStroke));
    });

    try {
      const response = await fetch("/api/wall/strokes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallId: activeWall,
          points: input.points,
          color: drawColor,
          width: drawWidth,
          clientId: clientSession.id,
        } satisfies CreateStrokeInput),
      });

      if (!response.ok) {
        throw new Error(`Unable to save stroke: ${response.status}`);
      }

      const data = (await response.json()) as { stroke: Stroke };
      pendingStrokeSignaturesRef.current.delete(strokeSignature);
      startTransition(() => {
        setItems((current) =>
          current.map((item) => (item.id === optimisticId ? data.stroke : item)),
        );
      });
      setStatusMessage(null);
    } catch (error) {
      console.error("Failed to save stroke", error);
      pendingStrokeSignaturesRef.current.delete(strokeSignature);
      startTransition(() => {
        setItems((current) => current.filter((item) => item.id !== optimisticId));
      });
      setStatusMessage("Stroke not saved. Check the connection and try again.");
    }
  }

  async function handleTextCommit(input: Omit<CreateTextInput, "clientId" | "color" | "wallId">) {
    const optimisticId = `local-text-${crypto.randomUUID()}`;
    const textSignature = JSON.stringify({
      wallId: activeWall,
      text: input.text,
      position: input.position,
      color: activeColor,
      fontSize: input.fontSize,
      clientId: clientSession.id,
    });
    pendingTextSignaturesRef.current.add(textSignature);

    const optimisticText: WallText = {
      kind: "text",
      id: optimisticId,
      wallId: activeWall,
      text: input.text,
      position: input.position,
      color: activeColor,
      fontSize: input.fontSize,
      createdAt: new Date().toISOString(),
      clientId: clientSession.id,
    };

    startTransition(() => {
      setItems((current) => insertWallItem(current, optimisticText));
    });

    try {
      const response = await fetch("/api/wall/texts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallId: activeWall,
          text: input.text,
          position: input.position,
          color: activeColor,
          fontSize: input.fontSize,
          clientId: clientSession.id,
        } satisfies CreateTextInput),
      });

      if (!response.ok) {
        throw new Error(`Unable to save text: ${response.status}`);
      }

      const data = (await response.json()) as { text: WallText };
      pendingTextSignaturesRef.current.delete(textSignature);
      startTransition(() => {
        setItems((current) =>
          current.map((item) => (item.id === optimisticId ? data.text : item)),
        );
      });
      setStatusMessage(null);
    } catch (error) {
      console.error("Failed to save text", error);
      pendingTextSignaturesRef.current.delete(textSignature);
      startTransition(() => {
        setItems((current) => current.filter((item) => item.id !== optimisticId));
      });
      setStatusMessage("Text not saved. Check the connection and try again.");
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
    canvasRef.current?.savePng(`digital-art-wall-${activeWall}-${new Date().toISOString().slice(0, 10)}.png`);
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[var(--background)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(239,182,113,0.42),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(37,88,110,0.16),_transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,_rgba(255,255,255,0.58),_transparent_42%,rgba(72,42,20,0.05)_100%)]" />

      <CanvasSurface
        ref={canvasRef}
        color={drawColor}
        items={items}
        textFontSize={textSize}
        toolMode={toolMode}
        wallImageUrl={activeWallPreset.imageUrl}
        width={drawWidth}
        onCommitStroke={handleStrokeCommit}
        onCommitText={handleTextCommit}
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
        activeColor={activeColor}
        activeWall={activeWall}
        brushSize={brushSize}
        colorOptions={[...COLOR_OPTIONS]}
        eraserSize={eraserSize}
        installAvailable={Boolean(installPrompt)}
        isIos={clientSession.isIos}
        isMenuOpen={menuOpen}
        isStandalone={isStandalone}
        onBrushSizeChange={setBrushSize}
        onColorChange={(color) => {
          if (toolMode !== "text") {
            setToolMode("brush");
          }
          setActiveColor(color);
        }}
        onEraserSizeChange={setEraserSize}
        onInstall={handleInstall}
        onOpenAbout={() => {
          setMenuOpen(false);
          setAboutOpen(true);
        }}
        onSaveImage={handleSave}
        onTextSizeChange={setTextSize}
        onToggleMenu={() => setMenuOpen((current) => !current)}
        onToolModeChange={setToolMode}
        onWallChange={(wallId) => {
          setIsLoading(true);
          setStatusMessage(null);
          startTransition(() => {
            setItems([]);
          });
          setActiveWall(wallId);
        }}
        statusMessage={statusMessage}
        textSize={textSize}
        toolMode={toolMode}
        wallOptions={WALL_PRESETS.map(({ id, label }) => ({ id, label }))}
      />

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}

"use client";

import {
  forwardRef,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { drawStroke, drawWallText, fillWallBackground } from "@/lib/canvas/draw-stroke";
import { normalizePointerPoint, pointDistance } from "@/lib/canvas/normalize-point";
import type { Point, WallItem } from "@/lib/types/wall";

type ToolMode = "brush" | "eraser" | "text";

type CanvasSurfaceProps = {
  items: WallItem[];
  toolMode: ToolMode;
  color: string;
  width: number;
  textFontSize: number;
  wallImageUrl: string;
  onCommitStroke: (stroke: { points: Point[] }) => Promise<void> | void;
  onCommitText: (text: { text: string; position: Point; fontSize: number }) => Promise<void> | void;
};

type TextDraft = {
  position: Point;
  value: string;
};

export type CanvasSurfaceHandle = {
  savePng: (filename?: string) => void;
};

export const CanvasSurface = forwardRef<CanvasSurfaceHandle, CanvasSurfaceProps>(
  function CanvasSurface(
    { items, toolMode, color, width, textFontSize, wallImageUrl, onCommitStroke, onCommitText },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const drawingRef = useRef(false);
    const pointsRef = useRef<Point[]>([]);
    const [textDraft, setTextDraft] = useState<TextDraft | null>(null);

    const redraw = useEffectEvent(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;

      if (!canvas || !container) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      const widthPx = container.clientWidth;
      const heightPx = container.clientHeight;
      const ratio = window.devicePixelRatio || 1;

      if (
        canvas.width !== Math.floor(widthPx * ratio) ||
        canvas.height !== Math.floor(heightPx * ratio)
      ) {
        canvas.width = Math.floor(widthPx * ratio);
        canvas.height = Math.floor(heightPx * ratio);
        canvas.style.width = `${widthPx}px`;
        canvas.style.height = `${heightPx}px`;
      }

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      for (const item of items) {
        if (item.kind === "stroke") {
          drawStroke(context, item, { width: widthPx, height: heightPx });
          continue;
        }

        drawWallText(context, item, { width: widthPx, height: heightPx });
      }

      if (toolMode !== "text" && pointsRef.current.length >= 2) {
        drawStroke(
          context,
          {
            points: pointsRef.current,
            color,
            width,
          },
          { width: widthPx, height: heightPx },
        );
      }
    });

    const drawLatestSegment = useEffectEvent(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;

      if (!canvas || !container || pointsRef.current.length < 2) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      const points = pointsRef.current.slice(-2);
      drawStroke(
        context,
        {
          points,
          color,
          width,
        },
        {
          width: container.clientWidth,
          height: container.clientHeight,
        },
      );
    });

    useEffect(() => {
      redraw();
    }, [color, items, toolMode, width]);

    useEffect(() => {
      redraw();

      const resizeObserver = new ResizeObserver(() => {
        redraw();
      });

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    useEffect(() => {
      if (toolMode !== "text") {
        setTextDraft(null);
      }
    }, [toolMode]);

    useEffect(() => {
      if (!textDraft) {
        return;
      }

      textInputRef.current?.focus();
    }, [textDraft]);

    useImperativeHandle(ref, () => ({
      savePng(filename = "digital-art-wall.png") {
        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }

        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const context = exportCanvas.getContext("2d");
        if (!context) {
          return;
        }

        fillWallBackground(context, exportCanvas.width, exportCanvas.height);
        context.drawImage(canvas, 0, 0);

        const link = document.createElement("a");
        link.href = exportCanvas.toDataURL("image/png");
        link.download = filename;
        link.click();
      },
    }));

    function beginStroke(event: React.PointerEvent<HTMLCanvasElement>) {
      if (toolMode === "text") {
        const position = normalizePointerPoint(event, event.currentTarget);
        setTextDraft({ position, value: "" });
        return;
      }

      if (event.button !== 0 && event.pointerType !== "touch" && event.pointerType !== "pen") {
        return;
      }

      const nextPoint = normalizePointerPoint(event, event.currentTarget);
      drawingRef.current = true;
      pointsRef.current = [nextPoint];
      event.currentTarget.setPointerCapture(event.pointerId);
      redraw();
    }

    function extendStroke(event: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawingRef.current) {
        return;
      }

      const nextPoint = normalizePointerPoint(event, event.currentTarget);
      const lastPoint = pointsRef.current.at(-1);

      if (lastPoint && pointDistance(lastPoint, nextPoint) < 0.0025) {
        return;
      }

      pointsRef.current = [...pointsRef.current, nextPoint];
      drawLatestSegment();
    }

    async function finishStroke(event: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawingRef.current) {
        return;
      }

      drawingRef.current = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const committedPoints = pointsRef.current;
      pointsRef.current = [];
      redraw();

      if (committedPoints.length >= 2) {
        await onCommitStroke({ points: committedPoints });
      }
    }

    async function submitTextDraft() {
      if (!textDraft) {
        return;
      }

      const trimmed = textDraft.value.trim();
      const draft = textDraft;
      setTextDraft(null);

      if (trimmed.length === 0) {
        return;
      }

      await onCommitText({
        text: trimmed,
        position: draft.position,
        fontSize: textFontSize,
      });
    }

    return (
      <section
        className={`relative min-h-dvh w-full overflow-hidden touch-none bg-cover bg-center bg-no-repeat ${
          toolMode === "text" ? "cursor-text" : "cursor-crosshair"
        }`}
        ref={containerRef}
        style={{ backgroundImage: `url(${wallImageUrl})` }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.33),_transparent_26%,rgba(82,58,38,0.12)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.28),_transparent_42%)]" />
        <canvas
          aria-label="Shared digital art wall"
          className="absolute inset-0 h-full w-full touch-none"
          onPointerCancel={finishStroke}
          onPointerDown={beginStroke}
          onPointerMove={extendStroke}
          onPointerUp={finishStroke}
          ref={canvasRef}
        />
        {textDraft ? (
          <div
            className="absolute z-20 w-[min(18rem,70vw)] rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] p-3 shadow-[0_20px_40px_var(--shadow)] backdrop-blur"
            style={{
              left: `${textDraft.position[0] * 100}%`,
              top: `${textDraft.position[1] * 100}%`,
              transform: "translate(-10%, -18%)",
            }}
          >
            <label className="sr-only" htmlFor="wall-text-draft">
              Text to place on wall
            </label>
            <textarea
              className="min-h-24 w-full resize-none rounded-2xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent-deep)]"
              id="wall-text-draft"
              onChange={(event) => {
                setTextDraft((current) =>
                  current
                    ? {
                        ...current,
                        value: event.currentTarget.value,
                      }
                    : current,
                );
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setTextDraft(null);
                }

                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitTextDraft();
                }
              }}
              placeholder="Type something for the wall"
              ref={textInputRef}
              rows={3}
              value={textDraft.value}
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[rgba(31,25,20,0.52)]">
                Enter to place
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[rgba(31,25,20,0.7)] transition hover:bg-white"
                  onClick={() => setTextDraft(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-full border border-[var(--line)] bg-[rgba(37,88,110,0.12)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[rgba(37,88,110,0.18)]"
                  onClick={() => {
                    void submitTextDraft();
                  }}
                  type="button"
                >
                  Add text
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    );
  },
);

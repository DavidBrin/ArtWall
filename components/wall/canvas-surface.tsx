"use client";

import {
  forwardRef,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
} from "react";
import { drawStroke, fillWallBackground } from "@/lib/canvas/draw-stroke";
import { normalizePointerPoint, pointDistance } from "@/lib/canvas/normalize-point";
import type { Point, Stroke } from "@/lib/types/wall";

type CanvasSurfaceProps = {
  strokes: Stroke[];
  color: string;
  width: number;
  onCommit: (stroke: { points: Point[] }) => Promise<void> | void;
};

export type CanvasSurfaceHandle = {
  savePng: (filename?: string) => void;
};

export const CanvasSurface = forwardRef<CanvasSurfaceHandle, CanvasSurfaceProps>(
  function CanvasSurface({ strokes, color, width, onCommit }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const pointsRef = useRef<Point[]>([]);

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

      if (canvas.width !== Math.floor(widthPx * ratio) || canvas.height !== Math.floor(heightPx * ratio)) {
        canvas.width = Math.floor(widthPx * ratio);
        canvas.height = Math.floor(heightPx * ratio);
        canvas.style.width = `${widthPx}px`;
        canvas.style.height = `${heightPx}px`;
      }

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      for (const stroke of strokes) {
        drawStroke(context, stroke, { width: widthPx, height: heightPx });
      }

      if (pointsRef.current.length >= 2) {
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
    }, [color, strokes, width]);

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
        await onCommit({ points: committedPoints });
      }
    }

    return (
      <section
        className="relative min-h-screen w-full cursor-crosshair overflow-hidden touch-none"
        ref={containerRef}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.45),_transparent_26%,rgba(82,58,38,0.09)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.38),_transparent_42%)]" />
        <canvas
          aria-label="Shared digital art wall"
          className="absolute inset-0 h-full w-full touch-none"
          onPointerCancel={finishStroke}
          onPointerDown={beginStroke}
          onPointerMove={extendStroke}
          onPointerUp={finishStroke}
          ref={canvasRef}
        />
      </section>
    );
  },
);

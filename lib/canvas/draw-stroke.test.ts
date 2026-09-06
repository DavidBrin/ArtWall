import { describe, expect, it, vi } from "vitest";
import { drawStroke } from "./draw-stroke";

function createMockContext() {
  const context = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    globalCompositeOperation: "source-over",
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 0,
    lineCap: "",
    lineJoin: "",
  };

  return context;
}

describe("drawStroke", () => {
  it("uses destination-out so eraser strokes reveal the wall instead of painting over it", () => {
    const context = createMockContext();

    drawStroke(
      context as unknown as CanvasRenderingContext2D,
      {
        points: [
          [0.1, 0.1],
          [0.2, 0.2],
        ],
        color: "#d1d0cc",
        width: 18,
        erase: true,
      },
      { width: 200, height: 100 },
    );

    expect(context.globalCompositeOperation).toBe("destination-out");
  });

  it.each(["#d1d0cc", "#f4e9cd", "#224236"])(
    "treats legacy wall-matching eraser color %s as a real eraser",
    (color) => {
      const context = createMockContext();

      drawStroke(
        context as unknown as CanvasRenderingContext2D,
        {
          points: [
            [0.1, 0.1],
            [0.2, 0.2],
          ],
          color,
          width: 18,
        },
        { width: 200, height: 100 },
      );

      expect(context.globalCompositeOperation).toBe("destination-out");
    },
  );

  it("keeps regular brush strokes as source-over paint", () => {
    const context = createMockContext();

    drawStroke(
      context as unknown as CanvasRenderingContext2D,
      {
        points: [
          [0.1, 0.1],
          [0.2, 0.2],
        ],
        color: "#1f1b18",
        width: 4,
      },
      { width: 200, height: 100 },
    );

    expect(context.globalCompositeOperation).toBe("source-over");
  });
});

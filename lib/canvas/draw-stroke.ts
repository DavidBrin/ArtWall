import type { Point, Stroke, WallText } from "@/lib/types/wall";

type CanvasSize = {
  width: number;
  height: number;
};

function toPixels(point: Point, size: CanvasSize) {
  return {
    x: point[0] * size.width,
    y: point[1] * size.height,
  };
}

export function fillWallBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#fffaf2");
  gradient.addColorStop(1, "#f2e5cd");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

export function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: Pick<Stroke, "points" | "color" | "width">,
  size: CanvasSize,
) {
  if (stroke.points.length === 0) {
    return;
  }

  context.save();
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineWidth = stroke.width;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (stroke.points.length === 1) {
    const point = toPixels(stroke.points[0], size);
    context.beginPath();
    context.arc(point.x, point.y, stroke.width / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }

  const first = toPixels(stroke.points[0], size);
  context.beginPath();
  context.moveTo(first.x, first.y);

  if (stroke.points.length === 2) {
    const second = toPixels(stroke.points[1], size);
    context.lineTo(second.x, second.y);
    context.stroke();
    context.restore();
    return;
  }

  for (let index = 1; index < stroke.points.length - 1; index += 1) {
    const current = toPixels(stroke.points[index], size);
    const next = toPixels(stroke.points[index + 1], size);
    const midpointX = (current.x + next.x) / 2;
    const midpointY = (current.y + next.y) / 2;
    context.quadraticCurveTo(current.x, current.y, midpointX, midpointY);
  }

  const last = toPixels(stroke.points[stroke.points.length - 1], size);
  context.lineTo(last.x, last.y);

  context.stroke();
  context.restore();
}

export function drawWallText(
  context: CanvasRenderingContext2D,
  textItem: Pick<WallText, "text" | "position" | "color" | "fontSize">,
  size: CanvasSize,
) {
  const origin = toPixels(textItem.position, size);
  const lines = textItem.text.split(/\r?\n/).filter((line) => line.length > 0);

  if (lines.length === 0) {
    return;
  }

  context.save();
  context.fillStyle = textItem.color;
  context.font = `${textItem.fontSize}px "Space Grotesk", ui-sans-serif, system-ui, sans-serif`;
  context.textBaseline = "top";
  context.shadowColor = "rgba(255, 255, 255, 0.22)";
  context.shadowBlur = 6;

  const lineHeight = Math.round(textItem.fontSize * 1.2);

  lines.forEach((line, index) => {
    context.fillText(line, origin.x, origin.y + index * lineHeight);
  });

  context.restore();
}

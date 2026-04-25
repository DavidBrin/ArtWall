import type { Point } from "@/lib/types/wall";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function normalizePointerPoint(
  event: Pick<PointerEvent, "clientX" | "clientY">,
  element: HTMLElement,
): Point {
  const rect = element.getBoundingClientRect();
  return [
    clamp((event.clientX - rect.left) / rect.width),
    clamp((event.clientY - rect.top) / rect.height),
  ];
}

export function pointDistance(a: Point, b: Point) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

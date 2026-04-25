import { describe, expect, it } from "vitest";
import { normalizePointerPoint, pointDistance } from "./normalize-point";

describe("normalizePointerPoint", () => {
  it("maps pointer coordinates into normalized canvas space", () => {
    const point = normalizePointerPoint(
      { clientX: 150, clientY: 60 },
      {
        getBoundingClientRect: () =>
          ({
            left: 50,
            top: 10,
            width: 200,
            height: 100,
          }) as DOMRect,
      } as HTMLElement,
    );

    expect(point).toEqual([0.5, 0.5]);
  });

  it("clamps coordinates outside the element bounds", () => {
    const point = normalizePointerPoint(
      { clientX: 0, clientY: 1000 },
      {
        getBoundingClientRect: () =>
          ({
            left: 100,
            top: 100,
            width: 200,
            height: 300,
          }) as DOMRect,
      } as HTMLElement,
    );

    expect(point).toEqual([0, 1]);
  });
});

describe("pointDistance", () => {
  it("returns Euclidean distance between normalized points", () => {
    expect(pointDistance([0, 0], [0.3, 0.4])).toBeCloseTo(0.5);
  });
});

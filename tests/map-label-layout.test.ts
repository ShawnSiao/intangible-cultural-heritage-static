import { describe, expect, it } from "vitest";
import { labelsOverlap, layoutMapLabels, type MapLabelLayoutItem } from "../src/lib/map-label-layout";

function denseLabels(count: number, width = 104): MapLabelLayoutItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `district-${index}`,
    anchorX: 450 + (index % 4) * 7,
    anchorY: 260 + Math.floor(index / 4) * 5,
    width,
    height: 30,
    priority: count - index,
  }));
}

describe("地图行政区标签布局", () => {
  it("密集城区标签在桌面地图中不重叠", () => {
    const result = layoutMapLabels(denseLabels(18), { viewportWidth: 920, viewportHeight: 560 });
    expect(result).toHaveLength(18);
    expect(labelsOverlap(result)).toBe(false);
    expect(new Set(result.map((item) => `${item.offsetX},${item.offsetY}`)).size).toBe(18);
  });

  it("分散标签保持在行政区中心附近", () => {
    const result = layoutMapLabels([
      { id: "a", anchorX: 120, anchorY: 140, width: 96, height: 30 },
      { id: "b", anchorX: 420, anchorY: 260, width: 96, height: 30 },
      { id: "c", anchorX: 740, anchorY: 400, width: 96, height: 30 },
    ], { viewportWidth: 900, viewportHeight: 520 });
    expect(result.map((item) => [item.offsetX, item.offsetY])).toEqual([[0, 0], [0, 0], [0, 0]]);
  });

  it("密集标签在手机地图中仍可完成无重叠布局", () => {
    const mobileItems = denseLabels(16, 82).map((item) => ({ ...item, anchorX: 185 + (item.anchorX - 450) * .35, anchorY: 245 + (item.anchorY - 260) * .35 }));
    const result = layoutMapLabels(mobileItems, { viewportWidth: 390, viewportHeight: 520, bottomPadding: 58, padding: 10, gap: 6 });
    expect(labelsOverlap(result, 6)).toBe(false);
  });
});

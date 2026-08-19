export type MapLabelLayoutItem = {
  anchorX: number;
  anchorY: number;
  height: number;
  id: string;
  priority?: number;
  width: number;
};

export type MapLabelLayoutResult = MapLabelLayoutItem & {
  offsetX: number;
  offsetY: number;
};

type LayoutRect = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type LayoutOptions = {
  bottomPadding?: number;
  gap?: number;
  padding?: number;
  viewportHeight: number;
  viewportWidth: number;
};

const CARD_LIFT = 8;

function rectFor(item: MapLabelLayoutItem, offsetX: number, offsetY: number): LayoutRect {
  const left = item.anchorX + offsetX - item.width / 2;
  const top = item.anchorY + offsetY - item.height - CARD_LIFT;
  return { left, top, right: left + item.width, bottom: top + item.height };
}

function intersects(a: LayoutRect, b: LayoutRect, gap: number): boolean {
  return !(a.right + gap <= b.left || b.right + gap <= a.left || a.bottom + gap <= b.top || b.bottom + gap <= a.top);
}

function intersectionArea(a: LayoutRect, b: LayoutRect, gap: number): number {
  const width = Math.max(0, Math.min(a.right + gap, b.right + gap) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom + gap, b.bottom + gap) - Math.max(a.top, b.top));
  return width * height;
}

function withinBounds(rect: LayoutRect, options: Required<LayoutOptions>): boolean {
  return rect.left >= options.padding
    && rect.right <= options.viewportWidth - options.padding
    && rect.top >= options.padding
    && rect.bottom <= options.viewportHeight - options.bottomPadding;
}

function radialCandidates(item: MapLabelLayoutItem, options: Required<LayoutOptions>): Array<[number, number]> {
  const candidates: Array<[number, number]> = [[0, 0]];
  const outwardAngle = Math.atan2(item.anchorY - options.viewportHeight / 2, item.anchorX - options.viewportWidth / 2);
  const angleSteps = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8];
  const radiusStep = Math.max(46, Math.min(72, item.width * .58));
  const maxRadius = Math.hypot(options.viewportWidth, options.viewportHeight) * .62;
  for (let radius = radiusStep; radius <= maxRadius; radius += radiusStep) {
    for (const step of angleSteps) {
      const angle = outwardAngle + step * Math.PI / 8;
      candidates.push([Math.round(Math.cos(angle) * radius), Math.round(Math.sin(angle) * radius)]);
    }
  }
  return candidates;
}

function viewportCandidates(item: MapLabelLayoutItem, options: Required<LayoutOptions>): Array<[number, number]> {
  const candidates: Array<[number, number]> = [];
  const xStep = item.width + options.gap;
  const yStep = item.height + options.gap;
  for (let top = options.padding; top + item.height <= options.viewportHeight - options.bottomPadding; top += yStep) {
    for (let left = options.padding; left + item.width <= options.viewportWidth - options.padding; left += xStep) {
      const targetX = left + item.width / 2;
      const targetY = top + item.height + CARD_LIFT;
      candidates.push([Math.round(targetX - item.anchorX), Math.round(targetY - item.anchorY)]);
    }
  }
  return candidates.sort((a, b) => (a[0] ** 2 + a[1] ** 2) - (b[0] ** 2 + b[1] ** 2));
}

export function layoutMapLabels(items: MapLabelLayoutItem[], inputOptions: LayoutOptions): MapLabelLayoutResult[] {
  const options: Required<LayoutOptions> = {
    bottomPadding: inputOptions.bottomPadding ?? 54,
    gap: inputOptions.gap ?? 8,
    padding: inputOptions.padding ?? 14,
    viewportHeight: inputOptions.viewportHeight,
    viewportWidth: inputOptions.viewportWidth,
  };
  const crowding = new Map(items.map((item) => [item.id, items.filter((candidate) => candidate.id !== item.id
    && Math.abs(candidate.anchorX - item.anchorX) < (candidate.width + item.width) * .72
    && Math.abs(candidate.anchorY - item.anchorY) < Math.max(candidate.height, item.height) * 2.1).length]));
  const ordered = [...items].sort((a, b) => (crowding.get(b.id) ?? 0) - (crowding.get(a.id) ?? 0)
    || Number(b.priority ?? 0) - Number(a.priority ?? 0)
    || a.id.localeCompare(b.id));
  const placed: Array<{ item: MapLabelLayoutItem; offsetX: number; offsetY: number; rect: LayoutRect }> = [];

  for (const item of ordered) {
    const candidates = [...radialCandidates(item, options), ...viewportCandidates(item, options)];
    let best: { offsetX: number; offsetY: number; rect: LayoutRect; overlap: number } | null = null;
    for (const [offsetX, offsetY] of candidates) {
      const rect = rectFor(item, offsetX, offsetY);
      if (!withinBounds(rect, options)) continue;
      const overlap = placed.reduce((sum, entry) => sum + intersectionArea(rect, entry.rect, options.gap), 0);
      if (overlap === 0) {
        best = { offsetX, offsetY, rect, overlap };
        break;
      }
      if (!best || overlap < best.overlap || (overlap === best.overlap && offsetX ** 2 + offsetY ** 2 < best.offsetX ** 2 + best.offsetY ** 2)) {
        best = { offsetX, offsetY, rect, overlap };
      }
    }
    const fallback = best ?? { offsetX: 0, offsetY: 0, rect: rectFor(item, 0, 0), overlap: Number.POSITIVE_INFINITY };
    placed.push({ item, ...fallback });
  }

  return placed.map(({ item, offsetX, offsetY }) => ({ ...item, offsetX, offsetY }));
}

export function labelsOverlap(items: MapLabelLayoutResult[], gap = 8): boolean {
  return items.some((item, index) => items.slice(index + 1).some((candidate) => intersects(
    rectFor(item, item.offsetX, item.offsetY),
    rectFor(candidate, candidate.offsetX, candidate.offsetY),
    gap,
  )));
}

const venueTypeLabels: Record<string, string> = {
  exhibition_base: "非遗展示基地",
  exhibition_hall: "非遗展示馆",
  museum: "博物馆",
  production_base: "生产性保护基地",
  protection_base: "非遗保护基地",
  school_base: "校园传承基地",
  workshop: "传习工坊",
};

const coordinatePrecisionLabels: Record<string, string> = {
  exact: "精确地点",
  poi: "地点坐标",
  approximate: "近似位置",
  administrative_center: "行政区中心",
  administrative_centroid: "行政区中心",
  geocoded_address: "地址匹配位置",
  none: "未提供可靠坐标",
};

const placeLevelLabels: Record<string, string> = {
  country: "全国",
  province: "省级行政区",
  city: "市级行政区",
  district: "区县级行政区",
};

function mappedLabel(value: unknown, labels: Record<string, string>, fallback: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) return fallback;
  return labels[normalized] ?? normalized;
}

export function venueTypeLabel(value: unknown): string {
  return mappedLabel(value, venueTypeLabels, "体验地点");
}

export function coordinatePrecisionLabel(value: unknown): string {
  return mappedLabel(value, coordinatePrecisionLabels, "未说明");
}

export function placeLevelLabel(value: unknown): string {
  return mappedLabel(value, placeLevelLabels, "行政区");
}

export function formatDate(value: unknown): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "待核验";
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]} 年 ${Number(match[2])} 月 ${Number(match[3])} 日` : normalized;
}

export function isStaleVerification(value: unknown, now = new Date(), months = 18): boolean {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return true;
  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() - months);
  return date < threshold;
}

export function normalizeBatchLabel(value: unknown): string {
  const text = String(value ?? "").trim();
  const canonical = text.match(/(\d{4})年\s*(第[一二三四五六七八九十0-9]+批)/);
  return canonical ? `${canonical[1]}年${canonical[2]}` : text || "批次待核验";
}

export function descriptionParagraphs(value: unknown): string[] {
  return String(value ?? "").split(/\n{1,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

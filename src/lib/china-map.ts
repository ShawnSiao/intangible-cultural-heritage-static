export type GeoPosition = [number, number];

export type ChinaGeoFeature = {
  type: "Feature";
  properties: {
    adcode: number | string;
    name: string;
    center?: GeoPosition;
    centroid?: GeoPosition;
    level?: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: GeoPosition[][] | GeoPosition[][][];
  };
};

export type ChinaFeatureCollection = {
  type: "FeatureCollection";
  features: ChinaGeoFeature[];
};

const MAIN_BOUNDS = {
  longitudeMin: 73.2,
  latitudeMax: 53.7,
  x: 20,
  y: 26,
  longitudeScale: 8.8,
  latitudeScale: 10.8,
};

function projectMain([longitude, latitude]: GeoPosition): GeoPosition {
  return [
    MAIN_BOUNDS.x + (longitude - MAIN_BOUNDS.longitudeMin) * MAIN_BOUNDS.longitudeScale,
    MAIN_BOUNDS.y + (MAIN_BOUNDS.latitudeMax - latitude) * MAIN_BOUNDS.latitudeScale,
  ];
}

function projectSouthChinaSea([longitude, latitude]: GeoPosition): GeoPosition {
  return [578 + ((longitude - 105) / 20) * 100, 330 + ((26 - latitude) / 24) * 150];
}

function polygonToPath(polygon: GeoPosition[][], project: (position: GeoPosition) => GeoPosition) {
  return polygon.map((ring) => ring.map((position, index) => {
    const [x, y] = project(position);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + " Z").join(" ");
}

export function geometryToPath(feature: ChinaGeoFeature) {
  const project = String(feature.properties.adcode) === "100000_JD" ? projectSouthChinaSea : projectMain;
  if (feature.geometry.type === "Polygon") {
    return polygonToPath(feature.geometry.coordinates as GeoPosition[][], project);
  }
  return (feature.geometry.coordinates as GeoPosition[][][])
    .map((polygon) => polygonToPath(polygon, project))
    .join(" ");
}

export function featureLabelPosition(feature: ChinaGeoFeature): GeoPosition | null {
  const position = feature.properties.centroid ?? feature.properties.center;
  return position ? projectMain(position) : null;
}

export function isChinaFeatureCollection(value: unknown): value is ChinaFeatureCollection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ChinaFeatureCollection>;
  if (candidate.type !== "FeatureCollection" || !Array.isArray(candidate.features) || candidate.features.length < 34) return false;
  return candidate.features.every((feature) =>
    feature?.type === "Feature"
    && typeof feature.properties?.adcode !== "undefined"
    && typeof feature.properties?.name === "string"
    && (feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon")
    && Array.isArray(feature.geometry.coordinates));
}

export function densityFill(count: number, maximum: number) {
  const ratio = maximum > 0 ? Math.sqrt(Math.max(0, count) / maximum) : 0;
  const amount = 0.14 + ratio * 0.78;
  const start = [232, 223, 202];
  const end = [36, 59, 90];
  const channel = (index: number) => Math.round(start[index] + (end[index] - start[index]) * amount);
  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
}

const CATEGORY_COLORS: Record<string, string> = {
  "传统技艺": "#a9362c",
  "传统戏剧": "#74483f",
  "传统舞蹈": "#9a7442",
  "传统音乐": "#243b5a",
  "民俗": "#4f7168",
  "传统美术": "#675b82",
  "传统体育、游艺与杂技": "#b7683e",
  "曲艺": "#8a5c72",
  "民间文学": "#586b3c",
  "传统医药": "#6f6a3b",
};

export function categoryFill(category: string | null) {
  return category ? CATEGORY_COLORS[category] ?? "#8a8170" : "#d9d0bd";
}

export function shortProvinceName(name: string) {
  return name
    .replace("维吾尔自治区", "")
    .replace("壮族自治区", "")
    .replace("回族自治区", "")
    .replace("自治区", "")
    .replace("特别行政区", "")
    .replace(/[省市]$/, "");
}

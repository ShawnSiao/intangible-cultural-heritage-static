import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const catalogPath = resolve("public/data/catalog.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

function exactKeys(value, allowed, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} 必须是对象`);
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  const missing = allowed.filter((key) => !(key in value));
  if (extras.length || missing.length) throw new Error(`${path} 字段不符合公开目录约束；多余：${extras.join(",") || "无"}；缺少：${missing.join(",") || "无"}`);
}

function requireArray(value, path) {
  if (!Array.isArray(value)) throw new Error(`${path} 必须是数组`);
}

function inspectStrings(value, path = "catalog") {
  if (typeof value === "string") {
    const urlAllowed = path.endsWith(".visitUrl") || path.endsWith(".eventUrl");
    if (!urlAllowed && /https?:\/\//i.test(value)) throw new Error(`${path} 包含未允许公开的 URL`);
    if (/(?:source[_-]?id|request[_-]?url|base[_-]?url|snapshot|import[_-]?run|review[_-]?issue|sha-?256|external[_-]?id|project-data)/i.test(value)) {
      throw new Error(`${path} 包含内部数据字段或路径`);
    }
    return;
  }
  if (Array.isArray(value)) return value.forEach((item, index) => inspectStrings(item, `${path}[${index}]`));
  if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => inspectStrings(item, `${path}.${key}`));
}

exactKeys(catalog, ["version", "publishedAt", "stats", "places", "heritage", "venues", "events"], "catalog");
if (catalog.version !== 1) throw new Error("catalog.version 必须为 1");
exactKeys(catalog.stats, ["placeCount", "heritageCount", "nationalProjectCount", "nationalInheritorCount", "categoryCount", "provinceCount", "venueCount"], "catalog.stats");
requireArray(catalog.places, "catalog.places");
requireArray(catalog.heritage, "catalog.heritage");
requireArray(catalog.venues, "catalog.venues");
requireArray(catalog.events, "catalog.events");

catalog.places.forEach((place, index) => exactKeys(place, ["adcode", "name", "level", "parentAdcode", "longitude", "latitude", "coordinatePrecision", "coverageLevel"], `catalog.places[${index}]`));
catalog.heritage.forEach((item, index) => {
  exactKeys(item, ["id", "name", "canonicalName", "summary", "description", "itemNumber", "category", "level", "regionText", "batch", "protectionUnit", "verifiedAt", "adcode", "placeName", "inheritors", "venueIds"], `catalog.heritage[${index}]`);
  requireArray(item.inheritors, `catalog.heritage[${index}].inheritors`);
  requireArray(item.venueIds, `catalog.heritage[${index}].venueIds`);
  item.inheritors.forEach((person, personIndex) => exactKeys(person, ["name", "sex", "ethnicGroup", "batch"], `catalog.heritage[${index}].inheritors[${personIndex}]`));
});
catalog.venues.forEach((venue, index) => {
  exactKeys(venue, ["id", "name", "venueType", "adcode", "placeName", "address", "longitude", "latitude", "coordinatePrecision", "openingNote", "visitNote", "lastVerifiedAt", "visitUrl", "heritageIds"], `catalog.venues[${index}]`);
  requireArray(venue.heritageIds, `catalog.venues[${index}].heritageIds`);
});
catalog.events.forEach((event, index) => exactKeys(event, ["id", "title", "startsAt", "endsAt", "recurrenceRule", "dateText", "eventUrl", "venueName", "placeName"], `catalog.events[${index}]`));

if (catalog.stats.placeCount !== catalog.places.length) throw new Error("地区数量与统计值不一致");
if (catalog.stats.heritageCount !== catalog.heritage.length) throw new Error("项目数量与统计值不一致");
if (catalog.stats.venueCount !== catalog.venues.length) throw new Error("地点数量与统计值不一致");
if (new Set(catalog.heritage.map((item) => item.id)).size !== catalog.heritage.length) throw new Error("项目 ID 存在重复");
if (new Set(catalog.places.map((place) => place.adcode)).size !== catalog.places.length) throw new Error("行政区代码存在重复");
inspectStrings(catalog);

console.log(JSON.stringify({
  status: "ok",
  catalogPath,
  placeCount: catalog.places.length,
  heritageCount: catalog.heritage.length,
  venueCount: catalog.venues.length,
  eventCount: catalog.events.length,
}, null, 2));

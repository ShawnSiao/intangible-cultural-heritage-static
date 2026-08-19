import { describe, expect, it } from "vitest";
import { CatalogModel } from "../src/lib/catalog-model";
import type { PublicCatalog } from "../src/types";

const catalog: PublicCatalog = {
  version: 1,
  publishedAt: "2026-08-18",
  stats: { placeCount: 3, heritageCount: 4, nationalProjectCount: 2, nationalInheritorCount: 1, categoryCount: 3, provinceCount: 1, venueCount: 1 },
  places: [
    { adcode: "100000", name: "中华人民共和国", level: "country", parentAdcode: null, longitude: null, latitude: null, coordinatePrecision: "administrative_centroid", coverageLevel: "national_only" },
    { adcode: "320000", name: "江苏省", level: "province", parentAdcode: "100000", longitude: 118.7, latitude: 32, coordinatePrecision: "administrative_centroid", coverageLevel: "national_only" },
    { adcode: "320100", name: "南京市", level: "city", parentAdcode: "320000", longitude: 118.8, latitude: 32.1, coordinatePrecision: "administrative_centroid", coverageLevel: "nanjing_deep" },
  ],
  heritage: [
    { id: "variant-a", name: "南京云锦", canonicalName: "南京云锦", summary: null, description: "项目介绍", itemNumber: "A-1", category: "传统技艺", level: "国家级", regionText: "南京市", batch: "第一批", protectionUnit: "保护单位", verifiedAt: "2026-08-18", adcode: "320100", placeName: "南京市", inheritors: [{ name: "传承人", sex: null, ethnicGroup: null, batch: "第一批" }], venueIds: ["venue-a"] },
    { id: "variant-b", name: "金陵灯彩", canonicalName: "金陵灯彩", summary: null, description: "项目介绍", itemNumber: "B-1", category: "传统美术", level: "南京市级", regionText: "南京市", batch: "第一批", protectionUnit: "保护单位", verifiedAt: "2026-08-18", adcode: "320100", placeName: "南京市", inheritors: [], venueIds: [] },
    { id: "variant-c", name: "江苏本级项目", canonicalName: "江苏本级项目", summary: null, description: "项目介绍", itemNumber: "C-1", category: "传统音乐", level: "江苏省级", regionText: "江苏省", batch: "第一批", protectionUnit: "保护单位", verifiedAt: "2026-08-18", adcode: "320000", placeName: "江苏省", inheritors: [], venueIds: [] },
    { id: "variant-d", name: "中央单位项目", canonicalName: "中央单位项目", summary: null, description: "项目介绍", itemNumber: "D-1", category: "民俗", level: "国家级", regionText: "中央单位", batch: "第一批", protectionUnit: "保护单位", verifiedAt: "2026-08-18", adcode: null, placeName: null, inheritors: [], venueIds: [] },
  ],
  venues: [{ id: "venue-a", name: "非遗馆", venueType: "museum", adcode: "320100", placeName: "南京市", address: "南京市", longitude: 118.8, latitude: 32.1, coordinatePrecision: "geocoded_address", openingNote: null, visitNote: null, lastVerifiedAt: "2026-08-18", visitUrl: null, heritageIds: ["variant-a"] }],
  events: [],
};

describe("CatalogModel", () => {
  it("aggregates projects through the administrative hierarchy", () => {
    const model = new CatalogModel(catalog);
    expect(model.getPlace("320000")?.projectCount).toBe(3);
    expect(model.getPlace("320100")?.inheritorCount).toBe(1);
    expect(model.getPlace("320100")?.venueCount).toBe(1);
  });

  it("keeps parent-level and unmapped projects visible without assigning them to children", () => {
    const model = new CatalogModel(catalog);
    expect(model.getPlace("320000")?.directProjectCount).toBe(1);
    expect(model.getPlace("320000")?.children[0].projectCount).toBe(2);
    expect(model.listHeritage("320000", "direct")).toHaveLength(1);
    expect(model.getUnmappedHeritageSummary()).toMatchObject({ projectCount: 1, nationalProjectCount: 1 });
  });

  it("keeps the national map limited to national projects", () => {
    const model = new CatalogModel(catalog);
    expect(model.getMapSummary()).toMatchObject([{ adcode: "320000", projectCount: 1, dominantCategory: "传统技艺" }]);
  });

  it("searches places without a runtime API", () => {
    const model = new CatalogModel(catalog);
    expect(model.searchPlaces("南京")[0]).toMatchObject({ adcode: "320100", projectCount: 2 });
  });
});

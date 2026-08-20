import type {
  HeritageRecord,
  MapSummaryItem,
  PlaceChildSummary,
  PlaceRecord,
  PlaceView,
  PublicCatalog,
  VenueRegionSummary,
  VenueRecord,
} from "../types";

const levelRank = new Map([
  ["国家级", 0],
  ["江苏省级", 1],
  ["南京市级", 2],
]);

function sortProjects(a: HeritageRecord, b: HeritageRecord) {
  const rank = (levelRank.get(a.level) ?? 3) - (levelRank.get(b.level) ?? 3);
  return rank || a.name.localeCompare(b.name, "zh-CN") || a.id.localeCompare(b.id);
}

function representativeProjects(items: HeritageRecord[], limit: number) {
  const seen = new Set<string>();
  return [...items].sort(sortProjects).filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  }).slice(0, limit).map(({ id, name, category, level }) => ({ id, name, category, level }));
}

function categorySummary(items: HeritageRecord[]) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, "zh-CN"));
}

export class CatalogModel {
  readonly catalog: PublicCatalog;
  readonly placeByAdcode: Map<string, PlaceRecord>;
  readonly heritageById: Map<string, HeritageRecord>;
  readonly venueById: Map<string, VenueRecord>;
  private readonly childrenByAdcode = new Map<string, PlaceRecord[]>();
  private readonly directHeritageByAdcode = new Map<string, HeritageRecord[]>();
  private readonly heritageByAdcode = new Map<string, HeritageRecord[]>();
  private readonly venuesByAdcode = new Map<string, VenueRecord[]>();

  constructor(catalog: PublicCatalog) {
    this.catalog = catalog;
    this.placeByAdcode = new Map(catalog.places.map((place) => [place.adcode, place]));
    this.heritageById = new Map(catalog.heritage.map((item) => [item.id, item]));
    this.venueById = new Map(catalog.venues.map((venue) => [venue.id, venue]));

    for (const place of catalog.places) {
      if (!place.parentAdcode) continue;
      const children = this.childrenByAdcode.get(place.parentAdcode) ?? [];
      children.push(place);
      this.childrenByAdcode.set(place.parentAdcode, children);
    }

    for (const item of catalog.heritage) {
      if (!item.adcode) continue;
      const directItems = this.directHeritageByAdcode.get(item.adcode) ?? [];
      directItems.push(item);
      this.directHeritageByAdcode.set(item.adcode, directItems);
      this.addToAncestors(this.heritageByAdcode, item.adcode, item);
    }

    for (const venue of catalog.venues) {
      this.addToAncestors(this.venuesByAdcode, venue.adcode, venue);
    }
  }

  private addToAncestors<T>(target: Map<string, T[]>, adcode: string, value: T) {
    let place = this.placeByAdcode.get(adcode);
    while (place) {
      const items = target.get(place.adcode) ?? [];
      items.push(value);
      target.set(place.adcode, items);
      place = place.parentAdcode ? this.placeByAdcode.get(place.parentAdcode) : undefined;
    }
  }

  getHeritage(id: string) {
    return this.heritageById.get(id) ?? null;
  }

  getVenue(id: string) {
    return this.venueById.get(id) ?? null;
  }

  listHeritage(adcode: string, scope: "descendants" | "direct" = "descendants") {
    return (scope === "direct" ? this.directHeritageByAdcode : this.heritageByAdcode).get(adcode) ?? [];
  }

  listUnmappedHeritage() {
    return this.catalog.heritage.filter((item) => !item.adcode);
  }

  getUnmappedHeritageSummary() {
    const items = this.listUnmappedHeritage();
    return {
      projectCount: items.length,
      nationalProjectCount: items.filter((item) => item.level === "国家级").length,
      categories: categorySummary(items),
    };
  }

  listVenues(adcode?: string) {
    return adcode ? this.venuesByAdcode.get(adcode) ?? [] : this.catalog.venues;
  }

  listVenueTypes(adcode?: string) {
    const venues = this.listVenues(adcode);
    const counts = new Map<string, number>();
    for (const venue of venues) counts.set(venue.venueType, (counts.get(venue.venueType) ?? 0) + 1);
    return [...counts.entries()]
      .map(([venueType, count]) => ({ venueType, count }))
      .sort((a, b) => b.count - a.count || a.venueType.localeCompare(b.venueType));
  }

  listVenueRegions(): VenueRegionSummary[] {
    return this.catalog.places
      .filter((place) => place.level === "province")
      .map((place) => ({ ...place, venueCount: this.listVenues(place.adcode).length }))
      .filter((place) => place.venueCount > 0)
      .sort((a, b) => b.venueCount - a.venueCount || a.adcode.localeCompare(b.adcode));
  }

  searchVenues({ adcode, query, venueType }: { adcode?: string; query?: string; venueType?: string } = {}) {
    const normalized = query?.trim().toLocaleLowerCase("zh-CN") ?? "";
    return [...this.listVenues(adcode)].filter((venue) => {
      if (venueType && venue.venueType !== venueType) return false;
      if (!normalized) return true;
      const heritageNames = venue.heritageIds
        .map((heritageId) => this.getHeritage(heritageId)?.name ?? "")
        .join("\n");
      const haystack = `${venue.name}\n${venue.address ?? ""}\n${venue.placeName}\n${heritageNames}`.toLocaleLowerCase("zh-CN");
      return haystack.includes(normalized);
    }).sort((a, b) => {
      const locationRank = (venue: VenueRecord) => venue.longitude != null && venue.latitude != null ? 0 : venue.address ? 1 : 2;
      return locationRank(a) - locationRank(b)
        || String(b.lastVerifiedAt ?? "").localeCompare(String(a.lastVerifiedAt ?? ""))
        || a.name.localeCompare(b.name, "zh-CN");
    });
  }

  getPlace(adcode: string): PlaceView | null {
    const place = this.placeByAdcode.get(adcode);
    if (!place) return null;
    const items = this.listHeritage(adcode);
    const directItems = this.listHeritage(adcode, "direct");
    const categories = categorySummary(items);
    const directCategories = categorySummary(directItems);
    const children = (this.childrenByAdcode.get(adcode) ?? [])
      .map((child) => this.childSummary(child))
      .sort((a, b) => a.adcode.localeCompare(b.adcode));
    const inheritorCount = items.reduce((sum, item) => sum + item.inheritors.length, 0);
    const containsDeepCoverage = place.coverageLevel === "nanjing_deep"
      || children.some((child) => child.coverageLevel === "nanjing_deep");
    return {
      ...place,
      parent: place.parentAdcode ? this.placeByAdcode.get(place.parentAdcode) ?? null : null,
      categories,
      directCategories,
      directProjectCount: directItems.length,
      projectCount: items.length,
      categoryCount: categories.length,
      dominantCategory: categories[0]?.category ?? null,
      representativeProjects: representativeProjects(items, 5),
      children,
      inheritorCount,
      venueCount: this.listVenues(adcode).length,
      containsDeepCoverage,
    };
  }

  private childSummary(child: PlaceRecord): PlaceChildSummary {
    const items = this.listHeritage(child.adcode);
    const categories = categorySummary(items);
    const projects = representativeProjects(items, 3);
    const names = projects.map((project) => project.name);
    const description = items.length
      ? `当前收录 ${items.length} 个项目${categories[0] ? `，${categories[0].category}数量最多` : ""}${names.length ? `。代表项目包括${names.join("、")}` : ""}。`
      : "当前收录范围内尚无项目记录，可继续查看行政区信息。";
    return {
      ...child,
      projectCount: items.length,
      categoryCount: categories.length,
      dominantCategory: categories[0]?.category ?? null,
      representativeProjects: projects,
      description,
    };
  }

  searchPlaces(query: string, limit = 6) {
    const normalized = query.trim();
    if (!normalized) return [];
    return this.catalog.places
      .filter((place) => place.adcode !== "100000" && (place.name.includes(normalized) || place.adcode.startsWith(normalized)))
      .map((place) => ({ ...place, projectCount: this.listHeritage(place.adcode).length }))
      .sort((a, b) => Number(b.name === normalized) - Number(a.name === normalized) || b.projectCount - a.projectCount || a.level.localeCompare(b.level))
      .slice(0, limit);
  }

  getMapSummary(): MapSummaryItem[] {
    return this.catalog.places.filter((place) => place.level === "province").map((place) => {
      const items = this.listHeritage(place.adcode).filter((item) => item.level === "国家级");
      const categories = categorySummary(items);
      return {
        adcode: place.adcode,
        name: place.name,
        longitude: place.longitude,
        latitude: place.latitude,
        projectCount: items.length,
        categoryCount: categories.length,
        dominantCategory: categories[0]?.category ?? null,
        coverageLevel: place.coverageLevel,
      };
    }).sort((a, b) => b.projectCount - a.projectCount || a.adcode.localeCompare(b.adcode));
  }
}

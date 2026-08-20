export type PlaceLevel = "country" | "province" | "city" | "district";

export type PlaceRecord = {
  adcode: string;
  name: string;
  level: PlaceLevel;
  parentAdcode: string | null;
  longitude: number | null;
  latitude: number | null;
  coordinatePrecision: string;
  coverageLevel: "national_only" | "nanjing_deep";
};

export type InheritorRecord = {
  name: string;
  sex: string | null;
  ethnicGroup: string | null;
  batch: string | null;
};

export type HeritageRecord = {
  id: string;
  name: string;
  canonicalName: string;
  summary: string | null;
  description: string | null;
  itemNumber: string | null;
  category: string;
  level: string;
  regionText: string | null;
  batch: string | null;
  protectionUnit: string | null;
  verifiedAt: string | null;
  adcode: string | null;
  placeName: string | null;
  inheritors: InheritorRecord[];
  venueIds: string[];
};

export type VenueRecord = {
  id: string;
  name: string;
  venueType: string;
  adcode: string;
  placeName: string;
  address: string | null;
  longitude: number | null;
  latitude: number | null;
  coordinatePrecision: string;
  openingNote: string | null;
  visitNote: string | null;
  lastVerifiedAt: string | null;
  visitUrl: string | null;
  heritageIds: string[];
};

export type EventRecord = {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  recurrenceRule: string | null;
  dateText: string | null;
  eventUrl: string | null;
  venueName: string | null;
  placeName: string | null;
};

export type PublicCatalog = {
  version: 1;
  publishedAt: string | null;
  stats: {
    placeCount: number;
    heritageCount: number;
    nationalProjectCount: number;
    nationalInheritorCount: number;
    categoryCount: number;
    provinceCount: number;
    venueCount: number;
  };
  places: PlaceRecord[];
  heritage: HeritageRecord[];
  venues: VenueRecord[];
  events: EventRecord[];
};

export type MapSummaryItem = {
  adcode: string;
  name: string;
  longitude: number | null;
  latitude: number | null;
  projectCount: number;
  categoryCount: number;
  dominantCategory: string | null;
  coverageLevel: string;
};

export type PlaceChildSummary = PlaceRecord & {
  projectCount: number;
  categoryCount: number;
  dominantCategory: string | null;
  representativeProjects: Array<Pick<HeritageRecord, "id" | "name" | "category" | "level">>;
  description: string;
};

export type PlaceView = PlaceRecord & {
  parent: PlaceRecord | null;
  categories: Array<{ category: string; count: number }>;
  directCategories: Array<{ category: string; count: number }>;
  directProjectCount: number;
  projectCount: number;
  categoryCount: number;
  dominantCategory: string | null;
  representativeProjects: Array<Pick<HeritageRecord, "id" | "name" | "category" | "level">>;
  children: PlaceChildSummary[];
  inheritorCount: number;
  venueCount: number;
  containsDeepCoverage: boolean;
};

export type VenueRegionSummary = PlaceRecord & {
  venueCount: number;
};

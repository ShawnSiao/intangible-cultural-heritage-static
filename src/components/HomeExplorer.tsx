import type { MapSummaryItem } from "../types";
import {
  categoryFill,
  densityFill,
  featureLabelPosition,
  geometryToPath,
  isChinaFeatureCollection,
  shortProvinceName,
  type ChinaGeoFeature,
} from "../lib/china-map";
import { useCatalog } from "../lib/catalog-context";
import { useNavigate } from "react-router-dom";
import { useEffect, useId, useMemo, useState } from "react";

type Suggestion = { adcode: string; name: string; level: string; projectCount: number };

const LABEL_OFFSETS: Record<string, [number, number]> = {
  "110000": [-8, -9], "120000": [14, 10], "310000": [14, 5], "320000": [10, -4],
  "330000": [10, 5], "500000": [0, 7], "640000": [0, 5], "710000": [13, 2],
  "810000": [15, 7], "820000": [-15, 5], "460000": [0, 12],
};

const ALL_CATEGORIES = ["民间文学", "传统音乐", "传统舞蹈", "传统戏剧", "曲艺", "传统体育、游艺与杂技", "传统美术", "传统技艺", "传统医药", "民俗"];

export default function HomeExplorer({ provinces, nationalProjectCount, categoryCount }: { provinces: MapSummaryItem[]; nationalProjectCount: number; categoryCount: number }) {
  const catalog = useCatalog();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [mode, setMode] = useState<"density" | "fingerprint">("fingerprint");
  const [features, setFeatures] = useState<ChinaGeoFeature[]>([]);
  const [mapError, setMapError] = useState(false);
  const [focusedAdcode, setFocusedAdcode] = useState<string | null>(null);
  const maxCount = useMemo(() => Math.max(...provinces.map((item) => item.projectCount), 1), [provinces]);
  const provinceByAdcode = useMemo(() => new Map(provinces.map((item) => [item.adcode, item])), [provinces]);
  const activeProvince = provinceByAdcode.get(focusedAdcode ?? "") ?? null;
  const suggestionListId = useId();

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}geo/china-100000-full.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`地图边界加载失败：${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!isChinaFeatureCollection(data)) throw new Error("地图边界结构无效");
        setFeatures(data.features);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setMapError(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setSearchState("idle");
      setActiveSuggestion(-1);
      return;
    }
    const timeout = window.setTimeout(() => {
      setSearchState("loading");
      setSuggestions(catalog.searchPlaces(query, 6));
      setActiveSuggestion(-1);
      setSearchState("ready");
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [catalog, query]);

  const go = (adcode?: string) => {
    const target = adcode ?? suggestions[Math.max(activeSuggestion, 0)]?.adcode;
    if (target) navigate(`/places/${target}`);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setActiveSuggestion(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go();
    }
  };

  const changeMode = (nextMode: "density" | "fingerprint") => {
    setMode(nextMode);
  };

  return (
    <section className="hero" aria-labelledby="home-title">
      <div>
        <div className="eyebrow">国家级非物质文化遗产名录</div>
        <h1 id="home-title">从家乡出发<span>认识身边的非遗</span></h1>
        <p className="hero-copy">查看家乡有哪些非遗、属于哪些门类，以及今天仍由谁传承、在哪里可以走近它们。</p>
        <div className="home-search">
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="输入家乡，例如「南京」"
            aria-label="搜索家乡"
            aria-expanded={suggestions.length > 0}
            aria-controls={suggestionListId}
            aria-autocomplete="list"
            aria-activedescendant={activeSuggestion >= 0 ? `${suggestionListId}-${activeSuggestion}` : undefined}
            role="combobox"
          />
          <button className="primary-button" onClick={() => go()} disabled={!suggestions.length}>查看当地非遗</button>
          {suggestions.length > 0 && (
            <div className="search-suggestions" id={suggestionListId} role="listbox">
              {suggestions.map((item, index) => (
                <button className={`suggestion${activeSuggestion === index ? " active" : ""}`} id={`${suggestionListId}-${index}`} key={item.adcode} onClick={() => go(item.adcode)} onMouseEnter={() => setActiveSuggestion(index)} role="option" aria-selected={activeSuggestion === index}>
                  <span>{item.name}</span><small>{item.projectCount} 个项目</small>
                </button>
              ))}
            </div>
          )}
          <div className={`search-status${searchState === "error" ? " error" : ""}`} role="status" aria-live="polite">
            {searchState === "loading" && "正在查找地区…"}
            {searchState === "ready" && query.trim() && suggestions.length === 0 && "未找到对应地区，可尝试输入省、市或区县名称。"}
            {searchState === "error" && "地区搜索暂时不可用，请稍后重试。"}
          </div>
        </div>
        <div className="home-highlights" aria-label="全国非遗收录概览">
          <div><strong>{nationalProjectCount}</strong><span>国家级项目</span></div>
          <div><strong>{categoryCount}</strong><span>非遗门类</span></div>
          <div><strong>{provinces.length}</strong><span>省级行政区</span></div>
        </div>
      </div>
      <div className="map-panel" aria-label="全国非遗地图">
        <div className="map-header">
          <div className="map-mode" aria-label="地图变体">
            <button aria-pressed={mode === "fingerprint"} className={mode === "fingerprint" ? "active" : ""} onClick={() => changeMode("fingerprint")}>主要门类</button>
            <button aria-pressed={mode === "density"} className={mode === "density" ? "active" : ""} onClick={() => changeMode("density")}>项目数量</button>
          </div>
          <div className="map-legend">{mode === "density" ? "颜色越深，收录的国家级项目越多" : "不同颜色表示各省数量最多的非遗门类"}</div>
        </div>
        <div className="map-stage">
          {mapError ? (
            <div className="china-map-status" role="alert">地图边界未能加载，可通过下方地区入口继续浏览。</div>
          ) : features.length === 0 ? (
            <div className="china-map-status" aria-live="polite">正在绘制中国省级地图…</div>
          ) : (
            <svg className="china-map" viewBox="0 0 700 520" role="img" aria-labelledby="china-map-title china-map-description">
              <title id="china-map-title">中国国家级非遗省级聚合地图</title>
              <desc id="china-map-description">中国省级行政区地图。选择省份可查看当地非遗；当前显示{mode === "density" ? "国家级项目数量" : "各省主要非遗门类"}。</desc>
              <g className="province-regions">
                {features.map((feature) => {
                  const adcode = String(feature.properties.adcode);
                  if (adcode === "100000_JD") {
                    return <path key={adcode} className="south-china-sea-lines" d={geometryToPath(feature)} />;
                  }
                  const item = provinceByAdcode.get(adcode);
                  const fill = mode === "density" ? densityFill(item?.projectCount ?? 0, maxCount) : categoryFill(item?.dominantCategory ?? null);
                  const label = `${feature.properties.name}，${item?.projectCount ?? 0} 个国家级非遗项目，主要门类 ${item?.dominantCategory ?? "暂无"}`;
                  return (
                    <a
                      key={adcode}
                      className="province-region"
                      href={`#/places/${adcode}`}
                      aria-label={label}
                      onMouseEnter={() => setFocusedAdcode(adcode)}
                      onMouseLeave={() => setFocusedAdcode(null)}
                      onFocus={() => setFocusedAdcode(adcode)}
                      onBlur={() => setFocusedAdcode(null)}
                    >
                      <path d={geometryToPath(feature)} fill={fill} fillRule="evenodd" vectorEffect="non-scaling-stroke" />
                      <title>{label}</title>
                    </a>
                  );
                })}
              </g>
              <g className="province-labels" aria-hidden="true">
                {features.map((feature) => {
                  const adcode = String(feature.properties.adcode);
                  const item = provinceByAdcode.get(adcode);
                  const position = featureLabelPosition(feature);
                  if (!item || !position) return null;
                  const [offsetX, offsetY] = LABEL_OFFSETS[adcode] ?? [0, 0];
                  return (
                    <text className={`province-label${focusedAdcode === adcode ? " active" : ""}`} key={adcode} x={position[0] + offsetX} y={position[1] + offsetY}>
                      <tspan>{shortProvinceName(feature.properties.name)}</tspan>
                      {mode === "density" && <tspan className="province-count" x={position[0] + offsetX} dy="10">{item.projectCount}</tspan>}
                    </text>
                  );
                })}
              </g>
              <text className="south-china-sea-label" x="628" y="487">南海诸岛</text>
            </svg>
          )}
          <div className="map-readout" aria-live="polite">
            {activeProvince ? <>
              <span>{activeProvince.name}</span>
              <strong>{activeProvince.projectCount} 个国家级非遗项目</strong>
              <small>主要门类：{activeProvince.dominantCategory ?? "暂无"}</small>
            </> : <><span>选择省份</span><strong>查看当地国家级非遗</strong><small>可继续进入市、区县和项目详情</small></>}
          </div>
          {mode === "fingerprint" && (
            <div className="category-legend" aria-label="十类非遗门类图例">
              {ALL_CATEGORIES.map((category) => <span key={category}><i style={{ background: categoryFill(category) }} />{category}</span>)}
            </div>
          )}
        </div>
        <div className="map-footer"><span>全国收录 {nationalProjectCount} 个国家级项目（按地区子项计）</span><span>选择省份查看当地非遗</span></div>
      </div>
    </section>
  );
}

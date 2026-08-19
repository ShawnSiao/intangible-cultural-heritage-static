import type { PlaceChildSummary } from "../types";
import { useEffect, useMemo, useRef, useState } from "react";

declare global { interface Window { AMap?: any; _AMapSecurityConfig?: { securityJsCode: string } } }

const MARKER_OFFSETS: Array<[number, number]> = [[0, 0], [136, -74], [-136, -74], [136, 74], [-136, 74], [0, -132], [0, 132], [210, 0], [-210, 0]];
const MANUAL_MARKER_OFFSETS: Record<string, [number, number]> = {
  "320102": [0, -232],
  "320104": [148, 18],
  "320105": [-158, 94],
  "320106": [-150, -82],
  "320111": [-220, 8],
  "320113": [160, -86],
  "320114": [44, 206],
  "320115": [172, 92],
};

function collisionOffset(regions: PlaceChildSummary[], index: number): [number, number] {
  const current = regions[index];
  if (current.longitude == null || current.latitude == null) return [0, 0];
  if (MANUAL_MARKER_OFFSETS[current.adcode]) return MANUAL_MARKER_OFFSETS[current.adcode];
  const nearbyBefore = regions.slice(0, index).filter((candidate) =>
    candidate.longitude != null
    && candidate.latitude != null
    && Math.abs(candidate.longitude - current.longitude!) < 0.09
    && Math.abs(candidate.latitude - current.latitude!) < 0.055).length;
  return MARKER_OFFSETS[Math.min(nearbyBefore, MARKER_OFFSETS.length - 1)];
}

type AmapSurfaceProps = {
  boundaryAdcode?: string;
  boundaryLevel?: "country" | "province" | "city" | "district";
  center: [number, number] | null;
  compact?: boolean;
  fallbackDescription?: string;
  fallbackTitle?: string;
  label: string;
  regions?: PlaceChildSummary[];
  showCenterMarker?: boolean;
};

export default function AmapSurface({ boundaryAdcode, boundaryLevel, center, label, compact = false, fallbackDescription, fallbackTitle, regions = [], showCenterMarker = false }: AmapSurfaceProps) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"offline" | "loading" | "ready" | "error">("offline");
  const key = import.meta.env.VITE_AMAP_JS_KEY;
  const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE;
  const regionCenters = useMemo(() => regions.filter((region) => region.longitude != null && region.latitude != null), [regions]);
  const mapCenter = useMemo(() => center ?? (regionCenters[0] ? [regionCenters[0].longitude!, regionCenters[0].latitude!] as [number, number] : null), [center, regionCenters]);
  const regionView = useMemo(() => {
    if (!regionCenters.length) return { center: mapCenter, zoom: 10 };
    const longitudes = regionCenters.map((region) => region.longitude!);
    const latitudes = regionCenters.map((region) => region.latitude!);
    const west = Math.min(...longitudes);
    const east = Math.max(...longitudes);
    const south = Math.min(...latitudes);
    const north = Math.max(...latitudes);
    const span = Math.max(east - west, (north - south) * 1.25);
    const zoom = span > 30 ? 4 : span > 12 ? 5 : span > 6 ? 6 : span > 3 ? 7.5 : span > 1.5 ? 8.5 : span > 0.7 ? 9.5 : span > 0.35 ? 10.5 : 11.5;
    return { center: [(west + east) / 2, (south + north) / 2] as [number, number], zoom };
  }, [mapCenter, regionCenters]);

  useEffect(() => {
    if (!key || !securityCode || !mapCenter || !container.current) return;
    setStatus("loading");
    window._AMapSecurityConfig = { securityJsCode: securityCode };
    let map: any;
    let active = true;
    const initialize = () => {
      if (!active || !window.AMap || !container.current) return;
      map = new window.AMap.Map(container.current, {
        zoom: showCenterMarker ? 15 : regionView.zoom,
        center: regionView.center ?? mapCenter,
        viewMode: "2D",
        mapStyle: "amap://styles/whitesmoke",
        showLabel: true,
      });
      const markers = regionCenters.map((region, index) => {
        const content = document.createElement("a");
        const [rawOffsetX, rawOffsetY] = collisionOffset(regionCenters, index);
        const offsetScale = window.innerWidth <= 520 ? 0.55 : 1;
        const offsetX = Math.round(rawOffsetX * offsetScale);
        const offsetY = Math.round(rawOffsetY * offsetScale);
        content.className = `amap-region-marker${region.projectCount === 0 ? " empty" : ""}${offsetX || offsetY ? " offset" : ""}`;
        content.href = `#/places/${region.adcode}`;
        const projectNames = region.representativeProjects.map((project) => project.name).join("、");
        content.title = projectNames ? `${region.name}：${projectNames}` : `${region.name}：当前暂无项目名称`;
        content.setAttribute("aria-label", `${region.name}，${region.projectCount} 个非遗项目${projectNames ? `，代表项目包括${projectNames}` : ""}`);
        const heading = document.createElement("strong");
        heading.textContent = region.name;
        const count = document.createElement("span");
        count.textContent = `${region.projectCount} 项`;
        content.append(heading, count);
        if (offsetX || offsetY) {
          content.style.setProperty("--leader-length", `${Math.hypot(offsetX, offsetY).toFixed(1)}px`);
          content.style.setProperty("--leader-angle", `${Math.atan2(-offsetY, -offsetX) * 180 / Math.PI}deg`);
        }
        return new window.AMap.Marker({
          map,
          position: [region.longitude, region.latitude],
          title: `${region.name} · ${region.projectCount} 项`,
          content,
          anchor: "bottom-center",
          offset: new window.AMap.Pixel(offsetX, offsetY),
          zIndex: 120 + Math.min(region.projectCount, 99),
        });
      });
      if (showCenterMarker && mapCenter) markers.push(new window.AMap.Marker({ map, position: mapCenter, title: label, anchor: "bottom-center", zIndex: 220 }));
      if (boundaryAdcode && boundaryLevel) {
        window.AMap.plugin("AMap.DistrictSearch", () => {
          if (!active || !map) return;
          const district = new window.AMap.DistrictSearch({ extensions: "all", level: boundaryLevel, subdistrict: 1, showbiz: false });
          district.search(boundaryAdcode, (searchStatus: string, result: any) => {
            if (!active || searchStatus !== "complete") return;
            const boundaries = result?.districtList?.[0]?.boundaries ?? [];
            const polygons = boundaries.map((path: any) => new window.AMap.Polygon({
              map,
              path,
              strokeColor: "#a9362c",
              strokeWeight: 2,
              strokeOpacity: 0.88,
              fillColor: "#d8c9aa",
              fillOpacity: 0.16,
              zIndex: 40,
            }));
            if (polygons.length) {
              const boundaryPadding = window.innerWidth <= 520 ? [76, 76, 76, 76] : [42, 42, 42, 42];
              map.setFitView(polygons, false, boundaryPadding, boundaryLevel === "district" ? 12 : 10.5);
            }
          });
        });
      } else if (markers.length > 1) {
        map.setFitView(markers, false, [52, 52, 52, 52], 11.5);
      }
      setStatus("ready");
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-amap-ich="true"]');
    if (window.AMap) initialize();
    else if (script) script.addEventListener("load", initialize, { once: true });
    else {
      script = document.createElement("script");
      script.dataset.amapIch = "true";
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`;
      script.async = true;
      script.addEventListener("load", initialize, { once: true });
      script.addEventListener("error", () => setStatus("error"), { once: true });
      document.head.appendChild(script);
    }
    return () => { active = false; map?.destroy?.(); };
  }, [boundaryAdcode, boundaryLevel, key, label, mapCenter, regionCenters, regionView, securityCode, showCenterMarker]);

  const live = Boolean(key && securityCode && mapCenter);
  return (
    <div className={`amap-surface${compact ? " compact" : ""}`} aria-label={`${label}地图`}>
      <div ref={container}></div>
      {(!live || status === "error") && (
        <div className="map-fallback">
          <div><strong>{fallbackTitle ?? `${label}地图暂不可用`}</strong><p>{fallbackDescription ?? "地区与项目信息仍可浏览。地图需要可靠坐标和可用地图服务。"}</p></div>
        </div>
      )}
      {status === "loading" && (
        <div className="map-fallback map-loading" role="status" aria-live="polite">
          <div><span className="map-loading-mark" aria-hidden="true" /><strong>正在加载地图</strong><p>正在获取行政区边界与地图底图…</p></div>
        </div>
      )}
      {status === "ready" && boundaryAdcode && <div className="map-context-note">红色边界为当前行政区；标记表示下级行政区中心，不代表项目精确位置。</div>}
    </div>
  );
}

import type { PlaceChildSummary } from "../types";
import { layoutMapLabels } from "../lib/map-label-layout";
import { useEffect, useMemo, useRef, useState } from "react";

declare global { interface Window { AMap?: any; _AMapSecurityConfig?: { securityJsCode: string } } }

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
    let layoutFrame = 0;
    const initialize = () => {
      if (!active || !window.AMap || !container.current) return;
      map = new window.AMap.Map(container.current, {
        zoom: showCenterMarker ? 15 : regionView.zoom,
        center: regionView.center ?? mapCenter,
        viewMode: "2D",
        mapStyle: "amap://styles/whitesmoke",
        showLabel: true,
      });
      const markerRecords = regionCenters.map((region) => {
        const content = document.createElement("a");
        content.className = `amap-region-marker${region.projectCount === 0 ? " empty" : ""}`;
        content.href = `#/places/${region.adcode}`;
        const projectNames = region.representativeProjects.map((project) => project.name).join("、");
        content.title = projectNames ? `${region.name}：${projectNames}` : `${region.name}：当前暂无项目名称`;
        content.setAttribute("aria-label", `${region.name}，${region.projectCount} 个非遗项目${projectNames ? `，代表项目包括${projectNames}` : ""}`);
        const heading = document.createElement("strong");
        heading.textContent = region.name;
        const count = document.createElement("span");
        count.textContent = `${region.projectCount} 项`;
        content.append(heading, count);
        const marker = new window.AMap.Marker({
          map,
          position: [region.longitude, region.latitude],
          title: `${region.name} · ${region.projectCount} 项`,
          content,
          anchor: "bottom-center",
          offset: new window.AMap.Pixel(0, 0),
          zIndex: 120 + Math.min(region.projectCount, 99),
        });
        return { content, marker, region };
      });
      const markers = markerRecords.map((record) => record.marker);
      const applyMarkerLayout = () => {
        if (!active || !map || !container.current || !markerRecords.length) return;
        window.cancelAnimationFrame(layoutFrame);
        layoutFrame = window.requestAnimationFrame(() => {
          if (!active || !map || !container.current) return;
          const size = map.getSize();
          const mobile = size.width <= 520;
          const layout = layoutMapLabels(markerRecords.map(({ content, region }) => {
            const pixel = map.lngLatToContainer(new window.AMap.LngLat(region.longitude, region.latitude));
            return {
              id: region.adcode,
              anchorX: Number(pixel.x),
              anchorY: Number(pixel.y),
              width: content.offsetWidth || (mobile ? 92 : 112),
              height: content.offsetHeight || 32,
              priority: region.projectCount,
            };
          }), {
            viewportWidth: Number(size.width),
            viewportHeight: Number(size.height),
            padding: mobile ? 10 : 16,
            bottomPadding: mobile ? 66 : 58,
            gap: mobile ? 6 : 9,
          });
          const layoutByAdcode = new Map(layout.map((item) => [item.id, item]));
          for (const { content, marker, region } of markerRecords) {
            const position = layoutByAdcode.get(region.adcode);
            if (!position) continue;
            const { offsetX, offsetY } = position;
            marker.setOffset(new window.AMap.Pixel(offsetX, offsetY));
            content.dataset.layout = "ready";
            const displaced = Math.hypot(offsetX, offsetY) > 4;
            content.classList.toggle("offset", displaced);
            if (displaced) {
              content.style.setProperty("--leader-length", `${Math.hypot(offsetX, offsetY).toFixed(1)}px`);
              content.style.setProperty("--leader-angle", `${Math.atan2(-offsetY, -offsetX) * 180 / Math.PI}deg`);
            } else {
              content.style.removeProperty("--leader-length");
              content.style.removeProperty("--leader-angle");
            }
          }
        });
      };
      map.on("complete", applyMarkerLayout);
      map.on("moveend", applyMarkerLayout);
      map.on("zoomend", applyMarkerLayout);
      map.on("resize", applyMarkerLayout);
      applyMarkerLayout();
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
              applyMarkerLayout();
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
    return () => { active = false; window.cancelAnimationFrame(layoutFrame); map?.destroy?.(); };
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

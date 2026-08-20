import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCatalog } from "../lib/catalog-context";
import { formatDate, isStaleVerification, venueTypeLabel } from "../lib/presentation";

export default function VenuesPage() {
  const model = useCatalog();
  const [params, setParams] = useSearchParams();
  const adcode = /^\d{6}$/.test(params.get("adcode") ?? "") ? params.get("adcode") ?? "" : "";
  const query = params.get("q")?.trim() ?? "";
  const venueType = params.get("type")?.trim() ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [draftAdcode, setDraftAdcode] = useState(adcode);
  const [draftQuery, setDraftQuery] = useState(query);
  const [draftType, setDraftType] = useState(venueType);
  useEffect(() => { setDraftAdcode(adcode); setDraftQuery(query); setDraftType(venueType); }, [adcode, query, venueType]);

  const selectedPlace = adcode ? model.placeByAdcode.get(adcode) ?? null : null;
  const regions = useMemo(() => model.listVenueRegions(), [model]);
  const types = useMemo(() => model.listVenueTypes(adcode || undefined), [adcode, model]);
  const scopeVenueCount = useMemo(() => model.listVenues(adcode || undefined).length, [adcode, model]);
  const filtered = useMemo(() => model.searchVenues({ adcode: adcode || undefined, query, venueType }), [adcode, model, query, venueType]);
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const today = new Date().toISOString();
  const events = model.catalog.events.filter((event) => event.recurrenceRule || !event.endsAt || event.endsAt >= today);

  function update(next: { adcode?: string; q?: string; type?: string; page?: number }) {
    const value = new URLSearchParams();
    if (next.adcode) value.set("adcode", next.adcode);
    if (next.q) value.set("q", next.q);
    if (next.type) value.set("type", next.type);
    if ((next.page ?? 1) > 1) value.set("page", String(next.page));
    setParams(value);
  }

  return (
    <div className="page-shell">
      <header className="page-hero compact-hero">
        <div className="breadcrumb"><Link to="/">全国非遗</Link><span>/</span>{selectedPlace && <><Link to={`/places/${selectedPlace.adcode}`}>{selectedPlace.name}非遗</Link><span>/</span></>}<span>非遗地点</span></div>
        <div className="eyebrow">走近正在传承的非遗</div>
        <h1 className="page-title">{selectedPlace ? `${selectedPlace.name}非遗地点` : "全国非遗地点"}</h1>
        <p className="hero-copy">收录展示场馆、保护基地、生产性保护基地、工坊与传习空间。名录身份不等于持续开放；出发前仍需核对地址和开放安排。</p>
        <div className="trust-note"><strong>{scopeVenueCount} 个地点</strong><span>{selectedPlace ? `当前查看${selectedPlace.name}；只标注到上级行政区的地点不会推测性下放` : `当前覆盖 ${regions.length} 个省级行政区；南京另有区县级核验资料`}</span></div>
      </header>

      <section className="section compact-section venue-discovery" aria-labelledby="venue-filter-heading">
        <div className="section-heading compact"><h2 id="venue-filter-heading">查找非遗地点</h2><p>可按省份、地点名称、关联项目或地点类型筛选。</p></div>
        <form className="venue-search-form" onSubmit={(event) => { event.preventDefault(); update({ adcode: draftAdcode, q: draftQuery.trim(), type: draftType }); }}>
          <label>地区<select value={draftAdcode} onChange={(event) => setDraftAdcode(event.target.value)}><option value="">全国</option>{regions.map((region) => <option value={region.adcode} key={region.adcode}>{region.name}（{region.venueCount}）</option>)}</select></label>
          <label>地点或项目<input value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder="例如「景泰蓝」" /></label>
          <label>地点类型<select value={draftType} onChange={(event) => setDraftType(event.target.value)}><option value="">全部类型</option>{types.map((item) => <option value={item.venueType} key={item.venueType}>{venueTypeLabel(item.venueType)}（{item.count}）</option>)}</select></label>
          <button className="primary-button" type="submit">查看地点</button>
          {(adcode || query || venueType) && <button className="secondary-button" type="button" onClick={() => update({})}>清除筛选</button>}
        </form>
        <nav className="filter-pills venue-type-filters" aria-label="地点类型快捷筛选">
          <button className={!venueType ? "active" : ""} onClick={() => update({ adcode, q: query })}>全部 <span>{scopeVenueCount}</span></button>
          {types.map((item) => <button className={venueType === item.venueType ? "active" : ""} onClick={() => update({ adcode, q: query, type: item.venueType })} key={item.venueType}>{venueTypeLabel(item.venueType)} <span>{item.count}</span></button>)}
        </nav>
        {!adcode && <details className="venue-region-directory"><summary>按省份查看（{regions.length}）</summary><div>{regions.map((region) => <button type="button" onClick={() => update({ adcode: region.adcode })} key={region.adcode}><span>{region.name}</span><strong>{region.venueCount} 个</strong></button>)}</div></details>}
        <div className="filter-result-summary" role="status">找到 {filtered.length} 个地点{selectedPlace ? ` · ${selectedPlace.name}` : ""}{query ? ` · 关键词「${query}」` : ""}</div>
      </section>

      {!venueType && !query && events.length > 0 && <section className="event-callout event-section" aria-labelledby="current-event-heading">
        <div><span>近期或周期活动</span><h2 id="current-event-heading">{events[0].title}</h2><p>{events[0].dateText ?? formatDate(events[0].startsAt)} · {events[0].venueName ?? events[0].placeName ?? "地点见活动页面"}</p></div>
        {events[0].eventUrl && <a className="secondary-button" href={events[0].eventUrl} target="_blank" rel="noreferrer">查看活动页面</a>}
      </section>}

      <section className="section compact-section" aria-label="非遗地点列表">
        <div className="venue-grid">
          {visible.map((venue) => {
            const stale = isStaleVerification(venue.lastVerifiedAt);
            return <Link className="venue-card" to={`/venues/${venue.id}`} key={venue.id}>
              <div className="venue-card-top"><span className="chip">{venueTypeLabel(venue.venueType)}</span><span className={`verification-dot${stale ? " stale" : ""}`}>{stale ? "开放信息待复核" : "近期已核验"}</span></div>
              <h2>{venue.name}</h2><p>{venue.address ?? "当前目录暂未提供可核验地址"}</p>
              <footer><span>{venue.placeName}</span><span>{formatDate(venue.lastVerifiedAt)}</span></footer>
            </Link>;
          })}
        </div>
        {!visible.length && <div className="empty-state"><strong>当前筛选条件下暂无地点</strong><span>可切换地区或地点类型；未核验的地址和开放信息不会推测性展示。</span></div>}
        {filtered.length > pageSize && <nav className="pagination" aria-label="非遗地点分页">
          {safePage > 1 ? <button onClick={() => update({ adcode, q: query, type: venueType, page: safePage - 1 })}>← 上一页</button> : <span aria-disabled="true">← 上一页</span>}
          <span>第 {safePage} / {totalPages} 页</span>
          {safePage < totalPages ? <button onClick={() => update({ adcode, q: query, type: venueType, page: safePage + 1 })}>下一页 →</button> : <span aria-disabled="true">下一页 →</span>}
        </nav>}
      </section>
    </div>
  );
}

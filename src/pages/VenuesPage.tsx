import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCatalog } from "../lib/catalog-context";
import { formatDate, isStaleVerification, venueTypeLabel } from "../lib/presentation";

export default function VenuesPage() {
  const model = useCatalog();
  const [params, setParams] = useSearchParams();
  const venueType = params.get("type")?.trim() ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const venues = useMemo(() => [...model.listVenues("320100")].sort((a, b) => {
    const locationRank = (venue: typeof a) => venue.longitude != null && venue.latitude != null ? 0 : venue.address ? 1 : 2;
    return locationRank(a) - locationRank(b) || String(b.lastVerifiedAt ?? "").localeCompare(String(a.lastVerifiedAt ?? "")) || a.name.localeCompare(b.name, "zh-CN");
  }), [model]);
  const types = useMemo(() => [...new Set(venues.map((venue) => venue.venueType))].map((type) => ({ type, count: venues.filter((venue) => venue.venueType === type).length })).sort((a, b) => b.count - a.count || a.type.localeCompare(b.type)), [venues]);
  const filtered = venueType ? venues.filter((venue) => venue.venueType === venueType) : venues;
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const today = new Date().toISOString();
  const events = model.catalog.events.filter((event) => event.recurrenceRule || !event.endsAt || event.endsAt >= today);

  function update(type: string, nextPage = 1) {
    const value = new URLSearchParams();
    if (type) value.set("type", type);
    if (nextPage > 1) value.set("page", String(nextPage));
    setParams(value);
  }

  return (
    <div className="page-shell">
      <header className="page-hero compact-hero">
        <div className="breadcrumb"><Link to="/">全国非遗</Link><span>/</span><Link to="/places/320100">南京非遗</Link><span>/</span><span>体验地点</span></div>
        <div className="eyebrow">走近正在传承的非遗</div>
        <h1 className="page-title">南京体验地点</h1>
        <p className="hero-copy">收录场馆、基地、工坊和传习空间。名录身份不等于当前持续开放；出发前仍需核对地点公告。</p>
        <div className="trust-note"><strong>{venues.length} 个地点</strong><span>当前收录南京地区；优先展示地址完整、近期核验的地点</span></div>
      </header>
      <section className="section compact-section" aria-labelledby="venue-filter-heading">
        <div className="section-heading compact"><h2 id="venue-filter-heading">按地点类型查看</h2><p>查看场馆、保护基地、工坊和传习空间。</p></div>
        <nav className="filter-pills venue-type-filters" aria-label="地点类型筛选">
          <button className={!venueType ? "active" : ""} onClick={() => update("")}>全部 <span>{venues.length}</span></button>
          {types.map((item) => <button className={venueType === item.type ? "active" : ""} onClick={() => update(item.type)} key={item.type}>{venueTypeLabel(item.type)} <span>{item.count}</span></button>)}
        </nav>
      </section>
      {!venueType && events.length > 0 && <section className="event-callout event-section" aria-labelledby="current-event-heading">
        <div><span>近期或周期活动</span><h2 id="current-event-heading">{events[0].title}</h2><p>{events[0].dateText ?? formatDate(events[0].startsAt)} · {events[0].venueName ?? events[0].placeName ?? "地点见活动页面"}</p></div>
        {events[0].eventUrl && <a className="secondary-button" href={events[0].eventUrl} target="_blank" rel="noreferrer">查看活动页面</a>}
      </section>}
      <section className="section compact-section">
        <div className="venue-grid">
          {visible.map((venue) => {
            const stale = isStaleVerification(venue.lastVerifiedAt);
            return <Link className="venue-card" to={`/venues/${venue.id}`} key={venue.id}>
              <div className="venue-card-top"><span className="chip">{venueTypeLabel(venue.venueType)}</span><span className={`verification-dot${stale ? " stale" : ""}`}>{stale ? "参观信息待复核" : "近期已核验"}</span></div>
              <h2>{venue.name}</h2><p>{venue.address ?? "当前目录暂未提供可核验地址"}</p>
              <footer><span>{venue.placeName}</span><span>{formatDate(venue.lastVerifiedAt)}</span></footer>
            </Link>;
          })}
        </div>
        {!visible.length && <div className="empty-state">当前类型下暂无已核验地点。</div>}
        {filtered.length > pageSize && <nav className="pagination" aria-label="体验地点分页">
          {safePage > 1 ? <button onClick={() => update(venueType, safePage - 1)}>← 上一页</button> : <span aria-disabled="true">← 上一页</span>}
          <span>第 {safePage} / {totalPages} 页</span>
          {safePage < totalPages ? <button onClick={() => update(venueType, safePage + 1)}>下一页 →</button> : <span aria-disabled="true">下一页 →</span>}
        </nav>}
      </section>
    </div>
  );
}

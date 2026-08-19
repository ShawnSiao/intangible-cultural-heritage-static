import { Link, useParams } from "react-router-dom";
import AmapSurface from "../components/AmapSurface";
import { useCatalog } from "../lib/catalog-context";
import { coordinatePrecisionLabel, formatDate, isStaleVerification, venueTypeLabel } from "../lib/presentation";

export default function VenuePage() {
  const { id = "" } = useParams();
  const model = useCatalog();
  const venue = model.getVenue(id);
  if (!venue) return <div className="page-shell"><div className="empty-state"><strong>未找到对应体验地点</strong><span>该地点不在当前静态目录中。</span></div></div>;
  const center = venue.longitude != null && venue.latitude != null ? [venue.longitude, venue.latitude] as [number, number] : null;
  const stale = isStaleVerification(venue.lastVerifiedAt);
  const hasAddress = Boolean(venue.address?.trim());
  const heritage = venue.heritageIds.map((heritageId) => model.getHeritage(heritageId)).filter((item) => item !== null);
  return (
    <div className="page-shell">
      <header className="page-hero compact-hero venue-hero">
        <div className="breadcrumb"><Link to="/places/320100">南京非遗</Link><span>/</span><Link to="/venues">体验地点</Link><span>/</span><span>{venue.name}</span></div>
        <div className="eyebrow">{venueTypeLabel(venue.venueType)}</div><h1 className="page-title">{venue.name}</h1>
        <p className="hero-copy">{venue.address ?? "当前目录暂未提供可核验地址"}</p>
        <div className="verification-status-grid"><div className="verified"><span>名录身份</span><strong>已记录</strong></div><div className={hasAddress ? "verified" : "pending"}><span>地址</span><strong>{hasAddress ? "已记录" : "待补充"}</strong></div><div className={center ? "verified" : "pending"}><span>地图坐标</span><strong>{center ? "已核验" : "待核验"}</strong></div><div className={stale ? "pending" : "verified"}><span>参观信息</span><strong>{stale ? "待复核" : "近期核验"}</strong></div></div>
        <p className="verification-note">{stale ? `最近记录于 ${formatDate(venue.lastVerifiedAt)}，出发前需查看地点公告。` : "开放安排可能变化，出发前仍需确认。"}</p>
      </header>
      <div className="detail-layout">
        <div>
          <AmapSurface center={center} label={venue.name} compact showCenterMarker={Boolean(center)} fallbackTitle="尚无可展示的地图坐标" fallbackDescription="地点名录和参观说明仍可浏览。行政区中心不会代替地点坐标。" />
          <section className="section compact-section"><h2>参观说明</h2><p className="detail-body">{venue.visitNote || venue.openingNote || "当前目录未提供稳定开放安排，出发前需另行确认。"}</p></section>
          <section className="section compact-section"><div className="section-heading compact"><h2>关联非遗项目</h2><p>仅展示已经确认的地点与项目关系。</p></div>{heritage.length > 0 ? <div className="list">{heritage.map((item) => <Link className="list-card" to={`/heritage/${item.id}`} key={item.id}><div className="number">关联</div><div><h3>{item.name}</h3><p>{item.category}</p></div><span className="chip">查看项目</span></Link>)}</div> : <div className="empty-state compact-empty">当前尚无已经确认的非遗项目关系。</div>}</section>
        </div>
        <aside className="detail-aside">
          <div className="passport-row"><span>地点类型</span><strong>{venueTypeLabel(venue.venueType)}</strong></div>
          <div className="passport-row"><span>位置可信度</span><strong>{coordinatePrecisionLabel(venue.coordinatePrecision)}</strong></div>
          <div className="passport-row"><span>最近核验</span><strong>{formatDate(venue.lastVerifiedAt)}</strong></div>
          <div className="passport-row"><span>所在地区</span><strong>{venue.placeName}</strong></div>
          {venue.visitUrl && <a className="passport-row" href={venue.visitUrl} target="_blank" rel="noreferrer"><span>出发前确认</span><strong>打开参观页面 →</strong></a>}
        </aside>
      </div>
    </div>
  );
}

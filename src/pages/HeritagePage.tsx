import { Link, useParams, useSearchParams } from "react-router-dom";
import { useCatalog } from "../lib/catalog-context";
import { descriptionParagraphs, normalizeBatchLabel, venueTypeLabel } from "../lib/presentation";

export default function HeritagePage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const model = useCatalog();
  const item = model.getHeritage(id);
  if (!item) return <div className="page-shell"><div className="empty-state"><strong>未找到对应非遗项目</strong><span>该项目不在当前静态目录中。</span></div></div>;
  const view = params.get("view") === "graph" ? "graph" : "story";
  const paragraphs = descriptionParagraphs(item.description || item.summary);
  const venues = item.venueIds.map((venueId) => model.getVenue(venueId)).filter((venue) => venue !== null);
  const basisLabel = item.level === "国家级" ? "国家级公开名录" : item.level === "UNESCO" ? "国际名录补充资料" : item.level.includes("江苏") ? "江苏地方名录" : item.level.includes("南京") ? "南京地方名录" : "公开名录资料";
  return (
    <div className="page-shell">
      <header className="page-hero compact-hero heritage-hero">
        <div className="breadcrumb"><Link to="/">全国非遗</Link><span>/</span>{item.adcode && <Link to={`/places/${item.adcode}`}>{item.placeName}</Link>}<span>/</span><span>{item.name}</span></div>
        <div className="eyebrow">{item.category} · {item.level}</div>
        <h1 className="page-title">{item.name}</h1>
        <p className="hero-copy">{item.regionText} · {item.itemNumber ?? "项目编号待补充"}</p>
      </header>
      <div className="detail-layout">
        <article>
          <div className="view-tabs" aria-label="项目内容">
            <Link className={view === "story" ? "active" : ""} to={`/heritage/${id}?view=story`}>项目介绍</Link>
            <Link className={view === "graph" ? "active" : ""} to={`/heritage/${id}?view=graph`}>传承人与地点</Link>
          </div>
          {view === "story" ? <div className="detail-body story-body">
            <dl className="project-facts"><div><dt>门类</dt><dd>{item.category}</dd></div><div><dt>名录级别</dt><dd>{item.level}</dd></div><div><dt>申报地区</dt><dd>{item.regionText || "待核验"}</dd></div><div><dt>保护单位</dt><dd>{item.protectionUnit || "待核验"}</dd></div></dl>
            <h2>项目介绍</h2>
            {paragraphs.length ? paragraphs.map((paragraph, index) => <p className={index === 0 ? "story-lead" : undefined} key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>) : <p>当前目录暂未收录项目说明。</p>}
          </div> : <div className="relation-graph" aria-label={`${item.name}的传承人与相关地点`}>
            <div className="relation-hub"><span>当前项目</span><strong>传承关系</strong><small>{item.category} · {item.level}</small></div>
            <div className="relation-spokes">
              <section className="relation-card inheritors"><h3>代表性传承人</h3><ul>{item.inheritors.length ? item.inheritors.map((person, index) => <li key={`${person.name}-${index}`}><strong>{person.name}</strong><span>{normalizeBatchLabel(person.batch)}</span></li>) : <li><span>当前目录未关联传承人</span></li>}</ul></section>
              <section className="relation-card venues"><h3>体验地点</h3><ul>{venues.length ? venues.map((venue) => <li key={venue.id}><Link to={`/venues/${venue.id}`}><strong>{venue.name}</strong><span>{venueTypeLabel(venue.venueType)}</span></Link></li>) : <li><span>尚无已确认的体验地点关系</span></li>}</ul></section>
              <section className="relation-card region"><h3>申报地区</h3><ul><li>{item.adcode ? <Link to={`/places/${item.adcode}`}><strong>{item.regionText || item.placeName}</strong><span>查看{item.placeName}非遗 →</span></Link> : <><strong>{item.regionText || "待核验"}</strong><span>地区关系待补充</span></>}</li></ul></section>
              <section className="relation-card organization"><h3>保护单位</h3><ul><li><strong>{item.protectionUnit || "待核验"}</strong><span>保护与传承责任主体</span></li></ul></section>
            </div>
          </div>}
        </article>
        <aside className="detail-aside" aria-label="项目资料">
          <div className="passport-row"><span>资料依据</span><strong>{basisLabel}</strong></div>
          <div className="passport-row"><span>名录级别</span><strong>{item.level}</strong></div>
          <div className="passport-row"><span>项目编号</span><strong>{item.itemNumber ?? "待补充"}</strong></div>
          <div className="passport-row"><span>批次</span><strong>{item.batch ?? "待核验"}</strong></div>
          <div className="passport-row"><span>最近核验</span><strong>{item.verifiedAt?.slice(0, 10) ?? "待核验"}</strong></div>
          <div className="passport-row"><span>收录范围</span><strong>{item.adcode?.startsWith("3201") ? "南京多级资料" : "国家级名录"}</strong></div>
          <Link className="passport-row" to="/sources#projects"><span>关联规则</span><strong>查看项目与地区的归类口径 →</strong></Link>
        </aside>
      </div>
    </div>
  );
}

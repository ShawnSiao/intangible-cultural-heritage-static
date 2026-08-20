import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import AmapSurface from "../components/AmapSurface";
import { useCatalog } from "../lib/catalog-context";
import { formatDate, placeLevelLabel, venueTypeLabel } from "../lib/presentation";
import type { HeritageRecord } from "../types";

const categories = ["民间文学", "传统音乐", "传统舞蹈", "传统戏剧", "曲艺", "传统体育、游艺与杂技", "传统美术", "传统技艺", "传统医药", "民俗"];

export default function PlacePage() {
  const { adcode = "" } = useParams();
  const [params] = useSearchParams();
  const model = useCatalog();
  const place = model.getPlace(adcode);
  if (adcode === "100000") return <Navigate to="/" replace />;
  if (!place) return <div className="page-shell"><div className="empty-state"><strong>未找到对应地区</strong><span>该行政区不在当前静态目录中。</span></div></div>;

  const deep = place.coverageLevel === "nanjing_deep";
  const mixedCoverage = !deep && place.containsDeepCoverage;
  const childLevels = [...new Set(place.children.map((child) => child.level))];
  const childRegionLabel = childLevels.length === 1
    ? childLevels[0] === "city" ? "各地级行政区" : childLevels[0] === "district" ? "各区县" : "下级地区"
    : "下级行政区";
  const deepCoverageDescription = place.children.length
    ? `可继续查看${childRegionLabel}、代表性传承人和体验地点`
    : "可查看非遗项目、代表性传承人和体验地点";
  const childrenWithProjects = place.children.filter((child) => child.projectCount > 0);
  const childrenWithoutProjects = place.children.filter((child) => child.projectCount === 0);
  const childProjectCount = place.children.reduce((sum, child) => sum + child.projectCount, 0);
  const directOnly = params.get("scope") === "direct";
  const projectCategories = directOnly ? place.directCategories : place.categories;
  const projectScopeCount = directOnly ? place.directProjectCount : place.projectCount;
  const childProjectCountLabel = childLevels.length === 1 && childLevels[0] === "district"
    ? "区县标签合计"
    : childLevels.length === 1 && childLevels[0] === "city"
      ? "地级行政区合计"
      : "下级行政区合计";
  const coordinate = place.longitude != null && place.latitude != null
    ? [place.longitude, place.latitude] as [number, number]
    : null;
  const placeVenues = model.searchVenues({ adcode }).slice(0, 4);

  return (
    <div className="page-shell">
      <header className="page-hero compact-hero">
        <div className="breadcrumb"><Link to="/">全国非遗</Link><span>/</span>{place.parent && <><Link to={place.parent.adcode === "100000" ? "/" : `/places/${place.parent.adcode}`}>{place.parent.name === "中华人民共和国" ? "全国" : place.parent.name}</Link><span>/</span></>}<span>{place.name}</span></div>
        <h1 className="page-title">{place.name}非遗</h1>
        <div className={`coverage-banner ${deep || mixedCoverage ? "deep" : ""}`}>
          <strong>{deep ? "南京多级非遗资料" : mixedCoverage ? "国家级名录与全国基地，南京资料更完整" : "当前收录国家级项目与传承人"}</strong>
          <span>{deep ? deepCoverageDescription : mixedCoverage ? "全省可查看国家级项目、传承人与生产性保护基地；南京另补充省级、市级资料" : place.venueCount > 0 ? "已核验的生产性保护基地显示在本地区；地方各级名录正在逐步补充" : "只标注到上级行政区的基地不会推测性下放；地方级资料正在逐步补充"}</span>
        </div>
      </header>
      <nav className="page-jumps" aria-label="本页内容">
        <Link to={`/places/${adcode}#region-map`}>地区地图</Link>
        <Link to={`/places/${adcode}#projects`}>非遗项目</Link>
        {placeVenues.length > 0 && <Link to={`/places/${adcode}#venues`}>非遗地点</Link>}
        {place.children.length > 0 && <Link to={`/places/${adcode}#region-list`}>地区列表</Link>}
        <Link to={`/places/${adcode}#categories`}>门类概览</Link>
      </nav>
      <section className="section region-map-section" id="region-map" aria-labelledby="drilldown-heading">
        <div className="section-heading compact"><h2 id="drilldown-heading">{place.children.length ? `查看${childRegionLabel}非遗` : `${place.name}地图`}</h2><p>{place.children.length ? `共 ${place.children.length} 个地区。地图优先标注已有非遗记录的地区；完整行政区列表见本页下方。` : "当前没有更细一级的地区资料，地图展示该行政区所在位置。"}</p></div>
        <AmapSurface boundaryAdcode={adcode} boundaryLevel={place.level} center={coordinate} label={place.name} regions={childrenWithProjects} compact={!place.children.length} fallbackDescription="地区与项目列表仍可浏览。行政区中心只用于地图定位，不代表非遗项目的精确位置。" />
        {place.children.length > 0 && place.directProjectCount > 0 && <div className="region-count-reconciliation" role="note" aria-label={`${place.name}项目统计口径`}>
          <div><span>项目总数</span><strong>{place.projectCount} 项</strong></div>
          <b aria-hidden="true">=</b>
          <div><span>{childProjectCountLabel}</span><strong>{childProjectCount} 项</strong></div>
          <b aria-hidden="true">+</b>
          <Link to={`/places/${adcode}?scope=direct#projects`}><span>申报地区仅到{place.name}</span><strong>{place.directProjectCount} 项</strong><small>查看项目 →</small></Link>
          <p>这部分项目归属{place.name}，但申报地区未细分到{childRegionLabel.replace("各", "")}；地图不将其推测性分配给下级行政区。</p>
        </div>}
        {!place.children.length && <div className="coverage-limit"><strong>当前收录到{placeLevelLabel(place.level)}层级</strong><span>尚未收录街道、乡镇或村级归属；行政区中心不作为项目位置。</span></div>}
      </section>
      <section className="region-overview" aria-labelledby="region-overview-heading">
        <div className="region-overview-heading"><div><span>{placeLevelLabel(place.level)}非遗一览</span><h2 id="region-overview-heading">{place.projectCount} 个非遗项目</h2></div><p>{place.dominantCategory ? `${place.name}当前收录项目中，${place.dominantCategory}数量最多。` : `${place.name}当前收录范围内尚无项目记录。`}项目按申报地区归类，具体体验地点会另行标注。</p></div>
        <div className="overview-stats">
          <div><strong>{place.projectCount}</strong><span>非遗项目</span></div>
          <div><strong>{place.categoryCount}</strong><span>非遗分类</span></div>
          <div><strong>{place.inheritorCount}</strong><span>代表性传承人</span></div>
          <Link to={`/venues?adcode=${adcode}`}><strong>{place.venueCount}</strong><span>非遗地点</span></Link>
        </div>
        <div className="overview-content">
          <div><h3>主要非遗门类</h3><div className="overview-categories">{place.categories.slice(0, 6).map((entry) => <Link to={`/places/${adcode}?category=${encodeURIComponent(entry.category)}#projects`} key={entry.category}><span>{entry.category}</span><strong>{entry.count}</strong></Link>)}</div></div>
          <div><h3>代表性非遗项目</h3><div className="overview-projects">{place.representativeProjects.length ? place.representativeProjects.map((project) => <Link to={`/heritage/${project.id}`} key={project.id}><span>{project.name}</span><small>{project.level}</small></Link>) : <p>当前暂无可展示项目名称。</p>}</div></div>
        </div>
      </section>
      {placeVenues.length > 0 && <section className="section compact-section region-venues" id="venues" aria-labelledby="region-venues-heading">
        <div className="section-heading compact"><h2 id="region-venues-heading">{place.name}非遗地点</h2><p>展示场馆、基地、工坊与传习空间。没有可靠地址或开放安排的地点会明确标注。</p></div>
        <div className="venue-grid compact-venue-grid">{placeVenues.map((venue) => <Link className="venue-card" to={`/venues/${venue.id}`} key={venue.id}><div className="venue-card-top"><span className="chip">{venueTypeLabel(venue.venueType)}</span><span>{formatDate(venue.lastVerifiedAt)}</span></div><h3>{venue.name}</h3><p>{venue.address ?? "当前目录暂未提供可核验地址"}</p><footer><span>{venue.placeName}</span><span>查看详情 →</span></footer></Link>)}</div>
        <Link className="secondary-button region-venue-link" to={`/venues?adcode=${adcode}`}>查看{place.name}全部 {place.venueCount} 个地点</Link>
      </section>}
      <ProjectBrowser adcode={adcode} placeName={place.name} items={model.listHeritage(adcode, directOnly ? "direct" : "descendants")} categoryCounts={projectCategories} directOnly={directOnly} projectCount={place.projectCount} scopeCount={projectScopeCount} />
      {place.children.length > 0 && <section className="section region-list-section" id="region-list" aria-labelledby="region-list-heading">
        <div className="section-heading compact"><h2 id="region-list-heading">地区列表</h2><p>优先展示已有非遗记录的地区；暂无项目记录的地区收纳在列表末尾。</p></div>
        {childrenWithProjects.length > 0 && <div className="region-grid" aria-label={`${place.name}有非遗记录的下级行政区`}>
          {childrenWithProjects.map((child) => <article className="region-card" key={child.adcode}>
            <Link className="region-card-main" to={`/places/${child.adcode}`}>
              <div><span>{placeLevelLabel(child.level)}</span><strong>{child.projectCount} 项</strong></div>
              <h3>{child.name}</h3><p>{child.description}</p><small>查看{child.name}非遗 →</small>
            </Link>
            <div className="region-project-names">{child.representativeProjects.length ? child.representativeProjects.map((project) => <Link to={`/heritage/${project.id}`} key={project.id}>{project.name}</Link>) : <span>当前暂无项目名称</span>}</div>
          </article>)}
        </div>}
        {childrenWithProjects.length === 0 && <div className="empty-state region-empty"><strong>当前收录范围内暂无项目</strong><span>仍可查看下级行政区名称；地方名录正在逐步补充。</span></div>}
        {childrenWithoutProjects.length > 0 && <details className="empty-region-details"><summary>查看暂无项目记录的地区（{childrenWithoutProjects.length}）</summary><div>{childrenWithoutProjects.map((child) => <Link to={`/places/${child.adcode}`} key={child.adcode}><span>{child.name}</span><small>{placeLevelLabel(child.level)}</small></Link>)}</div></details>}
      </section>}
    </div>
  );
}

function ProjectBrowser({ adcode, placeName, items, categoryCounts, directOnly, projectCount, scopeCount }: { adcode: string; placeName: string; items: HeritageRecord[]; categoryCounts: Array<{ category: string; count: number }>; directOnly: boolean; projectCount: number; scopeCount: number }) {
  const [params, setParams] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const category = params.get("category")?.trim() ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [draftQuery, setDraftQuery] = useState(query);
  const [draftCategory, setDraftCategory] = useState(category);
  useEffect(() => { setDraftQuery(query); setDraftCategory(category); }, [category, query]);

  const filtered = useMemo(() => items.filter((item) => {
    const matchesCategory = !category || item.category === category;
    const haystack = `${item.name}\n${item.regionText ?? ""}\n${item.protectionUnit ?? ""}`.toLocaleLowerCase("zh-CN");
    return matchesCategory && (!query || haystack.includes(query.toLocaleLowerCase("zh-CN")));
  }).sort((a, b) => String(a.itemNumber ?? "").localeCompare(String(b.itemNumber ?? ""), "zh-CN") || a.name.localeCompare(b.name, "zh-CN")), [category, items, query]);
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function update(next: { q?: string; category?: string; page?: number }) {
    const value = new URLSearchParams();
    if (directOnly) value.set("scope", "direct");
    if (next.q) value.set("q", next.q);
    if (next.category) value.set("category", next.category);
    if ((next.page ?? 1) > 1) value.set("page", String(next.page));
    setParams(value);
    window.setTimeout(() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  return (
    <section className="section project-browser" id="projects" aria-labelledby="project-heading">
      <div className="section-heading compact"><h2 id="project-heading">{directOnly ? `申报地区仅到${placeName}的项目` : "非遗项目"}</h2><p>{directOnly ? `当前只显示归属${placeName}、尚未细分到下级行政区的项目。` : "按名称、申报地区或门类查找。筛选和翻页均在浏览器内完成。"}</p></div>
      {directOnly && <div className="project-scope-note" role="status"><span>当前范围：{placeName}本级归属，共 {scopeCount} 项</span><Link to={`/places/${adcode}#projects`}>查看{placeName}全部 {projectCount} 项</Link></div>}
      <nav className="filter-pills category-filters" id="categories" aria-label="非遗门类快捷筛选">
        <button className={!category ? "active" : ""} onClick={() => update({ q: query })}>全部门类 <span>{scopeCount}</span></button>
        {categories.map((name) => <button className={category === name ? "active" : ""} onClick={() => update({ q: query, category: name })} key={name} aria-current={category === name ? "page" : undefined}>{name} <span>{categoryCounts.find((entry) => entry.category === name)?.count ?? 0}</span></button>)}
      </nav>
      <div className="content-grid">
        <form className="filters" onSubmit={(event) => { event.preventDefault(); update({ q: draftQuery.trim(), category: draftCategory }); }}>
          <label>项目名称或地区<input value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder="例如「云锦」" /></label>
          <label>门类<select value={draftCategory} onChange={(event) => setDraftCategory(event.target.value)}><option value="">全部门类</option>{categories.map((name) => <option key={name}>{name}</option>)}</select></label>
          <button className="primary-button" type="submit">筛选项目</button>
          {(query || category) && <button className="secondary-button" type="button" onClick={() => update({})}>清除筛选</button>}
          <small>找到 {filtered.length} 个项目</small>
        </form>
        <div className="list" aria-label="非遗项目列表">
          {visible.map((item) => <Link className="list-card" to={`/heritage/${item.id}`} key={item.id}>
            <div className="number">{item.itemNumber ?? "—"}</div>
            <div><h3>{item.name}</h3><dl className="list-metadata"><div><dt>申报地区</dt><dd>{item.regionText ?? "待核验"}</dd></div><div><dt>保护单位</dt><dd>{item.protectionUnit ?? "待核验"}</dd></div></dl></div>
            <span className="card-chips"><span className="chip">{item.level}</span><span className="chip">{item.category}</span></span>
          </Link>)}
          {!visible.length && <div className="list-card"><p>当前筛选条件下未找到项目。</p></div>}
          {filtered.length > pageSize && <nav className="pagination" aria-label="项目列表分页">
            {safePage > 1 ? <button onClick={() => update({ q: query, category, page: safePage - 1 })}>← 上一页</button> : <span aria-disabled="true">← 上一页</span>}
            <span>第 {safePage} / {totalPages} 页</span>
            {safePage < totalPages ? <button onClick={() => update({ q: query, category, page: safePage + 1 })}>下一页 →</button> : <span aria-disabled="true">下一页 →</span>}
          </nav>}
        </div>
      </div>
    </section>
  );
}

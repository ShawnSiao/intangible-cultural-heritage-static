import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCatalog } from "../lib/catalog-context";

const categories = ["民间文学", "传统音乐", "传统舞蹈", "传统戏剧", "曲艺", "传统体育、游艺与杂技", "传统美术", "传统技艺", "传统医药", "民俗"];

export default function UnmappedHeritagePage() {
  const model = useCatalog();
  const [params, setParams] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const category = params.get("category")?.trim() ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [draftQuery, setDraftQuery] = useState(query);
  const [draftCategory, setDraftCategory] = useState(category);
  const summary = model.getUnmappedHeritageSummary();
  const items = model.listUnmappedHeritage();

  useEffect(() => {
    setDraftQuery(query);
    setDraftCategory(category);
  }, [category, query]);

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
    if (next.q) value.set("q", next.q);
    if (next.category) value.set("category", next.category);
    if ((next.page ?? 1) > 1) value.set("page", String(next.page));
    setParams(value);
    window.setTimeout(() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  return (
    <div className="page-shell">
      <header className="page-hero compact-hero">
        <div className="breadcrumb"><Link to="/">全国非遗</Link><span>/</span><span>未按现行行政区归类的项目</span></div>
        <h1 className="page-title">全国及非行政区申报项目</h1>
        <div className="coverage-banner">
          <strong>保留申报主体原文</strong>
          <span>部分国家级项目由中央单位、行业机构、兵团或历史地区名称申报。静态目录保留申报文字，不推测性分配到省、市或区县。</span>
        </div>
      </header>
      <section className="section project-browser" id="projects" aria-labelledby="project-heading">
        <div className="section-heading compact"><h2 id="project-heading">未进入省市区地图的项目</h2><p>当前共 {summary.projectCount} 项。项目仍可查看详情、申报主体与保护单位。</p></div>
        <nav className="filter-pills category-filters" aria-label="非遗门类快捷筛选">
          <button className={!category ? "active" : ""} onClick={() => update({ q: query })}>全部门类 <span>{summary.projectCount}</span></button>
          {categories.map((name) => <button className={category === name ? "active" : ""} onClick={() => update({ q: query, category: name })} key={name} aria-current={category === name ? "page" : undefined}>{name} <span>{summary.categories.find((entry) => entry.category === name)?.count ?? 0}</span></button>)}
        </nav>
        <div className="content-grid">
          <form className="filters" onSubmit={(event) => { event.preventDefault(); update({ q: draftQuery.trim(), category: draftCategory }); }}>
            <label>项目名称或申报主体<input value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder="例如「故宫博物院」" /></label>
            <label>门类<select value={draftCategory} onChange={(event) => setDraftCategory(event.target.value)}><option value="">全部门类</option>{categories.map((name) => <option key={name}>{name}</option>)}</select></label>
            <button className="primary-button" type="submit">筛选项目</button>
            {(query || category) && <button className="secondary-button" type="button" onClick={() => update({})}>清除筛选</button>}
            <small>找到 {filtered.length} 个项目</small>
          </form>
          <div className="list" aria-label="未按现行行政区归类的非遗项目列表">
            {visible.map((item) => <Link className="list-card" to={`/heritage/${item.id}`} key={item.id}>
              <div className="number">{item.itemNumber ?? "—"}</div>
              <div><h3>{item.name}</h3><dl className="list-metadata"><div><dt>申报主体</dt><dd>{item.regionText ?? "待核验"}</dd></div><div><dt>保护单位</dt><dd>{item.protectionUnit ?? "待核验"}</dd></div></dl></div>
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
    </div>
  );
}

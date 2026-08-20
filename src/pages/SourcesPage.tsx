import { Link } from "react-router-dom";
import { useCatalog } from "../lib/catalog-context";

export default function SourcesPage() {
  const model = useCatalog();
  const { stats } = model.catalog;
  const supplementaryCount = stats.heritageCount - stats.nationalProjectCount;
  const linkedVenueCount = model.catalog.venues.filter((venue) => venue.heritageIds.length > 0).length;
  return (
    <div className="page-shell">
      <header className="page-hero compact-hero source-hero">
        <div className="breadcrumb"><Link to="/">全国非遗</Link><span>/</span><span>资料依据</span></div>
        <div className="eyebrow">公开产品的数据口径</div>
        <h1 className="page-title">资料依据与关联规则</h1>
        <p className="hero-copy">本页说明地图、项目、传承人与非遗地点如何关联。静态站只发布产品展示所需字段，不公开原始快照、内部来源标识、采集地址、审核记录或处理日志。</p>
      </header>
      <section className="section compact-section" aria-labelledby="basis-heading">
        <div className="section-heading compact"><h2 id="basis-heading">当前公开范围</h2><p>详情页中的「资料依据」会回到对应口径，不把内部采集过程暴露为产品内容。</p></div>
        <div className="source-grid basis-grid">
          <article className="source-summary-card" id="projects"><div><span className="chip">项目</span><strong>{stats.nationalProjectCount}</strong></div><h2>国家级项目与传承人</h2><p>项目按公开名录中的申报地区归类；只标注到省或市的项目保留在该级行政区，不推测性下放。</p><small>{stats.nationalInheritorCount} 名国家级代表性传承人</small></article>
          <article className="source-summary-card" id="supplement"><div><span className="chip">补充</span><strong>{supplementaryCount}</strong></div><h2>地方与国际补充资料</h2><p>江苏、南京和国际名录补充记录保留各自级别。不同层级的同名项目不自动合并。</p><small>详情页明确显示名录级别与收录范围</small></article>
          <article className="source-summary-card" id="venues"><div><span className="chip">地点</span><strong>{stats.venueCount}</strong></div><h2>全国非遗地点</h2><p>场馆、基地、工坊与传习空间按已核验行政区关联。没有可靠地址或坐标时，只展示所属行政区范围。</p><small>{linkedVenueCount} 个地点已关联非遗项目</small></article>
          <article className="source-summary-card" id="regions"><div><span className="chip">地区</span><strong>{stats.provinceCount}</strong></div><h2>行政区与地图边界</h2><p>行政区中心只用于地图定位和下钻；不代表非遗项目或体验地点的精确位置。</p><small>{stats.placeCount} 条行政区记录</small></article>
        </div>
      </section>
      <section className="source-card methodology-note" aria-labelledby="public-boundary-heading">
        <h2 id="public-boundary-heading">公开边界</h2>
        <dl><dt>公开展示</dt><dd>项目名称、名录级别、申报地区、保护单位、代表性传承人关系、地点名称、地点类型、可核验地址和核验日期。</dd><dt>不公开</dt><dd>原始文件、内部来源标识、采集地址、快照校验值、导入批次、审核问题和处理日志。</dd><dt>出行链接</dt><dd>仅保留面向参观者的场馆或活动页面；仅用于证明名单出处的地址不进入公开目录。</dd></dl>
      </section>
    </div>
  );
}

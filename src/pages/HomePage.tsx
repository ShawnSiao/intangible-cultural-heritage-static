import { Link } from "react-router-dom";
import HomeExplorer from "../components/HomeExplorer";
import { useCatalog } from "../lib/catalog-context";

export default function HomePage() {
  const model = useCatalog();
  const summary = model.getMapSummary();
  const unmapped = model.getUnmappedHeritageSummary();
  const nanjing = model.getPlace("320100");
  const { stats } = model.catalog;
  const mappedNationalProjects = stats.nationalProjectCount - unmapped.nationalProjectCount;
  return (
    <div className="page-shell">
      <HomeExplorer provinces={summary} nationalProjectCount={stats.nationalProjectCount} categoryCount={stats.categoryCount} />
      <section className="section" aria-labelledby="coverage-heading">
        <div className="section-heading">
          <h2 id="coverage-heading">全国非遗一览</h2>
          <p>全国地图收录国家级非遗名录。选择省份后，可继续查看城市、区县、非遗项目、代表性传承人与体验地点。江苏补充省级项目，南京补充市级项目和已核验体验地点；各地区页会说明当前收录范围。</p>
        </div>
        <div className="stat-strip">
          <div className="stat"><strong>{stats.nationalProjectCount}</strong><span>国家级项目（按地区子项计）</span></div>
          <div className="stat"><strong>{summary.length}</strong><span>省级行政区</span></div>
          <div className="stat"><strong>{stats.nationalInheritorCount}</strong><span>国家级代表性传承人</span></div>
          <div className="stat"><strong>{stats.categoryCount}</strong><span>非遗门类</span></div>
        </div>
        {unmapped.nationalProjectCount > 0 && <div className="region-count-reconciliation national-count-reconciliation" role="note" aria-label="全国国家级项目统计口径">
          <div><span>国家级项目总数</span><strong>{stats.nationalProjectCount} 项</strong></div>
          <b aria-hidden="true">=</b>
          <div><span>省市区地图已归类</span><strong>{mappedNationalProjects} 项</strong></div>
          <b aria-hidden="true">+</b>
          <Link to="/heritage"><span>未按现行行政区归类</span><strong>{unmapped.nationalProjectCount} 项</strong><small>查看项目 →</small></Link>
          <p>后一组保留中央单位、行业机构、兵团和历史地区名称等申报文字，不推测性分配到省市区。</p>
        </div>}
      </section>
      <section className="section city-feature">
        <div className="section-heading">
          <h2>南京非遗</h2>
          <p>南京已收录 {nanjing?.projectCount ?? 0} 个国家级、省级和市级非遗项目，涵盖 {nanjing?.categoryCount ?? 0} 个门类，并整理了 {stats.venueCount} 个可进一步了解的场馆、基地、工坊与传习空间。</p>
        </div>
        <div className="city-feature-content">
          <div className="city-projects" aria-label="南京代表性非遗项目">
            {nanjing?.representativeProjects.map((project) => <Link to={`/heritage/${project.id}`} key={project.id}><span>{project.category}</span><strong>{project.name}</strong></Link>)}
          </div>
          <Link className="primary-button" to="/places/320100">浏览南京非遗</Link>
        </div>
      </section>
    </div>
  );
}

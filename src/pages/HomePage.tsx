import { Link } from "react-router-dom";
import HomeExplorer from "../components/HomeExplorer";
import { useCatalog } from "../lib/catalog-context";

export default function HomePage() {
  const model = useCatalog();
  const summary = model.getMapSummary();
  const venueRegions = model.listVenueRegions();
  const featuredVenueRegions = venueRegions.slice(0, 6).map((region) => ({
    ...region,
    projectCount: summary.find((place) => place.adcode === region.adcode)?.projectCount ?? 0,
  }));
  const unmapped = model.getUnmappedHeritageSummary();
  const { stats } = model.catalog;
  const mappedNationalProjects = stats.nationalProjectCount - unmapped.nationalProjectCount;
  return (
    <div className="page-shell">
      <HomeExplorer provinces={summary} nationalProjectCount={stats.nationalProjectCount} categoryCount={stats.categoryCount} />
      <section className="section" aria-labelledby="coverage-heading">
        <div className="section-heading">
          <h2 id="coverage-heading">全国非遗一览</h2>
          <p>全国地图收录国家级非遗项目与代表性传承人。选择省份后，可继续查看城市、区县和项目详情；非遗地点显示在对应行政区。江苏与南京另有地方级名录，各地区页会说明当前收录范围。</p>
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
      <section className="section city-feature national-venue-feature" aria-labelledby="national-venue-heading">
        <div className="section-heading">
          <h2 id="national-venue-heading">从项目走到非遗地点</h2>
          <p>当前收录 {stats.venueCount} 个场馆、基地、工坊与传习空间，覆盖 {venueRegions.length} 个省级行政区。没有可靠地址或开放安排的地点会明确标注「待复核」。</p>
        </div>
        <div className="city-feature-content">
          <div className="city-projects" aria-label="已有非遗地点的地区">
            {featuredVenueRegions.map((region) => <Link to={`/venues?adcode=${region.adcode}`} key={region.adcode}><span>{region.projectCount} 个国家级项目</span><strong>{region.name}</strong><small>{region.venueCount} 个非遗地点</small></Link>)}
          </div>
          <Link className="primary-button" to="/venues">浏览全国非遗地点</Link>
        </div>
      </section>
    </div>
  );
}

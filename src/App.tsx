import { useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import HeritagePage from "./pages/HeritagePage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import PlacePage from "./pages/PlacePage";
import VenuePage from "./pages/VenuePage";
import VenuesPage from "./pages/VenuesPage";

function ScrollManager() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      window.setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 0);
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location.hash, location.pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">非遗</span>
          <span>中国非遗地图</span>
        </Link>
        <nav className="site-nav" aria-label="主导航">
          <Link to="/">全国非遗</Link>
          <Link to="/places/320100">南京非遗</Link>
          <Link to="/venues">体验地点</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/places/:adcode" element={<PlacePage />} />
          <Route path="/heritage/:id" element={<HeritagePage />} />
          <Route path="/venues" element={<VenuesPage />} />
          <Route path="/venues/:id" element={<VenuePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="footer">本静态站只展示已收录的公开项目、行政区与体验地点，不包含采集、审核或处理记录。</footer>
    </>
  );
}

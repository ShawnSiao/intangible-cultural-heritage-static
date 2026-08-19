import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="page-shell">
      <div className="empty-state">
        <strong>未找到对应内容</strong>
        <span>该页面不在当前静态目录中。</span>
        <Link className="primary-button" to="/">返回全国非遗</Link>
      </div>
    </div>
  );
}

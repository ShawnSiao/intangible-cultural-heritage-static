import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { PublicCatalog } from "../types";
import { CatalogModel } from "./catalog-model";

const CatalogContext = createContext<CatalogModel | null>(null);

function isCatalog(value: unknown): value is PublicCatalog {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PublicCatalog>;
  return candidate.version === 1
    && Array.isArray(candidate.places)
    && Array.isArray(candidate.heritage)
    && Array.isArray(candidate.venues)
    && Array.isArray(candidate.events);
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<CatalogModel | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/catalog.json`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`目录加载失败：${response.status}`);
        const data: unknown = await response.json();
        if (!isCatalog(data)) throw new Error("目录结构无效");
        setModel(new CatalogModel(data));
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(true);
      });
    return () => controller.abort();
  }, []);

  if (error) {
    return <main className="page-shell"><div className="empty-state"><strong>产品目录未能加载</strong><span>可刷新页面后重试。</span></div></main>;
  }
  if (!model) {
    return <main className="page-shell"><div className="empty-state"><strong>正在加载中国非遗地图</strong><span>首次打开需要读取静态产品目录。</span></div></main>;
  }
  return <CatalogContext.Provider value={model}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("CatalogProvider is missing");
  return value;
}

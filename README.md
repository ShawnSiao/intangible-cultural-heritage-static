# 中国非遗地图静态站

本仓库用于部署「中国非遗地图」的公开静态版本。站点从「寻找家乡」开始，提供全国非遗地图、地区检索、门类筛选、项目详情、传承关系、南京体验地点与地图定位。

## 公开边界

仓库只保留页面运行所需的静态产品目录，不包含以下内容：

- 原始快照、SQLite 数据库和导入脚本；
- 来源标识、来源 URL、发布机构和许可备注；
- 抓取记录、审核事项、校验值和处理日志；
- 上游接口或运行时 API 依赖。

`public/data/catalog.json` 仅包含页面可见的项目、行政区、传承人关系、体验地点与活动字段。`pnpm validate:catalog` 会按字段白名单检查公开边界。

## 本地运行

```powershell
pnpm install --frozen-lockfile
pnpm validate:catalog
pnpm test
pnpm dev
```

高德地图需要在本地 `.env.local` 中提供：

```dotenv
VITE_AMAP_JS_KEY=
VITE_AMAP_SECURITY_CODE=
```

这两个值会进入浏览器端构建产物，应在地图服务控制台设置可用域名。不要把 `.env.local` 提交到 Git。

## 构建与部署

```powershell
pnpm check
pnpm test
pnpm validate:catalog
pnpm build
```

构建产物位于 `dist/`。路由采用 URL Hash，刷新项目详情或地区页时不依赖服务端重写。

推送到 `main` 后，`.github/workflows/deploy-pages.yml` 会构建并发布 GitHub Pages。地图配置从仓库 Actions Secrets `AMAP_JS_KEY` 与 `AMAP_SECURITY_CODE` 注入；未配置时，地图区域显示可读的降级说明，其余检索与浏览功能仍可使用。

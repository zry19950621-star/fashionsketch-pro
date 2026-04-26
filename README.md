# FashionSketch Pro

上传秀场图，自动拆分上下装，并生成纯黑白的前后视技术线稿。

## 功能

- 上传秀场或造型照片
- 调用 Gemini 官方 API 分析服装结构
- 自动识别上装与下装
- 分别生成黑白技术平面线稿
- 一键下载生成结果

## 两种部署模式

这个仓库同时支持两种运行方式：

### 1. GitHub Pages 直连模式

- 前端在浏览器里直接请求 Gemini 官方 API
- 通过 GitHub Actions 在构建时注入 `VITE_GEMINI_API_KEY`
- 适合你现在这种“要 GitHub 在线网址”的需求

注意：

- 浏览器直连意味着最终访客仍然可以在前端资源里拿到这个 Key
- 这个 Key 必须在 Google AI Studio / Google Cloud 里限制到你的站点域名

### 2. Vercel 服务端代理模式

- 前端调用 `/api/generate-tech-pack`
- 服务端函数再去请求 Gemini 官方 API
- 适合公开分享且不想把 Key 暴露给浏览器的场景

## 本地开发

安装依赖：

```bash
npm install
```

只跑前端：

```bash
npm run dev
```

连同 Vercel API 函数一起跑：

```bash
npm run vercel:dev
```

## GitHub Pages 部署

GitHub Actions workflow 会读取仓库 secret：

- `VITE_GEMINI_API_KEY`

然后构建并发布到 Pages。

## Vercel 部署

Vercel 环境变量使用：

- `GEMINI_API_KEY`

## 技术栈

- React 19
- Vite
- Vercel Functions
- Tailwind CSS v4
- Lucide React

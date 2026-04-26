# FashionSketch Pro

上传秀场图，自动拆分上下装，并生成纯黑白的前后视技术线稿。

## 功能

- 上传秀场或造型照片
- 服务端直连 Gemini 官方 API
- 自动识别上装与下装
- 分别生成黑白技术平面线稿
- 一键下载生成结果

## 部署方式

这个版本不再使用 GitHub Pages。

原因很直接：

- GitHub Pages 只能托管静态前端
- 公开网页里不能安全保存 Gemini API Key
- 本项目现在改成了 `前端 + /api 服务端函数` 的结构

因此在线版本应部署到支持 Serverless Functions 的平台，例如 Vercel。

## 本地开发

安装依赖：

```bash
npm install
```

如果只看前端：

```bash
npm run dev
```

如果要连同 Vercel API 函数一起本地跑：

```bash
npm run vercel:dev
```

## Gemini Key

生产环境推荐使用：

- `GEMINI_API_KEY` 作为平台环境变量

当前仓库不会保存任何真实密钥。

## 技术栈

- React 19
- Vite
- Vercel Functions
- Tailwind CSS v4
- Lucide React

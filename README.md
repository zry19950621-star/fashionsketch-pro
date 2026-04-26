# FashionSketch Pro

上传秀场图，自动拆分上下装，并生成纯黑白的前后视技术线稿。

## 功能

- 上传秀场或造型照片
- 调用 Gemini 分析服装结构
- 自动识别上装与下装
- 分别生成黑白技术平面线稿
- 一键下载生成结果

## 为什么这个版本用“本地输入 API Key”

这个项目部署在 GitHub Pages。GitHub Pages 只能托管静态前端，不能安全保存服务端密钥。

所以这里的做法是：

- 你在页面中粘贴自己的 Gemini API Key
- Key 只保存在你的浏览器 `localStorage`
- 仓库里不会保存任何真实密钥

如果后面你想做“公开给别人用、并且不暴露 Key”的版本，建议再迁移到 Vercel 或其他支持服务端函数的平台。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## GitHub Pages 发布

仓库内已经包含 `.github/workflows/deploy.yml`。

推送到 `main` 分支后，GitHub Actions 会自动：

1. 安装依赖
2. 执行 `npm run build`
3. 发布 `dist/` 到 GitHub Pages

默认访问路径按仓库名 `fashionsketch-pro` 配置：

`https://zry19950621-star.github.io/fashionsketch-pro/`

## 技术栈

- React 19
- Vite
- Tailwind CSS v4
- Lucide React

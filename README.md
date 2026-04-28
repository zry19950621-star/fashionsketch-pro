# FashionSketch Pro

上传秀场图，自动拆分上下装，并生成纯黑白的前后视技术线稿。

## 功能

- 上传秀场或造型照片
- 服务端直连 Gemini 官方 API
- 自动识别上装与下装
- 分别生成黑白技术平面线稿
- 一键下载生成结果

## 部署方式

这个版本是安全部署版本：

- 前端调用 `/api/generate-tech-pack`
- 服务端函数再请求 Gemini 官方 API
- `GEMINI_API_KEY` 只存在于部署平台环境变量中
- 浏览器不会看到真实密钥

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

## 生产环境变量

在部署平台中配置：

- `GEMINI_API_KEY`

如果要启用邮箱验证码登录，再额外配置：

- `EMAIL_AUTH_ENABLED=true`
- `RESEND_API_KEY`
- `EMAIL_AUTH_FROM`
- `AUTH_SESSION_SECRET`

可选白名单：

- `AUTH_ALLOWED_EMAILS`
- `AUTH_ALLOWED_DOMAINS`

## 技术栈

- React 19
- Vite
- Vercel Functions
- Tailwind CSS v4
- Lucide React

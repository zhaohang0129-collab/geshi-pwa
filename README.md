# 格时

一个纯前端、离线可用的学习与休息时间记录 PWA。数据只保存在浏览器 `localStorage` 中，无后端、无账户、无第三方服务。

## 本地预览

项目没有依赖和构建步骤。在项目目录启动任意静态服务器：

```bash
python -m http.server 4173
```

打开 `http://localhost:4173`。Service Worker 只会在 `localhost` 或 HTTPS 环境运行。

## GitHub Pages 部署

仓库已包含 `.github/workflows/deploy.yml`。推送到 `main` 分支后，在 GitHub 仓库的 **Settings → Pages → Build and deployment** 中，将 Source 设为 **GitHub Actions**。工作流会自动发布仓库根目录。如果默认分支不是 `main`，请同步修改工作流中的分支名。

如果使用项目站点，地址通常是 `https://你的用户名.github.io/仓库名/`。本项目所有资源、manifest、Service Worker 和启动路径均使用相对路径，可直接在该子路径运行。

## 数据说明

- 时间记录按本地日期保存。
- “明日待办”直接存到次日日期，因此第二天打开时会出现在首屏。
- “记入 30 分”会把待办转成一条 30 分钟学习记录，可随后修改。
- 导入 JSON 会在确认后替换当前浏览器中的数据。
- 建议定期导出 JSON，尤其是在换机或清理 Safari 数据之前。

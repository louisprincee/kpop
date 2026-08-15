# K-pop 默契挑战

这是一个以 K-pop 为主题的“出题 / 回答 / 对战”网页。你可以先作为房主创建自己的房间，把题目和选项设置好，然后把房间名分享给朋友；朋友输入你的昵称和房间名后即可开始答题，系统在最后统一统计分数。

## 功能介绍

- 以“团”为单位的题库结构
- 支持房主创建房间并发布题目
- 支持朋友通过房间名 + 房主昵称进入答题
- 登录后才展示题目
- 支持直接在前端编辑题目内容
- 回答后不立刻揭晓正确答案，最后统一统计分数
- 支持 SQLite 数据库储存答题记录和排行榜
- 适合静态站点部署到 GitHub Pages

## 本地开发

```bash
npm install
cd server && npm install && cd ..
npm run dev:all
```

- 前端地址： http://localhost:5173/
- 后端地址： http://localhost:4000/api/health

## 生产部署

前端可以直接部署到 GitHub Pages，例如：

```bash
npm run deploy
```

后端需要部署到支持 Node.js 的环境，例如 Render、Railway、Fly.io 或你自己的服务器；前端默认访问 `http://localhost:4000`，如果需要远程部署，请在项目中配置 `VITE_API_BASE` 环境变量。

## 关键文件

- `src/App.jsx`：主页面与房间 / 答题逻辑
- `src/data/questionBank.js`：统一题库（当前唯一数据源）
- `src/styles.css`：视觉样式
- `server/index.js`：数据库与接口

## 使用方式

1. 打开网页，选择“我来出题”。
2. 输入你的昵称和房间名，创建房间。 
3. 复制房间名和房主昵称，发给朋友。 
4. 朋友选择“我来答题”，输入房间名和你的昵称进入题目。 
5. 全部答题完毕后，系统统一显示分数和答案回顾。



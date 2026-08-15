# K-pop 默契挑戰

這是一個 K-pop 主題的默契問答網站，適合你把連結發給朋友，讓對方登入暱稱後回答題目並看看分數。

## 功能

- K-pop 題庫：內建四代 / 五代 / 六代 / 專輯 / 成員偏愛題目
- 換一題：隨機重排題目列表
- 自訂題目：使用者可新增自己的題目與選項
- 登入暱稱：每位玩家可輸入暱稱後進行挑戰
- 分數計算：每題答對 +1，結束後顯示總分與評語
- GitHub Pages 相容：以 Vite 靜態站點方式部署

## 本地開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3000/

## GitHub Pages 部署

1. 將這個專案推到你的 GitHub repository。
2. 在 GitHub repo 設定中開啟 Pages，選擇 `Deploy from a branch`，分支選 `gh-pages`。
3. 在本機執行：

```bash
npm run deploy
```

若你有自己的 GitHub Pages 網址，請在 `package.json` 補上 `homepage` 欄位，例如：

```json
"homepage": "https://你的帳號.github.io/你的repo名"
```

## 主要檔案

- `src/App.jsx`：主頁面與遊戲邏輯
- `src/data/questions.js`：題庫資料
- `src/styles.css`：主題樣式


# 新楓之谷戰鬥力計算機（MapleCombat）

新楓之谷戰鬥力計算機，適用於 Windows 10 / 11。

以 Vue 3、Vite、TypeScript 與 Tauri 2 開發。

## 官方 API 快速匯入

「裝備變更」頁可使用角色名稱與個人的 NEXON Open API Key 讀取台服角色目前穿戴的裝備，選取後一鍵帶入原裝備或變更後裝備欄位。API Key 只保留在當次視窗的記憶體，不會寫入計算機存檔。

目前會自動換算固定能力、百分比能力、攻擊力／魔力、傷害、Boss 傷害、爆擊傷害及無視防禦率；條件式潛能會標示為需要人工確認。官方套裝效果會一併顯示供核對，換裝後套裝件數模擬尚未自動套入計算。

資料來源：NEXON Open API

## 下載

到 [Releases](../../releases) 下載：

- 可攜版 `MapleCombat-x.x.x.exe`：免安裝，下載後可直接執行。
- 安裝檔 `*-setup.exe`（NSIS）：安裝後會建立開始選單捷徑，也可從控制台移除。

## 從原始碼建置

需求:Node.js 22+、Rust(stable);Windows 另需 MSVC build tools 與 WebView2。

```bash
npm ci
npm run tauri build   # 產出可攜 .exe 與 NSIS 安裝檔於 src-tauri/target/release/
npm run tauri dev     # 開發
npm run test          # 測試
```

## 授權

程式碼採 [MIT](LICENSE)。

遊戲名稱與圖像版權均歸 © NEXON Korea Corporation；本工具為非官方開發工具，僅作為非營利學習用途。

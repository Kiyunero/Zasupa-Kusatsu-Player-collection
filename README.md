---
title: ザスパ群馬 選手名鑑（アプリ）
project: ザスパ群馬 選手名鑑
type: app-development
status: in-development
created: 2026-05-19
updated: 2026-05-28
related_themes:
  - "[[01_テーマ一覧/ザスパ/README|ザスパ群馬]]"
tags:
  - アプリ開発
  - PWA
  - Vue
  - Bootstrap
  - レスポンシブ
---

# ザスパ群馬 選手名鑑（アプリ）

> [!important] 本ノートの運用
> 本ノートは Yuta と Claude（Cowork）の会話ログ。これ以降、本アプリに関するすべてのやり取りはこのファイルに追記する運用とする。

> [!tip] 運用ルール
> - 場所: `03_アプリ開発/ザスパ/README.md`
> - 1セッション = 1見出し（`## YYYY-MM-DD HH:MM セッション名`）
> - 「依頼内容」「実施内容」「変更ファイル」「次回TODO」をセクションとして残す
> - 重要な技術判断はノート末尾の「設計メモ」にも追記する

## 構成（2026-05-19 時点）
- フロント: Vue 3 (CDN) + Bootstrap 5 + Chart.js
- データ: Google Apps Script Web App (`gasUrl`) → 失敗時 `js/data.js` の `localData` にフォールバック
- 主要ファイル
  - `index.html`
  - `css/style.css`
  - `js/main.js`（Vue アプリ本体、広告画面、無操作タイマー）
  - `js/config.js`（GAS の URL）
  - `js/data.js`（ローカル選手データ 11 名）
  - `images/1.png 〜 11.png`、`pitch.jpg`、`default-icon.png`
  - `audios/bgm.mp3`

---

## 2026-05-19 初回セッション — 不具合修正 + レスポンシブ対応

### 依頼内容
1. 今後の会話を `03_アプリ開発/ザスパ（アプリ）.md` に保存していくことをルール化
2. あらゆる不具合を修正して、使えるアプリにする
3. どんな画面サイズでもきれいな UI になるようにする

### 特定した不具合
1. **`data.js` (ローカルフォールバック) が `index.html` に未読込** → 通信失敗時に画面が空に
2. **`loadDummyData()` が空配列を返している** → `localData` を使うべき
3. **プロフィールカード/レーダーチャート/サイドバーが固定サイズ** → 小画面で崩壊
4. **広告動画の `play()` が自動再生ポリシーで弾かれた場合の救済なし**
5. **タッチプロンプトの文字が固定 `2rem` ではみ出し気味**
6. **チャート破棄の `setTimeout` が孤立** → 高速連打で二重生成のリスク
7. **能力値が `Math.random()` で毎回変わる** → 同じ選手なのに表示がぶれる
8. **`100vh` 固定で iOS Safari の URL バー問題に未対応**

### 実施内容
- `index.html`
  - `<script src="js/data.js">` を追加
  - `<video>` に `muted loop preload="auto"` を追加（自動再生対策）
- `js/main.js`
  - `goToAdScreen()`: `play()` の Promise を catch、ミュート再試行
  - `fetchPlayers()`: `file://` 環境や非 HTTP URL を検知してローカルに即フォールバック / レスポンス空も検出
  - `loadDummyData()`: `localData` を使うように修正（未定義時のセーフネット付き）
  - `processPlayerData()`: id をシードにした擬似乱数で能力値を生成（再現性のある値に）
  - `showProfile()` / `hideProfile()`: `chartDestroyTimeoutId` / `pitchResetTimeoutId` を管理して二重生成防止、`destroy()` を try-catch
- `css/style.css`（全面書き直し）
  - `clamp()` ベースで文字・余白・サイズを流動化
  - `100dvh` で動的ビューポート対応
  - 主要レイアウト
    - デフォルト: サイドバー（260〜380px）+ ピッチ横並び
    - `@media (max-width: 991px)`: サイドバー 220〜320px に縮小
    - `@media (max-width: 767px)`: ピッチ 45dvh + 下にリスト（縦積み）
    - `@media (max-width: 420px)`: アイコン 34px、プロフィール文字を縮小
    - `@media (max-height: 520px) and (min-width: 768px)`: 横長低背向け
    - `@media (min-width: 1600px)`: 4K で文字が薄まらないよう上限固定
    - `@media (hover: none)`: タッチ端末でホバー演出を抑止
    - `@media (prefers-reduced-motion: reduce)`: アニメーションを最小化
  - `#pitch-container` に `overflow: hidden`（ズーム時のはみ出し対策）
  - プロフィールカード: `width: min(90vw, 880px)` / `height: min(78vh, 540px)`、文字すべて `clamp()`
  - レーダーチャート枠: `clamp(150px, 28vw, 300px)`

### 変更ファイル
- `index.html`
- `css/style.css`（書き直し）
- `js/main.js`

### 動作検証
- `node -c` で 3 ファイルの構文 OK
- CSS の `{` `}` 対応 OK（95/95）
- `localData.players.length === 11`、全 11 ポジションが `FORMATION_COORDS` で定義済み
- 参照アセット（pitch.jpg / default-icon.png / bgm.mp3）はすべて存在

### 次回TODO

> [!info] タスク一元化
> このアプリのタスク・次回TODOは [[00_タスク一覧/タスク一覧|00_タスク一覧/タスク一覧]] で一元管理しています。

---

## 設計メモ

- **スクリプト読み込み順**: `config.js` → `data.js` → `main.js`。classic script の lexical environment は共有されるので `const` で宣言された `gasUrl` / `localData` は `main.js` から参照できる。
- **`100dvh`** を主、`100vh` を fallback として併記。`dvh` 非対応ブラウザでは `vh` が効く。
- **`clamp(min, fluid, max)`** をフォントとパディングに広く採用してメディアクエリを最小限に。
- **プロフィールカードの背景グリッドアニメ** はパフォーマンス影響が出たら `prefers-reduced-motion` 同様にオフ化検討。
- **能力値**: 現状はシード付き擬似乱数。本来は GAS 側でデータとして持つのが望ましい。


---

## 2026-05-19 第2セッション — 取扱説明書（.docx）の作成

### 依頼内容
- 「誰が読んでも理解できるレベルの説明書」を作成
- 保存場所: `C:\Users\sdc096419\Desktop\cloude\Cowork_workspaces\アプリ\ザスパ`

### 確認した事項
- ファイル形式: **Word (.docx)**
- 想定読者: **利用者 + 管理者**

### 実施内容
- `docx-js` (Node.js) で A4・全11ページの説明書を生成
- 表紙 → 目次 → 7章構成
  1. このアプリについて
  2. 画面の基本構成
  3. 使い方
  4. 困ったときは（利用者向け）
  5. 管理者向け情報（ファイル構成・データの仕組み・ローカルデータ更新・タイマー変更・デプロイ等）
  6. よくあるトラブルと対処（管理者向け）
  7. 付録（操作早見表・お問い合わせ）
- 日本語フォントは Yu Gothic を統一指定（Windows 標準）
- 見出し（H1/H2/H3）、表（情報表）、注意/ポイント枠（カラーボックス）、箇条書き（●/○）、番号付きリストを使用
- 表紙以外にはヘッダー（書名）とフッター（ページ番号）を追加
- `validate.py` で構文検証 → PASS
- LibreOffice で PDF 変換 → 11ページ A4、目視で表紙と本文のレイアウト確認済み

### 出力ファイル
- `C:\Users\sdc096419\Desktop\cloude\Cowork_workspaces\アプリ\ザスパ\ザスパ群馬選手名鑑_取扱説明書.docx`

> [!info] タスク一元化
> 取扱説明書の改善タスクも含め、このアプリのタスクは [[00_タスク一覧/タスク一覧|00_タスク一覧/タスク一覧]] で一元管理しています。

---

## 2026-05-28 第3セッション — ノート/コードのフォルダ分離

### 依頼内容
- テーマ配下にノート、アプリ開発配下にコード、というルール通りに整理する

### 実施内容
- `01_テーマ一覧/ザスパ群馬/app/` 配下のコード一式を `03_アプリ開発/ザスパ/` 直下へ移動
  - `index.html` / `css/` / `js/` / `images/` / `audios/`
- `01_テーマ一覧/ザスパ群馬/ザスパ群馬選手名鑑_取扱説明書.docx` も `03_アプリ開発/ザスパ/` へ移動
- 空になった `01_テーマ一覧/ザスパ群馬/app/` フォルダは自動クリーンアップで削除済み
- 関連リンクの整合性チェック → 全てOK（テーマ側 → アプリ側のリンクはそのまま機能）

### 変更後のファイル配置
- `01_テーマ一覧/ザスパ群馬/` — テーマノートのみ (`README.md` / `CLAUDE.md`)
- `03_アプリ開発/ザスパ/` — コード一式・取扱説明書・本ノート (`README.md`)

### 次回TODO

> [!info] タスク一元化
> このアプリのタスク・次回TODOは [[00_タスク一覧/タスク一覧|00_タスク一覧/タスク一覧]] で一元管理しています。

---

## 関連リンク

- [[03_アプリ開発/README|戻る: アプリ開発]]
- [[01_テーマ一覧/INDEX|テーマ一覧 INDEX]]
- [[01_テーマ一覧/ザスパ/README|ザスパ群馬（テーマ）]]
- [[04_参考資料/テンプレート/リッチMD作成ガイド|リッチMD作成ガイド]]

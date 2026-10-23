# QiMath 启数乐学 · AI / 使用说明书

面向小学生的纯静态数学学习站：看得见的图示、闯关练习、错题复习、离线可用。

仓库：https://github.com/shengshuyuan/QiMath  
本地：双击根目录 `index.html` 即可打开（无需安装、无打包）。

---

## 线上地址

| 通道 | 用途 | 地址 |
|---|---|---|
| WorkBuddy（国内首选） | 国内访问快 | https://qimath.app.workbuddy.host/ |
| Vercel（海外备用） | 国际访问 | https://qimath.vercel.app |
| Cloudflare Pages | 备用静态托管 | 见下方「部署」；需本机已登录 `wrangler` |

---

## 有哪些课程

知识目录按「数与运算 / 量与测量」分组：

| 课程 | 学什么 | 路由示例 |
|---|---|---|
| 加法 / 减法 / 乘法 / 除法 | 探究台、口诀表、闯关、游戏 | `#/course/mul/explore/learn` |
| 混合运算 | 加减混合、乘除混合、优先级、小括号 | `#/course/mixed/addsub/learn` |
| 长度单位 | 单位、读尺、比较、换算、线段、长度加减 | `#/course/length/ruler/learn` |
| 角的初步认识 | 顶点与边、直角锐角钝角、比较开口 | `#/course/angle/parts/learn` |
| 认识时间 | 钟面、时分、换算、经过时间 | `#/course/time/clock/learn` |
| 克和千克 | 单位、换算、比较、读秤 | `#/course/mass/unit/learn` |
| 认识人民币 | 面值、读写、换算、比较、加减、购物；另有凑钱 / 收银游戏 | `#/course/money/convert/practice` |

每个课程都有：**学一学 / 练一练 / 错题**。地址栏 hash 会记住课程、知识点和模式，支持刷新与浏览器前进后退。

---

## 怎么用（给家长 / 学生）

1. 打开网站或本地 `index.html`。
2. 点「知识目录」选一门课。
3. 「学一学」看图和方法；「练一练」做题；错的会进「错题」，连续两次独立答对才移出。
4. 右上角可开关朗读、打印练习纸、看勋章、改设置。
5. 手机可「添加到主屏幕」，断网后仍能做题（语音是否可用取决于是否听过预录音频 / 系统朗读）。

---

## 技术要点（给协作的 AI / 开发）

- **零依赖**：原生 HTML / CSS / JS，`<script src>` 顺序加载，不用打包、不用 ES module（保证 `file://` 可用）。
- **命名空间**：全局 `MT`；基础四则用 `MT.op`，新课用 `MT.topics` + 各课模块（`mixed` / `length` / `money`）。
- **新增课程**：主要改 `js/navigation.js` 的 `courses`，并挂上模块、写入 `index.html` 与 `sw.js` 预缓存。
- **进度键**：`localStorage` 的 `mt99.progress.v1`。主题进度在 `topics` 下。导航已加载时，非基础课程从 `navigation.courses` 恢复；否则兜底为 `mixed` / `length` / `money` / `angle` / `time` / `mass`。人民币另含 `games`。漏掉一门，刷新会丢掉该课进度。
- **离线**：`sw.js` 的 `CACHE_NAME` 有代码变更时必须递增；代码资源网络优先，音频缓存优先。
- **回归检查**（改完必跑）：

```sh
node tools/check-add-sub.js
node tools/check-mixed.js
node tools/check-length.js
node tools/check-topics.js
node tools/check-navigation.js
node tools/check-sw-precache.js
node tools/check-money.js
```

更完整的产品约定见 [DESIGN.md](DESIGN.md)，功能总览见 [README.md](README.md)。

---

## 部署备忘

### GitHub

```sh
git add -A && git commit && git push origin main
```

### Vercel（CLI，当前未接 Git 自动部署）

```sh
vercel --prod --yes
```

项目名 `qimath`，生产域 `qimath.vercel.app`。

### Cloudflare Pages

仓库已备 `_headers`、`.assetsignore`。本机需已 `wrangler login`，然后例如：

```sh
npx wrangler pages deploy . --project-name=<项目名> --commit-dirty=true
```

若未登录或项目名未知，先 `npx wrangler pages project list` 确认。

### WorkBuddy 国内站

在 WorkBuddy 内用发布应用（`workbuddy_sites_deploy`），`directory` 为项目根、`language: static`。  
发布前须临时移出内部目录（详见 `.workbuddy/memory/MEMORY.md`）：`.env.local`、`.vercel`、`.wrangler`、`.omx`、`.gstack`、`.workbuddy`、`AGENTS.md` 等，发布后再还原。平台为增量覆盖，删不掉的旧敏感文件需用占位内容再发一次覆盖。

---

## 本轮审查记录（2026-10-16）

### 发现并已修复

1. **人民币进度刷新丢失（严重）**：`js/storage.js` 加载主题时只认 `mixed` / `length`，漏了 `money`，练习次数、错题、游戏星级刷新后全部清空。已纳入白名单并恢复 `games`。
2. **「不进退位」加减只有减法**：`mode === 1` 时外层 `isPlus` 恒为假，加法支路死代码。已改为独立开关，并保证加法角之和 &lt; 10。
3. **数钱讲解漏「分」**：拼钱币托盘时改写了 `f`，讲解里分部分常被吃掉。已用临时变量拆分。

### 验证

七项 `tools/check-*.js` 全部通过；另用本地 `localStorage` 模拟确认 `money` 进度往返可恢复。`CACHE_NAME` → `mt99-cache-v31`，资源版本 `2.5.4`。

### 后续可改进

- README / DESIGN 与「认识人民币」文档对齐（本轮已补）。
- Cloudflare 需本机 wrangler 登录态才能一键发布。
- WorkBuddy 发布工具仅在 WorkBuddy 环境内可用；Cursor 侧需手动或换环境发布国内站。

# QiMath 启数乐学 · AI / 使用说明书

面向小学生的纯静态数学学习站：看得见的图示、闯关练习、错题复习、离线可用。

仓库：https://github.com/shengshuyuan/QiMath  
本地：双击根目录 `index.html` 即可打开（无需安装、无打包）。

---

## 线上地址

| 通道 | 用途 | 地址 |
|---|---|---|
| 自有域名 | Cloudflare Pages 正式入口 | https://qimath.sherone.app/ |
| WorkBuddy（国内首选） | 国内访问快 | https://qimath.app.workbuddy.host/ |
| Vercel（海外备用） | 国际访问 | https://qimath.vercel.app |
| Cloudflare Pages 原地址 | 保留访问与进度迁移 | https://qimath.pages.dev/ |

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

专题课（混合运算到人民币）的「练一练」页都有一个「找出算错的小捣蛋」游戏（路由 `…/practice/impostor`）：三张卡里有一张答案是错的，用现成的出题器生成，不另写题库；读尺、看钟、读秤、认角等看图题也会缩成卡片一起玩。

首页课程卡会显示已学课程的进度条、完成数和错题数；顶部有「今天练什么」推荐（错题 → 未完成 → 新课）；有错题时还有「有 N 道错题等着复习」横幅。设置里可看「学习概况」给家长对照。

---

## 怎么用（给家长 / 学生）

1. 打开网站或本地 `index.html`。
2. 点「知识目录」选一门课。
3. 「学一学」看图和方法；「练一练」做题；错的会进「错题」，连续两次独立答对才移出。
4. 右上角可开关朗读、打印练习纸、看勋章、改设置。
5. 手机可「添加到主屏幕」，断网后仍能做题。想断网也有真人朗读：在加减乘除任一课里打开设置，点「下载这门课的真人语音」（每门约 5 MB）。
6. 换手机 / 换网址：设置里「保存进度文件」，把文件发到新设备后「读取进度文件」。

---

## 技术要点（给协作的 AI / 开发）

- **零依赖**：原生 HTML / CSS / JS，`<script src>` 顺序加载，不用打包、不用 ES module（保证 `file://` 可用）。
- **命名空间**：全局 `MT`；基础四则用 `MT.op`，专题课用 `MT.topics` + 各课模块（`mixed` / `length` / `angle` / `time` / `mass` / `money`），每个模块提供 `skills` 与确定性的 `generate(skill, range, seed)`。
- **新增课程**：改 `js/navigation.js` 的 `courses`，挂上模块，写入 `index.html` 与 `sw.js` 预缓存。只要有文字题，`js/topic-games.js` 的找错游戏会自动对它开放。
- **进度键**：`localStorage` 的 `mt99.progress.v1`。主题进度在 `topics` 下（`skills[id].clean` 为独立答对数，`wrong` 为错题）。人民币另含 `games`。首页进度由 `app.js` 的 `courseStats()` 汇总。
- **语音**：`MT.speech.play(text, scene)` 先找预录音频（`js/voice-clips.js`），没有才用系统合成；合成前经 `MT.speech.spoken()` 把符号、单位、时刻、金额、角度改写成口语。专题课固定题干可用 `tools/append-topic-voice.py` 追加婷婷录音；有录音时「听题目」优先只读题干。`MT.speech.cacheClips(op, progress)` 预取一门基础运算的全部录音。
- **学习建议**：`js/insights.js` 提供 `courseStats` / `recommend` / `parentSummary`，首页推荐与设置里的学习概况共用。
- **样式文件**：`topics.css` 为专题课通用样式（含找错游戏与看图缩略卡）；人民币专属图形与游戏在 `money.css`；`games.css` 的 `.impostor-*` 被两处游戏共用。
- **离线**：`sw.js` 的 `CACHE_NAME` 有代码变更时必须递增，同时更新 `index.html` 的 `?v=`；代码资源网络优先，音频缓存优先。
- **WorkBuddy 发布**：先 `./tools/prepare-workbuddy-deploy.sh` 移出内部文件，发布后再 `./tools/restore-workbuddy-deploy.sh`。
- **回归检查**（改完必跑，全部 `tools/check-*.js`）：

```sh
for f in tools/check-*.js; do node "$f" || echo "FAIL $f"; done
```

`check-pages.js` 会用本机 Chrome 无头渲染 80 个页面（桌面 + 手机），检查 JS 报错、横向溢出和按钮是否 ≥ 44px；没装 Chrome 时自动跳过。加 `--shots 目录` 可输出截图。

更完整的产品约定见 [DESIGN.md](DESIGN.md)，功能总览见 [README.md](README.md)，历次改动见 [docs/history.md](docs/history.md)。

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
发布前执行 `./tools/prepare-workbuddy-deploy.sh`（移出 `.env.local`、`.vercel`、`.wrangler`、`.omx`、`.gstack`、`.workbuddy`、`AGENTS.md` 等），发布后再 `./tools/restore-workbuddy-deploy.sh`。平台为增量覆盖，删不掉的旧敏感文件需用占位内容再发一次覆盖。详见 `.workbuddy/memory/MEMORY.md`。

---

## 当前状态（2026-11-24）

- 资源版本：本轮改动文件 `2.9.0`；离线缓存 `mt99-cache-v47`（离线语音单独存 `mt99-audio-v1`，代码升级不清空已下载语音）。
- 17 个 `tools/check-*.js` 全部通过（含 `check-insights`、`check-pages`）。
- 历次改动与修复记录见 [docs/history.md](docs/history.md)。

### 后续可改进

- 专题课动态题面（带具体数字的换算、经过时间等）仍靠系统合成；可用 `tools/append-topic-voice.py` 继续追加高频固定句，或扩展句式模板后再批量录。
- 进度迁移仍是文件导出 / 导入；二维码或短码同步需要服务端或第三方库，与「零依赖、双击可用」冲突，暂不做。
- `quiz.js` / `money.js` 体量仍偏大，后续可按玩法再拆文件（保持无 ES module）。
- Cloudflare 需本机 wrangler 登录态才能一键发布；WorkBuddy 国内站用 prepare / restore 脚本移出内部文件后再发。

# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-10-15
- Primary product surfaces: QiMath 基础运算、混合运算、米和厘米。
- Evidence reviewed: `index.html`、`css/base.css`、`css/layout.css`、`js/ops.js`、`js/app.js`、`js/storage.js`、`js/quiz.js`、`js/print.js`；本轮用户确认的三个范围问题。此前没有独立设计文档。

## Brand
- Personality: 友好、清楚、鼓励孩子尝试，用图和步骤解释数学。
- Trust signals: 正确的运算顺序、带单位的结果、清楚的示意说明、可复习的错题。
- Avoid: 把所有知识硬套成口诀；仅显示最终答案；用屏幕像素冒充真实厘米。

## Product goals
- Goals: 从四则运算工具扩展为可逐步增加知识的数学学习产品；每个新知识都有学方法、做练习、错题复习。
- Non-goals: 本轮不引入框架、后台、账号、知识图谱或通用表达式编辑器；不做嵌套括号、负数、分数和复合长度单位。
- Success signals: 能完成逐步混合运算、非零起点读尺及米厘米换算；刷新后保留进度；旧模块正常。

## Personas and jobs
- Primary personas: 学习基础数学的小学生，以及陪学家长。
- User jobs: 看懂方法、自己尝试、发现错在顺序还是计算、重新练习、打印练习纸。
- Key contexts of use: 触屏手机、平板、电脑；静态页面和安装后的离线页面。

## Information architecture
- Primary navigation: 三个知识入口：基础运算 / 混合运算 / 米和厘米。
- Core routes/screens: 基础运算保留加减乘除以及探究台、口诀表、闯关、游乐场；新主题使用学方法、做练习、错题本。
- Content hierarchy: 知识主题 → 知识点 → 图解与例题 → 分步练习 → 反馈与复习。
- Topic ownership: `MT.op` 继续只管理四种基础运算；`MT.topics` 负责新知识的共享学习/练习界面。新模块提供课程与确定性题目数据，不复制整套页面。

## Design principles
- 先看图和算式，再操作；沿用现有探究台的内容顺序。
- 混合运算先判断顺序、再算中间值、最后算结果；每题为三个数、两步计算。
- 题目按知识点区分；求助后的完成与独立答对分别显示。
- Tradeoffs: 保留基础运算的成熟交互，新知识共用小型界面；不提前改写整个产品。

## Visual language
- Color: 沿用 `base.css` 的紫色主色、粉色副色与成功/错误语义色。
- Typography: 沿用系统中文字体与圆角数字字体；算式大于辅助文案。
- Spacing/layout rhythm: 沿用 6/8/12/16px 间距，内容最大宽度 1080px。
- Shape/radius/elevation: 使用已有圆角、边框和阴影变量。
- Motion: 轻反馈；遵守减少动画设置与系统偏好。
- Imagery/iconography: 轻量内联 SVG 直尺与刻度，emoji 仅辅助识别主题。

## Components
- Existing components to reuse: btn、seg、主题色、打印根节点、声音、存储和离线缓存。
- New/changed components: 主题入口、知识点选择、课程卡、分步示例、练习卡、数字输入、选项、错题列表。
- Variants and states: 当前主题/知识点、学习/练习、选运算顺序/中间值/结果、独立完成/求助完成、无错题。
- Token/component ownership: 通用视觉变量在 `base.css`，新主题布局在 `topics.css`；课程数据分别由 `mixed.js`、`length.js` 维护。

## Accessibility
- Target standard: 新增交互遵循 WCAG 2.2 AA 的键盘、可访问名称和焦点基本要求；完整产品合规认证不在本轮范围。
- Keyboard/focus behavior: 原生按钮和输入框；Enter 提交；切换步骤后定位相应输入或标题；无只靠鼠标的操作。
- Contrast/readability: 文字使用现有深色语义变量；不单靠颜色传递正确/错误。
- Screen-reader semantics: 分组有名称、选择有 pressed 状态、反馈为 live region、SVG 有文字替代。
- Reduced motion and sensory considerations: 复用全局减少动画/朗读开关；动态课程使用现有系统朗读回退。

## Responsive behavior
- Supported breakpoints/devices: 验证 375px、768px、1280px。
- Layout adaptations: 桌面知识点在左、内容在右；手机知识点为可横向滑动的一行并给出滑动提示；收紧手机新主题页头，让图解和题目更早可见。主题入口不放入巨大的固定页头。
- Touch/hover differences: 新增主要按钮至少 44px；数字键盘可触摸，输入框可调出设备数字键盘。

## Interaction states
- Loading: 课程与出题本地同步生成，无额外请求。
- Empty: 错题本说明暂无错题，并能直接开始练习。
- Error: 区分运算顺序、计算、单位/读尺错误；保留重试机会。
- Success: 显示推导过程与独立完成数量，用户主动下一题。
- Disabled: 未作答不能提交；已完成的题不能重复计分。
- Offline/slow network: 新增核心文件加入预缓存；语音效果取决于系统音色，录音仍按需缓存。

## Content voice
- Tone: 简短、具体、鼓励尝试。
- Terminology: 同级运算、从左往右、先乘除后加减、先算小括号；米（m）、厘米（cm）。
- Microcopy rules: 单位始终可见；尺子写明屏幕为示意；求助不伪装为独立掌握。

## Implementation constraints
- Framework/styling system: 原生 HTML/CSS/JS，IIFE + MT 命名空间，无新依赖。
- Design-token constraints: 复用现有 CSS 变量，不另建主题系统。
- Performance constraints: 小型结构化题目，无 eval；错题只存知识点、范围和 seed，重建显示。
- Compatibility constraints: 保留 `mt99.progress.v1` 和原四则字段；新增 topics 字段；旧记录加载时补默认值。
- Test/screenshot expectations: 出题边界与确定性检查、旧数据兼容、真实页面学习/答题/错题/刷新、响应式截图、离线与打印内容检查。

## Open questions
- 后续增加新主题时，再按实际知识形态扩展题型；不提前引入通用课程平台。

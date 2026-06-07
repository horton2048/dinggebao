# 叮了个包 🦟

一个移动端优先的中文 H5 打蚊子小游戏（三关制：普通蚊 → 报仇局 → 蚊王终章）。
纯原生 vanilla JS，**无框架、无构建步骤**。游戏入口是 `index.html`，动效使用本地 `vendor/gsap.min.js`，不依赖 CDN。

- 🎮 在线地址：<https://dinggebao.huangtangai.top>
- 🛠 详细架构 / 数值说明见 [`CLAUDE.md`](./CLAUDE.md)

---

## 本地运行

直接用浏览器打开 `index.html` 就能玩。改完代码刷新即可，无需编译。

如果想用本地服务器（避免个别浏览器对 `file://` 的限制）：

```bash
# Python 3
python -m http.server 8000
# 然后浏览器访问 http://localhost:8000
```

> 调试请用浏览器的**移动端模拟视图**（窄屏竖屏），布局针对 430px 宽 + 安全区适配。

## 自动检查

```bash
node tests/dinggebao-regression.test.mjs
```

这个脚本做轻量回归检查：开始页入口、首页背景图、排行榜/分享弹层、本地 GSAP、震动调用、第二关愤怒蚊目标统计与文案一致性。

---

## 项目结构

```
index.html    ← 游戏入口：HTML + CSS + JS(IIFE)，游戏逻辑在底部 <script>
assets/       ← 首页背景图等静态素材，目前 `home-bg.png` 用作开始页整屏背景
vendor/       ← 本地 GSAP 文件，离线加载，不走 CDN
tests/        ← 轻量 Node 回归测试
CLAUDE.md     ← 架构说明、状态机、平衡数值常量位置（改难度先看这里）
README.md     ← 本文件
```

**改难度 / 平衡性**：数值常量集中在 `index.html` 底部 IIFE 顶部一组 `const`
（如 `LV1_COUNT`、`MAX_HP`、`HIT_RADIUS`、`SPAWN_BASE`、`KING_SHIELD` 等），优先改这里。
平衡性必须**真人在前台浏览器实测**——后台标签的动画会被节流，自动化截图不准。

---

## 协作流程（重要）

我们用**同一个仓库 + 功能分支 + Pull Request**，不直接往 `main` 推。
因为整个游戏是**单个 `index.html`**，两人同时改极易产生合并冲突，请务必遵守：

### 每次开工前

```bash
git checkout main
git pull origin main          # 先同步最新代码
git checkout -b feat/你的功能名   # 从最新 main 切出新分支
```

### 改完后

```bash
git add -A
git commit -m "简明描述这次改了什么"
git push origin feat/你的功能名
```

然后到 GitHub 上对该分支发起 **Pull Request** 合并进 `main`，由对方或自己 review 后合并。

### 降低冲突的约定

- **开工前先在群里说一声你要改哪块**（比如「我改第三关蚊王逻辑」「我调 CSS 配色」），避免两人同时动同一段。
- **小步提交、勤 pull**：分支别开太久，改一小块就合，越晚合冲突越大。
- 真遇到冲突别慌：`git pull origin main` 后手动选择保留哪段，`index.html` 是纯文本，逐行对照即可。

---

## 部署

`main` 分支由 Vercel 自动部署到生产环境（项目 `dinggebao`）。
合并进 `main` 后约 1 分钟即上线到 <https://dinggebao.huangtangai.top>。
目前仅仓库 owner 有 Vercel 部署权限，队友只需把代码合进 `main` 即可，剩下自动完成。

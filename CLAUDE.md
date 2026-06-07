# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

「**叮了个包**」——一个移动端优先（max-width 430px）的中文 H5 打蚊子小游戏（对标「羊了个羊」式的轻量休闲游戏）。游戏入口是 `index.html`，HTML、CSS、JS（IIFE，原生 vanilla JS，无框架）集中在入口文件里；动效依赖本地 `vendor/gsap.min.js`，**没有构建步骤，不走 CDN**。轻量回归测试在 `tests/`。

> 注意：项目目录名仍是「拍蚊子」、早期主题是「拍蚊子但蚊子是你爸」，现已彻底转型为纯打蚊子的「叮了个包」，**与"爸爸"主题无关**，蚊子也不再带表情包脸。

## 运行 / 调试

直接用浏览器打开 `index.html` 即可运行（或 `python -m http.server` 起本地服务器后访问）；改完刷新即可。用浏览器移动端模拟视图（窄屏竖屏）调试，布局针对 430px 与 `safe-area-inset` 适配。

自动检查：

```bash
node tests/dinggebao-regression.test.mjs
```

> **浏览器自动化测试的坑**：用 Claude-in-Chrome 等自动化工具操作时，后台标签的 `requestAnimationFrame` 会被浏览器节流，导致截图里「计时/移动/叮咬节奏」严重失真（看似卡住或异常跳变）。这不是游戏 bug——平衡性必须由真人在前台浏览器实测。验证逻辑正确性可用 `javascript_tool` 读 DOM 状态（`#life`/`#remain`/`#score`、`.mosquito` 的 class 与坐标、`.bump` 数量）。

## 核心架构

游戏逻辑全在 `index.html` 底部 `<script>` 的单个 IIFE 内。关键设计：

- **三关制状态机**：`level`（1→2→3）是核心分支。流程：开始等待页(`#start`) → 第1关 → 过场(`#between`) → 母蚊子孵化 → 第2关 → 愤怒蚊目标清零 → 第3关·蚊王 → 结算屏(`#result`)，靠 CSS class `hide`/`show` 切换。`running` 控制主循环 `loop()`（`requestAnimationFrame` 驱动）。注意关卡衔接两种模式：第1→2 关是 `endLevel1()` 停循环 + `delay(startLevel2)` 重启（有过场停顿，且可被退出清理）；第2→3 关是在运行中的 `loop()` 里直接调 `startLevel3()`，但不能 `return` 掉当前 `loop()`，否则本帧末尾不会重新申请 raf，Boss 战会卡在对峙画面。
- **开始等待页**：`#start` 使用 `assets/home-bg.png` 作为整屏背景图，不再显示额外标题、说明或最高纪录条；页面只保留底部三操作入口：`#startBtn` 开始游戏、`#rankBtn` 打开 fake 好友排行榜、`#shareBtn` 打开分享卡。
- **关卡内返回**：`#exitBtn` 只在 `#app.playing` 时显示，点击 `exitToStart()` 会停止 raf、清空场上蚊子/浮字/拍击圈、清理 `delay()` 计时器、隐藏过场/弹窗并回到开始页。
- **顶部 HUD（三 pill）**：左=生命 `#life`、中=关卡目标 `#remain`（第1关显示普通蚊剩余数；第2关显示 `angryRemaining` 愤怒蚊目标数；第3关显示 `kingShield` 护盾数）、右=分数 `#score`。`score` 是分数，不是拍死数量；`killedCount` 记录实际拍死的小蚊/护卫，`defeatedCount` 记录击败敌人总数（Boss 被打爆时也计入），结算页用 `resultStatsText()` 同时展示三者。
- **蚊子对象数组 `mosquitoes`**：每只 `{el,x,y,vx,vy,type,age,immune,state,biteCd,countsAngry,alive}`。`type` 为 `normal`/`revenge`（内部类型名沿用 `revenge`，玩家可见文案统一为「愤怒」）。`state` 状态机：`air`(空中游走) → `dive`(愤怒蚊俯冲额头) → `bite`(叮一下) → `retreat`(退避) → `air`。`updateMosquitoes()` 跑物理与状态机，`renderMosquito()` 写 transform。
- **第1关**：spawn `LV1_COUNT`(8) 只普通蚊子在空中飞，不攻击玩家。拍中即 `killMosquito()`（坠落动画 + `remaining--`）。`remaining` 清零触发 `endLevel1()` → 在额头中央留一只 `.mother` 母蚊子 → 过场 → `startLevel2()`。
- **第2关（报仇局）**：母蚊子 `hatch` 孵出一窝（`LV2_START` 只，其中 `LV2_START_REVENGE` 只是愤怒蚊）。之后按 `spawnInterval`（随时间从 `SPAWN_BASE` 递减到 `SPAWN_MIN`）持续 `breedFromMother()` 繁衍（场上愤怒蚊 < `MIN_REVENGE` 时强制补愤怒蚊），受 `MOB_CAP` 上限约束。第2关只把愤怒蚊计入 `angryRemaining`，普通蚊是干扰源；`angryRemaining<=0` → 进第3关 `startLevel3()`；`hp<=0` → `lose()`。
- **第3关·蚊王（终章 + 双结局）**：`startLevel3()` 先清空场上残留（保证蚊王唯一），spawn 唯一蚊王（`type:"king"`，戴 `.crown` 王冠、自带 `kingShield`=`KING_SHIELD` 层护盾、本身不攻击）+ `GUARD_COUNT` 名护卫（`type:"guard"`，绿头、叮咬扣 `GUARD_DAMAGE`=2 血）。`phase3` 状态机：
  - `standoff`（对峙）：蚊王头顶显示和平气泡(`#peacebubble`)，`standoffTimer` 倒计时 `STANDOFF_TIME`；期间 `canBite` 为 false（谁都不攻击）。倒计时归零未出手 → `peaceEnding()`（**和平结局**）。
  - `battle`（开战）：玩家在对峙期拍中蚊王或护卫即 `startBattle()`。蚊王 `enraged` 后按 `KING_SPAWN_*` 持续 `kingSummon()` 召唤小蚊（受 `L3_MOB_CAP` 约束），自身在上空游走躲避；护卫/召唤愤怒蚊俯冲叮人。拍蚊王 `hitKing()` 每下破 1 层盾，破光 → `battleWin()`（**战斗结局**）；`hp<=0` → `lose()`。
  - 蚊王/护卫也是 `mosquitoes` 数组里的对象（统一命中判定），但 `updateMosquitoes` 对 `king` 单独分支（游走、不 dive），`guard` 视同 `revenge`（会 dive 叮人）。`renderMosquito` 对 `king`/`mother` 跳过 transform（CSS 固定 scale，移动靠 left/top）。
- **愤怒蚊子 vs 普通蚊子的命中规则**（`hitMosquito()`）：第2关里——拍中 `revenge` 蚊 = 一拍即死(`killMosquito`，加分，并通过 `clearAngryTarget()` 扣 `angryRemaining`)；拍中 `normal` 蚊 = `enrage()` 激怒变 `revenge`（不死、不加分、断连击，并通过 `addAngryTarget()` 加入目标）→ 它转而俯冲叮你。所以误拍有惩罚，但普通蚊不会直接阻塞过关。
- **生命/额头红包**：愤怒蚊 `dive` 到 `biteY()`（额头顶部）触发 `biteForehead()`：`hp-=BITE_DAMAGE`、`addBump()` 在额头(`#forehead`)起一个 `.bump` 红包、`hurtFlash()` 红屏、退避 `BITE_COOLDOWN`。红包数量即已损血量的可视化。
- **拍子光标**：`#app{cursor:none}` 隐藏系统光标，`.swatter` 外层只负责跟随 `pointermove`/`pointerdown` 写入的 `left/top` 坐标；`.swatter-visual` 内层负责 `swat()` 挥拍动画。不要再把挥拍 animation 加回 `.swatter` 外层，否则会覆盖坐标 transform，造成拍子跳位。
- **连击系统**：连续击杀累积 `combo`，`combo>=6` 得分 ×2、`>=12` ×3；间隔超 1.5s 或空挥/误拍/被愤怒则 `breakCombo()`。`#combo` 大字（高连击转红 `hot`），`#comboBurn` 火焰背景随连击强度递增，动效用本地 GSAP 增强，缺失 GSAP 时退回 CSS。
- **反馈层**：`splat()`(拍击圈)、`floatText()`(飘字，台词数组 `deathLines`/`enrageLines`/`biteLines`)、`shake()`(震屏)、`hurtFlash()`(受伤红闪)、`vibrate()`(触感增强，设备不支持则静默跳过)、`tone()`(WebAudio 程序化音效，须在首次点 `#startBtn` 时创建并 resume `audioCtx`)。
- **最高分**：`localStorage` 键 `dinggebao_best`，结算屏展示，破纪录显示「新纪录!」。

## 修改约定

- **平衡数值集中在 IIFE 顶部一组常量**（`LV1_COUNT`/`MAX_HP`/`HIT_RADIUS`/`LV2_START`/`LV2_START_REVENGE`/`SPAWN_BASE`/`SPAWN_MIN`/`MIN_REVENGE`(场上愤怒蚊低于此数时 `breedFromMother` 强制补愤怒蚊)/`MOB_CAP`/`BITE_DAMAGE`/`BITE_COOLDOWN`，以及第三关的 `KING_SHIELD`/`STANDOFF_TIME`/`GUARD_DAMAGE`/`KING_SPAWN_BASE`/`KING_SPAWN_MIN`/`L3_MOB_CAP`），调难度优先改这里。
- 文案（标题、台词、结算文字）均为内联中文字符串，注意保持 UTF-8 与休闲调侃语气，**不要再引入"爸爸"等旧主题**。
- 配色与「卡通描边 + 厚阴影」风格集中在 `:root` CSS 变量（含 `--skin`/`--skin-d` 肤色）与各 class 的 `box-shadow`，改视觉时优先复用变量。
- 额头(`.forehead`)、发际线(`.hairline`)、眉毛(`.brow`)共同构成"仰视的大脑门"；蚊子造型由 `.mosquito` 的 `.wing/.head/.body/.proboscis/.legs` 子元素纯 CSS 拼出，愤怒态加 `.revenge`。
- GSAP 必须继续本地加载：`<script src="vendor/gsap.min.js"></script>`。不要换成 CDN，避免离线交付失效。

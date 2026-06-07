import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const htmlPath = join(root, "index.html");
const html = readFileSync(htmlPath, "utf8");

test("all user-facing revenge labels are renamed to anger labels", () => {
  assert.equal(html.includes("\u53cd\u6740"), false);
  assert.match(html, /content:"愤怒"/);
});

test("level 2 objective counts angry mosquitoes only", () => {
  assert.match(html, /var\s+angryRemaining\s*=\s*0;/);
  assert.match(html, /function\s+addAngryTarget\s*\(/);
  assert.match(html, /function\s+clearAngryTarget\s*\(/);
  assert.match(html, /if\s*\(\s*level\s*===\s*2\s*&&\s*m\.type\s*===\s*"revenge"\s*\)\s*\{\s*clearAngryTarget\s*\(\s*m\s*\)/);
  assert.doesNotMatch(html, /remaining\+\+;/);
});

test("level 2 to boss transition keeps the game loop alive", () => {
  assert.doesNotMatch(html, /if\s*\(\s*angryRemaining\s*<=\s*0\s*\)\s*\{\s*startLevel3\s*\(\s*\)\s*;\s*return\s*;\s*\}/);
  assert.match(html, /if\s*\(\s*angryRemaining\s*<=\s*0\s*\)\s*\{\s*startLevel3\s*\(\s*\)\s*;\s*\}/);
  assert.match(html, /if\s*\(\s*level\s*===\s*3\s*\)\s*\{\s*updateKing\s*\(\s*dt\s*\)\s*;\s*\}/);
});

test("start screen exposes bottom start, rank, and share actions", () => {
  assert.match(html, /id="startActions"/);
  assert.match(html, /id="startBtn"/);
  assert.match(html, /id="rankBtn"/);
  assert.match(html, /id="shareBtn"/);
  assert.match(html, /id="rankModal"/);
  assert.match(html, /id="shareModal"/);
  assert.match(html, /assets\/home-bg\.png/);
  assert.doesNotMatch(html, /class="start-hero"/);
  assert.doesNotMatch(html, /class="start-badge"/);
  assert.doesNotMatch(html, /class="start-copy"/);
  assert.doesNotMatch(html, /id="bestStart"/);

  const bgPath = join(root, "assets/home-bg.png");
  assert.ok(statSync(bgPath).size > 100000);
});

test("gsap is bundled locally and loaded before the game script", () => {
  assert.match(html, /<script src="vendor\/gsap\.min\.js"><\/script>/);
  const scriptIndex = html.indexOf('<script src="vendor/gsap.min.js"></script>');
  const gameIndex = html.indexOf("<script>", scriptIndex + 1);
  assert.ok(scriptIndex >= 0 && gameIndex > scriptIndex);

  const gsapPath = join(root, "vendor/gsap.min.js");
  assert.ok(statSync(gsapPath).size > 1000);
});

test("hit and kill interactions trigger vibration feedback", () => {
  assert.match(html, /function\s+vibrate\s*\(/);
  assert.match(html, /navigator\.vibrate/);
  assert.match(html, /vibrate\s*\(\s*"swat"\s*\)/);
  assert.match(html, /vibrate\s*\(\s*"hit"\s*\)/);
});

test("gameplay exposes a return-to-home button", () => {
  assert.match(html, /id="exitBtn"/);
  assert.match(html, /class="[^"]*\bexit-btn\b/);
  assert.match(html, /function\s+exitToStart\s*\(/);
  assert.match(html, /exitBtn\.addEventListener\("click",\s*exitToStart\)/);
  assert.match(html, /startScreen\.classList\.remove\("hide"\)/);
});

test("swatter keeps pointer positioning separate from swing animation", () => {
  assert.match(html, /id="swatterVisual"/);
  assert.match(html, /var\s+swatterVisual\s*=\s*document\.getElementById\("swatterVisual"\)/);
  assert.match(html, /\.swatter-visual\.swat\{animation:swat/);
  assert.doesNotMatch(html, /\.swatter\.swat\{animation:swat/);
  assert.doesNotMatch(html, /@keyframes\s+swat\s*\{[\s\S]*translate\(-50%,-30px\)/);
});

test("score is distinct from kill counts and animates when it changes", () => {
  assert.match(html, /<small>分数<\/small><b id="score">0<\/b>/);
  assert.match(html, /var\s+defeatedCount\s*=\s*0;/);
  assert.match(html, /var\s+killedCount\s*=\s*0;/);
  assert.match(html, /var\s+lastScoreRendered\s*=\s*-1;/);
  assert.match(html, /\.score-pop/);
  assert.match(html, /scoreEl\.classList\.add\("score-pop"\)/);
  assert.match(html, /击败\s*"\s*\+\s*defeatedCount\s*\+\s*"\s*个敌人，拍死\s*"\s*\+\s*killedCount\s*\+\s*"\s*只蚊子，得分\s*"\s*\+\s*score\s*\+\s*"\s*分/);
});

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

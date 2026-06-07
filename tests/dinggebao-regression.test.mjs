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

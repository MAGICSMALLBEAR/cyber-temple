const { launch, newContext, waitFor } = require("./helpers");
module.exports = {
  name: "同行對話與閒置省電",
  async run({ base, check }) {
    const browser = await launch(), ctx = await newContext(browser);
    const p = await ctx.newPage(), other = await ctx.newPage();
    const errors = []; p.on("pageerror", e => errors.push(e.message)); other.on("pageerror", e => errors.push(e.message));
    await p.goto(base); await other.goto(base);
    await p.evaluate(() => { window.temple3d.avatar.config.title = "平安小明"; window.temple3d.avatar.speak("大家平安 🙏"); });
    check("自己頭上出現文字泡泡", await p.evaluate(() => !!window.temple3d.avatar.speechSprite));
    check("真人同行收到同一段文字", await waitFor(() => other.evaluate(() => [...window.temple3d.avatar.peers.values()].some(peer => peer.speechSprite && peer.lastSpeechId)), { timeout: 10000 }));
    check("連發有冷卻", !(await p.evaluate(() => window.temple3d.avatar.speak("太快了"))));
    await p.waitForTimeout(6500);
    check("心跳不會讓舊泡泡重新出現", await other.evaluate(() => [...window.temple3d.avatar.peers.values()].every(peer => !peer.speechSprite)));
    await p.evaluate(() => { window.temple3d.avatar.speak("很長的句子".repeat(20)); });
    check("長訊息限制 32 字", await p.evaluate(() => Array.from(window.temple3d.avatar.speech.text).length === 32));
    const why = await p.evaluate(() => {
      const el = document.getElementById("btnOpenEmotes"), r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { visible: r.width > 0 && getComputedStyle(el).visibility !== "hidden", at: `${Math.round(r.x)},${Math.round(r.y)}`, covered: top && !top.closest("#btnOpenEmotes") ? (top.id || top.className || top.tagName) : "", body: document.body.className };
    });
    check("表情按鈕可見且沒被擋住", why.visible && !why.covered, JSON.stringify(why));
    await p.click("#btnOpenEmotes", { timeout: 8000 });
    check("快捷語可以從表情面板使用", await p.locator("#quickSpeechGrid button").count() >= 6);
    await p.waitForTimeout(2100);
    await p.fill("#speechInput", "謝謝，一起參拜"); await p.click('#speechForm button');
    check("輸入短句並送出", await p.evaluate(() => window.temple3d.avatar.speech.text === "謝謝，一起參拜" && document.getElementById("speechInput").value === ""));
    await other.close();

    await p.evaluate(() => {
      window.templePower.idleAfter = 100;
      window.templePower.lastActive = performance.now() - 200;
      window.__renderStart = window.temple3d.renderer.info.render.frame;
    });
    await p.waitForTimeout(1200);
    check("閒置時降低實際繪圖頻率", await p.evaluate(() => window.templePower.status === "idle" && window.temple3d.renderer.info.render.frame - window.__renderStart <= 20));
    check("閒置不累積畫質降級計數", await p.evaluate(() => window.templeQuality.lowFpsWindows === 0));
    await p.keyboard.press("KeyW");
    check("操作立即喚醒", await p.evaluate(() => window.templePower.status === "active"));
    await p.evaluate(() => { window.templePower.idleAfter = 30000; window.templePower.wake(); window.__hide = true; Object.defineProperty(document, "hidden", { configurable: true, get: () => window.__hide }); document.dispatchEvent(new Event("visibilitychange")); window.__renderStart = window.temple3d.renderer.info.render.frame; window.__beat = window.temple3d.avatar.lastBroadcastTime; });
    await p.waitForTimeout(2300);
    check("背景暫停繪圖", await p.evaluate(() => window.temple3d.renderer.info.render.frame === window.__renderStart));
    check("背景仍持續送出心跳", await p.evaluate(() => window.temple3d.avatar.lastBroadcastTime > window.__beat));
    await p.evaluate(() => { window.__hide = false; document.dispatchEvent(new Event("visibilitychange")); });
    await p.waitForTimeout(200);
    check("回到前景恢復繪圖", await p.evaluate(() => window.temple3d.renderer.info.render.frame > window.__renderStart));
    await p.evaluate(() => { window.templePower.limit = 30; localStorage.setItem("temple_frame_limit", "30"); });
    await p.reload();
    check("流暢度上限保存", await p.evaluate(() => window.templePower.limit === 30));
    check("沒有 JavaScript 錯誤", errors.length === 0, errors.join(" | "));
    await browser.close();
  }
};

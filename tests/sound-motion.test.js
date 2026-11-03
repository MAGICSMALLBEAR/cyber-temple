// 聲音面板與三軌音量、靜音、減少動態效果、頂部列寬度
const fs = require("fs");
const path = require("path");
const { ROOT, launch, newContext } = require("./helpers");

module.exports = {
  name: "聲音分軌與減少動態",
  async run({ base, check }) {
    // 音效引擎裡只有兩條匯流排直接接喇叭，其餘聲音都必須經過匯流排才吃得到音量設定
    const audioSrc = fs.readFileSync(path.join(ROOT, "audio.js"), "utf8");
    check("audio.js 只有匯流排直接接到喇叭", (audioSrc.match(/connect\(this\.ctx\.destination\)/g) || []).length === 2);

    const browser = await launch();
    const ctx = await newContext(browser, { viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);

    // --- 頂部列 ---
    const row = await p.evaluate(() => {
      const r = document.querySelector(".header-status").getBoundingClientRect();
      return { height: Math.round(r.height), bgmInHeader: !!document.querySelector(".header-status #btnToggleBGM") };
    });
    check("1280 寬時頂部列維持一排", row.height < 45, `高 ${row.height}px`);
    check("禪音、靜音按鈕已收進聲音面板", !row.bgmInHeader);

    // --- 聲音面板開關 ---
    await p.click("#btnSoundMenu");
    const panel = await p.evaluate(() => {
      const el = document.getElementById("soundMenuPanel"), r = el.getBoundingClientRect();
      return { open: el.classList.contains("open"), inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0, expanded: document.getElementById("btnSoundMenu").getAttribute("aria-expanded") };
    });
    check("點「🔊 聲音」打開面板且不超出螢幕", panel.open && panel.inView && panel.expanded === "true");
    await p.keyboard.press("Escape");
    check("Esc 關閉聲音面板", !(await p.evaluate(() => document.getElementById("soundMenuPanel").classList.contains("open"))));

    // --- 三軌音量 ---
    // 瀏覽器要求先有使用者操作才允許出聲：用真實點擊開面板，再恢復音效引擎
    await p.click("#btnSoundMenu");
    const audioState = await p.evaluate(async () => { window.templeAudio.init(); await window.templeAudio.ctx.resume(); return window.templeAudio.ctx.state; });
    check("音效引擎在使用者點擊後可運作", audioState === "running", audioState);
    // 等淡入淡出（0.15 秒）跑完再讀實際音量
    const settled = () => p.evaluate(() => new Promise(r => setTimeout(() => r({ sfx: window.templeAudio.sfxBus.gain.value, music: window.templeAudio.musicBus.gain.value }), 400)));
    await p.$eval('#soundMenuPanel input[data-track="sfx"]', el => { el.value = "40"; el.dispatchEvent(new Event("input", { bubbles: true })); });
    await p.$eval('#soundMenuPanel input[data-track="music"]', el => { el.value = "25"; el.dispatchEvent(new Event("input", { bubbles: true })); });
    const vol = { ...(await settled()), ...(await p.evaluate(() => ({ saved: JSON.parse(localStorage.getItem("temple_audio_volumes")), label: document.querySelector('output[data-track-value="sfx"]').textContent }))) };
    check("科儀音效滑桿調到 40%", Math.abs(vol.sfx - 0.4) < 0.001 && vol.label === "40%", `${vol.sfx} / ${vol.label}`);
    check("背景音滑桿調到 25%", Math.abs(vol.music - 0.25) < 0.001, String(vol.music));
    check("音量設定已儲存", vol.saved.sfx === 0.4 && vol.saved.music === 0.25);

    // 語音開示音量套用到朗讀
    await p.$eval('#soundMenuPanel input[data-track="voice"]', el => { el.value = "60"; el.dispatchEvent(new Event("input", { bubbles: true })); });
    const spoken = await p.evaluate(() => {
      let captured = null;
      const orig = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = u => { captured = u.volume; };
      window.templeAudio.speakDivineMessage("測試聖諭");
      window.speechSynthesis.speak = orig;
      return captured;
    });
    check("語音開示以 60% 音量朗讀", Math.abs(spoken - 0.6) < 0.001, String(spoken));

    // --- 靜音：連背景音一起歸零 ---
    await p.click("#btnToggleMute");
    const muted = { ...(await settled()), label: await p.$eval("#btnSoundMenu", e => e.textContent) };
    check("靜音時兩軌都歸零（背景音也停）", muted.sfx < 0.001 && muted.music < 0.001, `${muted.sfx} / ${muted.music}`);
    check("頂部按鈕顯示靜音中", muted.label.includes("靜音中"), muted.label);
    await p.click("#btnToggleMute");
    const unmuted = (await settled()).sfx;
    check("取消靜音恢復原音量", Math.abs(unmuted - 0.4) < 0.001, String(unmuted));

    await p.reload();
    const reloaded = await p.$eval('#soundMenuPanel input[data-track="sfx"]', el => el.value);
    check("重新整理後滑桿保留 40%", reloaded === "40", reloaded);

    // --- 減少動態 ---
    const motion = () => p.evaluate(() => ({
      body: document.body.classList.contains("reduce-motion"),
      danmaku: getComputedStyle(document.getElementById("danmakuContainer")).display,
      dust: window.temple3d.dustPoints.geometry.drawRange.count,
      stars: window.temple3d.starPoints.geometry.drawRange.count,
      box: document.getElementById("chkReduceMotion").checked
    }));
    let m = await motion();
    check("系統沒要求時預設關閉減少動態", !m.body && !m.box && m.danmaku !== "none");
    await p.evaluate(() => document.getElementById("btnOpenSettings").click());
    await p.click("#chkReduceMotion");
    m = await motion();
    check("開啟後隱藏飛行彈幕、金塵不畫", m.body && m.danmaku === "none" && m.dust === 0);
    check("星空不受影響", m.stars > 0, String(m.stars));
    await p.evaluate(() => window.temple3d.setWeather("rain"));
    check("開啟時切到下雨，雨絲也不畫", (await p.evaluate(() => window.temple3d.weatherPoints.geometry.drawRange.count)) === 0);
    await p.reload();
    check("重新整理後保留減少動態", (await motion()).body);
    await p.evaluate(() => document.getElementById("btnOpenSettings").click());
    await p.click("#chkReduceMotion");
    m = await motion();
    check("關閉後恢復彈幕與金塵", !m.body && m.danmaku !== "none" && m.dust > 0);
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));

    // --- 系統設定為減少動態時，預設就開啟 ---
    const ctx2 = await newContext(browser, { reducedMotion: "reduce" });
    const q = await ctx2.newPage();
    await q.goto(base);
    check("系統要求減少動態時預設開啟", await q.evaluate(() => document.body.classList.contains("reduce-motion") && document.getElementById("chkReduceMotion").checked));
    await browser.close();
  }
};

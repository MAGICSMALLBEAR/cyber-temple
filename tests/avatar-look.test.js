// 捏臉與表情動作：五官看得到、即時預覽、沒儲存會還原、造型代碼、表情與動作，以及同殿的人看到的一致
const { launch, newContext, waitFor } = require("./helpers");

module.exports = {
  name: "捏臉與表情動作",
  async run({ base, check }) {
    const browser = await launch();
    const ctx = await newContext(browser, { viewport: { width: 1300, height: 820 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);

    // --- 臉部繪製 ---
    const faces = await p.evaluate(() => {
      const hash = tex => { const c = tex.image; const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) | 0; return h; };
      const eyes = Object.keys(AVATAR_OPTIONS.eyes.choices).map(e => hash(drawAvatarFace({ eyes: e })));
      const head = window.temple3d.avatar.limbs.head;
      const face = head.children.find(c => c.name === "avatarFace");
      return { eyesDistinct: new Set(eyes).size, eyesTotal: eyes.length, faceOnHead: !!face, faceRadius: face && face.geometry.parameters.radius, headRadius: head.geometry.parameters.radius };
    });
    check("每種眼睛畫出來都不一樣", faces.eyesDistinct === faces.eyesTotal, `${faces.eyesDistinct}/${faces.eyesTotal}`);
    check("五官貼在頭部表面之外（不會被頭包住）", faces.faceOnHead && faces.faceRadius > faces.headRadius, `${faces.faceRadius} > ${faces.headRadius}`);

    // --- 換造型面板 ---
    await p.click("#btnOpenAvatar");
    const studio = await p.evaluate(() => {
      const m = document.getElementById("avatarModal");
      return { open: m.classList.contains("open"), passThrough: getComputedStyle(m).pointerEvents === "none", panelRight: document.querySelector("#avatarModal .settings-modal").getBoundingClientRect().right > innerWidth - 30 };
    });
    check("換造型是右側面板，不擋住 3D 畫面", studio.open && studio.passThrough && studio.panelRight);
    const camFront = await waitFor(() => p.evaluate(() => {
      const t = window.temple3d, a = t.avatar;
      const yaw = a.playerGroup.rotation.y, toCam = t.camera.position.clone().sub(a.position);
      return toCam.x * Math.sin(yaw) + toCam.z * Math.cos(yaw) > 1.5;
    }), { timeout: 5000 });
    check("打開時鏡頭轉到分身正面", camFront);

    await p.click('[data-look-key="eyes"][data-look-value="heart"]');
    await p.click('[data-studio-tab="hair"]');
    await p.click('[data-look-key="hair"][data-look-value="ponytail"]');
    const live = await p.evaluate(() => ({ eyes: window.temple3d.avatar.config.eyes, hair: window.temple3d.avatar.config.hair }));
    check("點選項後分身即時改變", live.eyes === "heart" && live.hair === "ponytail", JSON.stringify(live));
    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);
    const reverted = await p.evaluate(() => window.temple3d.avatar.config.eyes);
    check("沒按儲存就關閉會恢復原本造型", reverted !== "heart", reverted);
    check("關閉後鏡頭距離限制恢復", (await p.evaluate(() => window.temple3d.controls.minDistance)) === 1.4);

    await p.click("#btnOpenAvatar");
    await p.click('[data-look-key="eyes"][data-look-value="star"]');
    await p.click('[data-look-key="skin"][data-look-value="deep"]');
    await p.click('[data-studio-tab="name"]');
    const code = await p.$eval("#studioLookCode", e => e.value);
    check("顯示造型代碼", /^TP-[0-9a-z]{8}-[0-9a-f]{6}$/.test(code), code);
    await p.fill("#studioLookCode", "亂打的代碼");
    await p.click("#btnStudioApplyCode");
    check("錯誤的代碼會提示", (await p.$eval("#studioCodeNote", e => e.textContent)).includes("格式不對"));
    await p.click("#btnSaveAvatar");
    await p.waitForTimeout(300);
    await p.reload();
    const saved = await p.evaluate(() => ({ eyes: window.temple3d.avatar.config.eyes, skin: window.temple3d.avatar.config.skin }));
    check("儲存後重新整理仍是新造型", saved.eyes === "star" && saved.skin === "deep", JSON.stringify(saved));
    const roundTrip = await p.evaluate(c => { const d = decodeLookCode(c); return d && d.eyes === "star" && d.skin === "deep"; }, code);
    check("造型代碼可以還原成同一套造型", roundTrip);

    // --- 表情與動作 ---
    const barOk = await p.evaluate(() => {
      const b = document.getElementById("btnOpenEmotes").getBoundingClientRect();
      return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest("#btnOpenEmotes") !== null;
    });
    check("左下動作列的表情按鈕沒有被底部按鈕列蓋住", barOk);
    await p.focus("body");
    await p.keyboard.press("KeyT");
    const panel = await p.evaluate(() => {
      const r = document.getElementById("emotePanel").getBoundingClientRect(), bar = document.getElementById("avatarActionBar").getBoundingClientRect();
      return { open: document.getElementById("emotePanel").classList.contains("open"), clear: r.left >= bar.right };
    });
    check("按 T 打開表情面板，且不蓋住動作列", panel.open && panel.clear);
    await p.click('[data-emote="love"]');
    check("表情跳在頭上", await p.evaluate(() => !!window.temple3d.avatar.emoteSprite));
    await p.waitForTimeout(3400);
    check("表情 3 秒後消失", await p.evaluate(() => !window.temple3d.avatar.emoteSprite));

    await p.click('[data-emote-action="wave"]');
    await p.waitForTimeout(400);
    check("揮手動作舉起右手", await p.evaluate(() => window.temple3d.avatar.limbs.armR.rotation.z > 2), String(await p.evaluate(() => window.temple3d.avatar.limbs.armR.rotation.z)));
    await p.click('[data-emote-action="lie"]');
    await p.waitForTimeout(400);
    check("躺平時身體橫躺", await p.evaluate(() => window.temple3d.avatar.playerGroup.rotation.x < -1));
    await p.click("#btnStopAction");
    await p.waitForTimeout(300);
    check("停止後站起來、姿勢歸零", await p.evaluate(() => Math.abs(window.temple3d.avatar.playerGroup.rotation.x) < 1e-6 && window.temple3d.avatar.currentAction === "idle"));
    const bowCounted = await p.evaluate(() => { let n = 0; const f = e => { if (e.detail.type === "bow") n++; }; window.addEventListener("temple:ritual", f); document.querySelector('[data-emote-action="deepBow"]').click(); window.removeEventListener("temple:ritual", f); return n; });
    check("鞠躬九十度算每日功課的行禮", bowCounted === 1);
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));

    // --- 同殿的人看到的一致（兩個獨立瀏覽器，經伺服器同步）---
    const b2 = await launch();
    const ctx2 = await newContext(b2);
    await ctx2.addInitScript(() => localStorage.setItem("temple_avatar_cfg", JSON.stringify({ roleType: "novice", robeColor: "#2a5298", hatType: "none", title: "乙", holdingItem: "none", eyes: "heart", hair: "twinbuns", skin: "fair" })));
    const q = await ctx2.newPage();
    await q.goto(base);
    const peerId = await waitFor(() => p.evaluate(() => {
      for (const [id, peer] of window.temple3d.avatar.peers) if (peer.config && peer.config.eyes === "heart") return id;
      return null;
    }), { timeout: 25000 });
    check("看得到對方的捏臉設定", !!peerId);
    const peerLook = await p.evaluate(id => {
      const peer = window.temple3d.avatar.peers.get(id);
      const face = peer.limbs.head.children.find(c => c.name === "avatarFace");
      return { face: !!face, hairParts: peer.limbs.head.children.length };
    }, peerId);
    check("對方分身有五官與髮型", peerLook.face && peerLook.hairParts >= 3, JSON.stringify(peerLook));
    await q.evaluate(() => window.temple3d.avatar.playEmote("party"));
    check("看得到對方的頭上表情", await waitFor(() => p.evaluate(id => { const peer = [...window.temple3d.avatar.peers.values()].find(x => x.config && x.config.title === "乙"); return peer && peer.emoteId === "party" && !!peer.emoteSprite; }), { timeout: 10000 }));
    await q.evaluate(() => window.temple3d.avatar.triggerAction("jump"));
    check("看得到對方的動作", await waitFor(() => p.evaluate(() => { const peer = [...window.temple3d.avatar.peers.values()].find(x => x.config && x.config.title === "乙"); return peer && peer.action === "jump"; }), { timeout: 10000 }));
    await q.evaluate(() => { window.temple3d.avatar.customize({ eyes: "swirl" }); window.temple3d.avatar.broadcastMyState(true); });
    check("對方換造型後這邊跟著更新", await waitFor(() => p.evaluate(() => [...window.temple3d.avatar.peers.values()].some(x => x.config && x.config.eyes === "swirl")), { timeout: 10000 }));
    await b2.close();
    await browser.close();
  }
};

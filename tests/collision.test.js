// 角色碰撞：不能穿牆、柱、神案、水面；出入口與拱橋走得過；撞牆會沿牆滑、點地面走被擋會停；
// 從出生點走得到的範圍內，每個 [E] 觸發點都要走得到觸發距離以內（否則加了碰撞反而按不到）
const { launch, newContext, waitFor } = require("./helpers");

// triggerNearbyInteraction 裡的觸發點：[名稱, x, z, 觸發距離]
const TRIGGERS = [
  ["天公爐", 0, 11.5, 2.2], ["服務處", -5.2, 8.2, 2.2], ["蓮花許願池", 12.5, 13.5, 3.2], ["八角金爐", -12.5, 14.5, 2.8],
  ["祈願木牌閣", -13.5, 8.5, 2.6], ["文昌閣", 13.5, 5.5, 3.2], ["月老閣", 13.5, 23.5, 3.2],
  ["財神洞窟", -13.5, 23.5, 3.2], ["太歲殿", -13.5, 5.5, 3.2], ["山門", 0, 38, 3.8],
  ["西石獅", -5.5, 34, 2.6], ["東石獅", 5.5, 34, 2.6], ["香案", 0, 0, 1.6], ["筊杯", 0, 1.8, 1.4],
  ["籤筒", 1.4, 0, 1.5], ["木魚", -1.4, 0, 1.5], ["東天鐘樓", 9.5, 30, 3.2], ["西暮鼓樓", -9.5, 30, 3.2]
];

module.exports = {
  name: "角色碰撞",
  async run({ base, check, note }) {
    const browser = await launch();
    const ctx = await newContext(browser);
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);

    // 讓分身朝某方向走一段時間，回傳最後位置
    const walk = (dir, ms, from) => p.evaluate(async ({ dir, ms, from }) => {
      const a = window.temple3d.avatar;
      if (from) { a.position.set(from[0], 0, from[1]); a.targetPos = null; }
      // 此組量測固定世界方位的障礙，先把鏡頭對準北方，再輸入畫面方向。
      const t = window.temple3d;
      t.camera.position.copy(a.position).add(new THREE.Vector3(0, 2.5, 5));
      t.controls.target.copy(a.position).add(new THREE.Vector3(0, 1.1, 0));
      t.camera.lookAt(t.controls.target);
      t.followAvatar = true; t.targetCameraPos = null; t.targetLookAt = null;
      Object.keys(a.keys).forEach(k => { a.keys[k] = false; });
      dir.forEach(k => { a.keys[k] = true; });
      a.isSprinting = true;
      await new Promise(r => setTimeout(r, ms));
      Object.keys(a.keys).forEach(k => { a.keys[k] = false; });
      a.isSprinting = false;
      return [a.position.x, a.position.y, a.position.z];
    }, { dir, ms, from });

    check("出生點沒有卡在障礙裡", !(await p.evaluate(() => window.temple3d.isBlockedAt(window.temple3d.avatar.position.x, window.temple3d.avatar.position.z))));

    let pos = await walk(["forward"], 2500, [0, 2.0]);
    check("往後走撞到神案就停（不穿過去）", pos[2] > 0.2, `z=${pos[2].toFixed(2)}`);
    pos = await walk(["left"], 2500, [-2.5, 4.0]);
    check("往左走撞到大殿柱子或牆就停", pos[0] > -3.6, `x=${pos[0].toFixed(2)}`);
    pos = await walk(["backward"], 2500, [0, 4.0]);
    check("大殿正門走得出去（走到廟埕）", pos[2] > 7, `z=${pos[2].toFixed(2)}`);
    pos = await walk(["forward", "right"], 1500, [0, 2.0]);
    check("斜著撞神案會沿著神案滑開，不會整個卡住", pos[0] > 1.0, `x=${pos[0].toFixed(2)} z=${pos[2].toFixed(2)}`);

    // 蓮花池：水面不能走，拱橋走得過且會站上橋面
    pos = await walk(["forward"], 2500, [12.5, 21.0]);
    check("不能從南邊走進池水", pos[2] > 19.4, `z=${pos[2].toFixed(2)}`);
    const bridge = await p.evaluate(async () => {
      const a = window.temple3d.avatar;
      a.position.set(7.6, 0, 13.5);
      Object.keys(a.keys).forEach(k => { a.keys[k] = false; });
      a.keys.right = true;
      let maxY = 0, maxDrawnY = 0;
      // 低幀率時每幀步長有上限，走同樣時間的距離會變短；以走到橋尾為準，只用上限防止卡死
      for (let i = 0; i < 300 && a.position.x <= 15; i++) {
        await new Promise(r => setTimeout(r, 60));
        maxY = Math.max(maxY, a.position.y);
        maxDrawnY = Math.max(maxDrawnY, a.playerGroup.position.y);   // 畫面上實際畫出來的高度
      }
      a.keys.right = false;
      return { x: a.position.x, maxY, maxDrawnY };
    });
    check("沿拱橋從西走到東", bridge.x > 15, `x=${bridge.x.toFixed(2)}`);
    check("走在橋上時站上橋面高度", bridge.maxY > 0.5, `最高 y=${bridge.maxY.toFixed(2)}`);
    check("畫面上的分身也真的站在橋面上（不是陷在橋裡）", bridge.maxDrawnY > 0.5, `畫出的最高 y=${bridge.maxDrawnY.toFixed(2)}`);

    // 點地面走向牆：被擋住後停下，不在原地踏步
    const stopped = await p.evaluate(async () => {
      const a = window.temple3d.avatar;
      a.position.set(0, 0, 2.0);
      a.targetPos = new THREE.Vector3(0, 0, -3);
      await new Promise(r => setTimeout(r, 2500));
      return { target: a.targetPos, moving: a.isMoving };
    });
    check("點地面走向神案被擋住後停下", stopped.target === null && !stopped.moving);

    // 已經卡在障礙裡（例如被傳送進去）時要能走出來
    pos = await walk(["backward"], 1500, [0, -0.6]);
    check("卡在障礙裡時可以走出來", pos[2] > 0.3, `z=${pos[2].toFixed(2)}`);

    // 從出生點以 0.2m 格子找出走得到的範圍，確認每個觸發點都走得到
    const unreachable = await p.evaluate(triggers => {
      const t = window.temple3d, step = 0.2;
      const inBounds = (x, z) => z >= -2.8 && z <= 41.5 && Math.abs(x) <= (z > 5.8 ? 17.5 : 3.8);
      const key = (i, j) => i + "," + j;
      const seen = new Set();
      const queue = [[0, 20]];   // 出生點 (0, 4) 換算成格子
      seen.add(key(0, 20));
      const cells = [];
      while (queue.length) {
        const [i, j] = queue.shift();
        const x = i * step, z = j * step;
        cells.push([x, z]);
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = i + di, nj = j + dj, k = key(ni, nj);
          if (seen.has(k)) continue;
          seen.add(k);
          const nx = ni * step, nz = nj * step;
          if (inBounds(nx, nz) && !t.isBlockedAt(nx, nz)) queue.push([ni, nj]);
        }
      }
      return triggers.filter(([, tx, tz, d]) => !cells.some(([x, z]) => Math.hypot(x - tx, z - tz) < d - 0.1)).map(t => t[0]);
    }, TRIGGERS);
    check("每個 [E] 觸發點都走得到觸發距離以內", unreachable.length === 0, unreachable.join("、"));
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));
    await browser.close();
  }
};

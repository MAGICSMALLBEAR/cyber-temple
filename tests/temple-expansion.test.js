const { makeEnvironment } = require("./light-env");
module.exports = {
  name: "獨立神尊、節慶與進階成就（無繪圖）",
  async run({ check, note }) {
    const THREE = await import("three"), env = makeEnvironment(THREE), c = env.context;
    for (const file of ["scene/core.js", "scene/deities.js", "scene/seasonal.js", "scene/interior.js", "scene/collision.js", "daily.js", "inventory.js", "avatar/core.js", "avatar/relics.js", "app/achievements.js", "app/amulet.js", "save-data.js"]) env.load(file);
    const scene = Object.create(c.Temple3DScene.prototype); scene.scene = new THREE.Scene(); scene.buildDeityThrone();
    const ids = ["mazu", "wenchang", "caishen", "yuelao", "guanyin", "guangong", "tudigong", "guaiguai"], signatures = new Set();
    for (const id of ids) {
      scene.switchDeityStatue(id); scene.deityStatue.geometry.computeBoundingBox();
      signatures.add(scene.deityStatue.geometry.type + JSON.stringify(scene.deityStatue.geometry.attributes.position.array));
      let finite = true, meshes = 0;
      scene.deityModel.traverse(o => { if (o.isMesh) { meshes++; if ([...o.geometry.attributes.position.array].some(n => !Number.isFinite(n))) finite = false; } });
      check(`${id} 有獨立身形、臉與完整幾何`, scene.deityModel.userData.deity === id && scene.deityHead.parent === scene.deityModel && finite && meshes > 12);
    }
    check("八位神尊主體幾何各不相同", signatures.size === 8);
    scene.switchDeityStatue("guangong"); const old = scene.deityModel; let released = 0;
    old.traverse(o => o.geometry?.addEventListener("dispose", () => released++));
    check("關公使用赤面", scene.deityHead.material.color.getHex() === 0xa93930);
    scene.switchDeityStatue("mazu");
    check("換神尊時釋放舊模型且不殘留赤面", !old.parent && released > 12 && scene.deityHead.material.color.getHex() === 0xe6b58b);
    for (let n = 0; n < 3; n++) for (const id of ids) scene.switchDeityStatue(id);
    check("重複切換只保留一尊與一個光環", scene.throneGroup.children.length === 2);

    const themeOf = env.run("templeFestivalTheme"), date = (y, m, d) => new Date(y, m - 1, d, 12);
    for (const [d, theme] of [[date(2026, 2, 16), "newyear"], [date(2026, 2, 17), "newyear"], [date(2026, 3, 3), "lantern"], [date(2026, 9, 25), "moon"], [date(2026, 8, 6), "birthday"], [date(2026, 11, 5), "none"], [date(2025, 7, 25), "none"]]) {
      check(`${d.toISOString().slice(0, 10)} 自動布置 ${theme}`, themeOf(d) === theme);
    }
    for (const theme of ["newyear", "lantern", "moon", "birthday"]) {
      scene.applySeasonalScene(theme); const oldGroup = scene.seasonalGroup;
      const meshes = oldGroup.children.length; scene.applySeasonalScene(theme);
      check(`${theme} 布置可預覽且不重複建立`, meshes > 4 && scene.seasonalGroup === oldGroup && oldGroup.userData.noCollision);
      let lights = 0; oldGroup.traverse(o => { if (o.isLight) lights++; }); check(`${theme} 不增加裝飾光源`, lights === 0);
      scene.buildCollisionMap(); check(`${theme} 裝飾不加入導航碰撞`, !scene.collisionBoxes.some(b => /festival|lantern|moon|celebration/.test(b.name)));
    }
    const oldSeason = scene.seasonalGroup; let disposed = 0; oldSeason.traverse(o => o.geometry?.addEventListener("dispose", () => disposed++));
    scene.applySeasonalScene("none"); check("恢復日常釋放節慶幾何與裝飾", disposed > 0 && !oldSeason.parent && scene.seasonalGroup.children.length === 0);
    const noDate = c.dailyPractice.toLunar; c.dailyPractice.toLunar = () => null;
    check("不支援農曆時回到日常", themeOf(date(2026, 2, 17)) === "none"); c.dailyPractice.toLunar = noDate;

    const bag = c.templeInventory, badges = c.templeAchievements, daily = c.dailyPractice;
    c.localStorage.setItem("temple_achievements", JSON.stringify({ version: 1, unlocked: { pilgrim1: "2026-11-04T00:00:00Z" }, deities: ["mazu"] }));
    daily.init(); badges.init();
    check("進階版保留舊徽章日期與神尊點香進度", badges.load().unlocked.pilgrim1 === "2026-11-04T00:00:00Z" && badges.load().deities.includes("mazu"));
    check("總共十四枚成就", env.run("ACHIEVEMENTS.length") === 14);
    const complete = () => { for (const task of daily.tasks) c.emitRitual(task.type, { deity: task.deity || "mazu", amount: task.goal }); };
    for (let n = 1; n <= 30; n++) { env.setTime(`2027-01-${String(n).padStart(2, "0")}T04:00:00Z`); daily.ensureToday(); complete(); }
    const practiced = badges.load().practiceDays.length; complete(); badges.reconcile();
    check("三十天全功課與連續簽到解鎖進階成就", !!badges.load().unlocked.daily30 && !!badges.load().unlocked.streak30);
    check("同一天重複事件不重複計入全勤日", badges.load().practiceDays.length === practiced);
    env.setTime("2026-08-06T04:00:00Z"); daily.ensureToday(); c.emitRitual("incense", { deity: "mazu" });
    check("錯誤神尊不算聖誕進度", !badges.load().birthdayDeities.includes("guangong"));
    c.emitRitual("incense", { deity: "guangong" }); c.emitRitual("incense", { deity: "guangong" });
    check("關公聖誕正確點香一次計入且去重", badges.load().birthdayDeities.filter(id => id === "guangong").length === 1 && !!badges.load().unlocked.birthday1);
    const beforePreview = JSON.stringify(badges.load()); scene.applySeasonalScene("birthday");
    check("預覽慶典不會取得慶典成就", JSON.stringify(badges.load()) === beforePreview);
    for (let d = date(2026, 1, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) {
      const fest = daily.festivalOf(d), term = daily.solarTermOf(d);
      if (!term && !(fest?.deity && /聖誕|成道|出家/.test(fest.name))) continue;
      env.setTime(d.toISOString()); daily.ensureToday();
      if (fest?.deity) c.emitRitual("incense", { deity: fest.deity });
      if (term) { c.emitRitual("lantern"); c.emitRitual("lantern"); }
    }
    check("六位神尊的慶典可全部完成", badges.load().birthdayDeities.length === 6 && !!badges.load().unlocked.birthdays6);
    check("二十四節氣一年內去重並解鎖全勤", badges.load().solarYears[2026].length === 24 && !!badges.load().unlocked.solar24);
    const isolated = makeEnvironment(THREE); isolated.load("app/achievements.js");
    isolated.context.localStorage.setItem("temple_achievements", JSON.stringify({ solarYears: { 2026: Array.from({ length: 12 }, (_, i) => i), 2027: Array.from({ length: 12 }, (_, i) => i + 12) } }));
    isolated.context.templeAchievements.reconcile();
    check("不同年度各十二節氣不能拼成全勤", isolated.context.templeAchievements.stats().solarTerms === 12 && !isolated.context.templeAchievements.load().unlocked.solar24);
    const clean = JSON.stringify(daily.data.progress); c.emitRitual("lantern", { amount: -1 }); c.emitRitual("lantern", { amount: Infinity });
    check("無效操作數量不增加或倒扣每日進度", JSON.stringify(daily.data.progress) === clean);
    for (const id of [...ids, "taisui"]) bag.addAmulet(id);
    check("九款平安符收集成就可完成", bag.data.amulets.length === 9 && !!badges.load().unlocked.amulets9);
    const avatar = Object.create(c.TempleAvatarSystem.prototype); avatar.playerGroup = new THREE.Group(); avatar.limbs = { torso: new THREE.Group() }; avatar.config = {}; avatar.broadcastMyState = () => {};
    c.temple3d = { avatar };
    const auraColors = new Set();
    for (const id of ["guanyin", "guangong", "tudigong"]) {
      check(`${id} 有專屬靈符名稱與祝願`, !env.run(`getAmuletName('${id}')`).startsWith("護身開光") && !env.run(`getDefaultAmuletWish('${id}')`).startsWith("祈求善信"));
      env.run(`drawAmuletCanvas('${id}')`); check(`${id} 可產生高清桌布`, env.nodes.get("amuletPreviewCanvas").width === 720 && env.nodes.get("amuletPreviewCanvas").height === 1280);
      check(`${id} 可佩戴、保存並回報同行設定`, avatar.equipAmulet(id) && avatar.config.amuletType === id && c.localStorage.getItem("temple_equipped_amulet") === id && !!avatar.limbs.torso.getObjectByName("chestAmulet"));
      auraColors.add(avatar.limbs.amuletAura.children[0].material.color.getHex());
    }
    check("三款新靈符有不同護身光色", auraColors.size === 3);
    avatar.equipAmulet(null); check("卸下靈符同時清除胸前符與光環", !avatar.limbs.amuletAura && !avatar.limbs.torso.getObjectByName("chestAmulet"));
    const saved = c.templeSave.collect(), restored = makeEnvironment(THREE); restored.load("app/achievements.js");
    restored.context.localStorage.setItem("temple_achievements", saved.temple_achievements);
    check("匯出還原保留慶典、全勤與取得日期", restored.context.templeAchievements.load().solarYears[2026].length === 24 && restored.context.templeAchievements.load().unlocked.solar24 === badges.load().unlocked.solar24);
    note("建立實際神尊與節慶幾何、模擬跨年與完整功課；不建立 WebGLRenderer。");
  }
};

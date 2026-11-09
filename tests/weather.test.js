// 天氣：依時辰排定的邏輯，以及雨、雷雨、遮雨範圍與天色疊加的場景行為（不建立 WebGLRenderer）
const { makeEnvironment } = require("./light-env");
module.exports = {
  name: "依時辰天氣與雨天場景（無繪圖）",
  async run({ check, note }) {
    const THREE = await import("three"), env = makeEnvironment(THREE), c = env.context;
    for (const file of ["scene/core.js", "scene/atmosphere.js", "scene/temple-visuals.js", "scene/weather.js", "app/weather.js"]) env.load(file);
    const w = c.templeWeather;

    // ---- 時辰與天氣邏輯 ----
    const at = iso => new c.Date(iso);
    check("台灣 22:59 仍是亥時、23:00 起算隔天子時", w.slot(at("2026-11-09T14:59:00Z")).key === "2026-11-09#11" && w.slot(at("2026-11-09T15:00:00Z")).key === "2026-11-10#0");
    check("同一個時辰內天氣固定，重算結果相同", w.forecast(at("2026-07-20T06:10:00Z")) === w.forecast(at("2026-07-20T06:55:00Z")) && w.forecast(at("2026-07-20T06:10:00Z")) === w.forecast(at("2026-07-20T06:10:00Z")));
    const tally = (month, hours) => {
      const n = { clear: 0, cloudy: 0, rain: 0, storm: 0 };
      // h 是台灣時間，換成 UTC 小時再查
      for (let day = 1; day <= 28; day++) for (const h of hours) for (let y = 2026; y <= 2030; y++) {
        const utc = Date.UTC(y, month - 1, day, h, 30) - 8 * 3600 * 1000;
        n[w.forecast(new c.Date(utc))]++;
      }
      return n;
    };
    const julyAfternoon = tally(7, [14, 16, 18]), januaryAfternoon = tally(1, [14, 16, 18]), juneAll = tally(6, [2, 8, 12, 16, 20]), octAll = tally(10, [2, 8, 12, 16, 20]);
    check("夏季午後雷雨明顯比冬季多", julyAfternoon.storm > januaryAfternoon.storm * 4, JSON.stringify({ julyAfternoon, januaryAfternoon }));
    check("梅雨季下雨比秋季多，四種天氣都會出現", juneAll.rain + juneAll.storm > octAll.rain + octAll.storm && Object.values(octAll).every(v => v > 0), JSON.stringify({ juneAll, octAll }));
    let changes = 0, prev = null;
    for (let i = 0; i < 12 * 60; i++) { const t = w.forecast(at(new Date(Date.parse("2026-03-01T00:00:00Z") + i * 2 * 3600 * 1000).toISOString())); if (prev && t !== prev) changes++; prev = t; }
    check("天氣有延續性，不會每個時辰都換", changes < 12 * 60 * 0.6, `${changes} 次`);

    const calls = [];
    c.temple3d = { setWeather: (type, opts) => calls.push([type, opts]) };
    env.setTime("2026-11-09T04:00:00Z");
    check("預設依時辰自動", w.mode() === "auto");
    w.applied = undefined; w.apply();
    check("開場套用一次、不顯示提示", calls.length === 1 && calls[0][0] === w.forecast() && calls[0][1].quiet === true);
    w.apply(); check("天氣沒變不重複通知場景", calls.length === 1);
    check("按鈕顯示目前天氣與依時辰", env.nodes.get("btnToggleWeather").textContent.includes("依時辰"));
    check("固定天氣會保存並立即套用", w.setMode("storm") && JSON.parse(c.localStorage.getItem("temple_weather")).mode === "storm" && calls.at(-1)[0] === "storm" && calls.at(-1)[1].announce);
    check("不合法的天氣模式被拒絕", !w.setMode("snow") && w.mode() === "storm");
    c.localStorage.setItem("temple_weather", "{壞資料"); check("存檔損壞時回到自動", w.mode() === "auto");
    w.init(); w.setMode("auto"); const btn = env.nodes.get("btnToggleWeather");
    const seen = []; for (let i = 0; i < 6; i++) { btn.click(); seen.push(w.mode()); }
    check("按鈕依序切換六種模式再回到自動", seen.join() === "clear,cloudy,rain,storm,blossoms,auto");

    // ---- 場景 ----
    check("大殿與殿閣下有遮雨，廟埕中央沒有", c.templeSheltered(0, 0) && c.templeSheltered(8.5, 7.5) && c.templeSheltered(13.5, 23.5) && !c.templeSheltered(0, 15) && !c.templeSheltered(0, 9));
    const audio = { rain: [], thunder: 0 };
    c.templeAudio = { startRainSound: v => audio.rain.push(["start", v]), setRainLevel: v => audio.rain.push(["level", v]), stopRainSound: () => audio.rain.push(["stop"]), playThunder: () => audio.thunder++, playShichenChime() {}, playBell() {} };
    c.setDockStatus = msg => { c.lastStatus = msg; };
    const s = Object.create(c.Temple3DScene.prototype);
    s.scene = new THREE.Scene(); s.scene.fog = new THREE.FogExp2(0x000000, 0.01); s.weatherGroup = new THREE.Group(); s.groundRipples = [];
    s.renderer = { setClearColor() {}, toneMappingExposure: 1.15 }; s.spawn3DFloatingText = () => {}; s.lanternLights = [];
    s.ambientLight = new THREE.AmbientLight(0xffffff, 1); s.sunMoonLight = new THREE.DirectionalLight(0xffffff, 2); s.skyLight = new THREE.HemisphereLight(0xffffff, 0x333333, 0.6);
    s.skyDome = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial()); s.skyTextures = {}; s.distantLand = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
    const plaza = new THREE.MeshStandardMaterial({ roughness: 0.6 }); s.templeSurfaces = { plazaInner: plaza };
    s.qualityPreset = { particles: 1 };
    s.setShichen("noon", { silent: true });
    const noonSun = s.sunMoonLight.intensity;
    s.setWeather("storm", { quiet: true });
    check("雷雨畫 1400 顆雨絲、雨聲較大", s.rainPoints.geometry.drawRange.count === 1400 && audio.rain.some(([k, v]) => k === "start" && v === 0.15));
    const pos = s.rainPoints.geometry.attributes.position.array;
    let under = 0; for (let i = 0; i < 1400; i++) if (c.templeSheltered(pos[i * 3], pos[i * 3 + 2])) under++;
    check("雨絲不會出現在屋簷下", under === 0, `${under} 顆在屋簷下`);
    check("開場直接套用雷雨天色：日光變暗、霧變濃、地面濕亮", s.sunMoonLight.intensity < noonSun * 0.5 && s.scene.fog.density > s.weatherBase.fog * 1.5 && plaza.roughness < 0.4);
    s.setShichen("dusk", { silent: true });
    s.setShichen("midnight", { silent: true }); s.setShichen("dusk", { silent: true });
    check("雨天多次換時辰，曝光不會越調越暗", Math.abs(s.renderer.toneMappingExposure - 1.15 * (1 - 0.3 * 0.8)) < 1e-6);
    check("換時辰後天氣仍疊在新天色上", Math.abs(s.sunMoonLight.intensity - s.weatherBase.sun * (1 - 0.7 * s.weatherDark)) < 1e-6 && s.weatherBase.sun === 1.6);
    s.reduceMotion = false; s.nextLightning = 0; s.updateWeather(10, 0.016);
    check("閃電時天空與環境光短暫變亮，並打雷", s.skyDome.material.color.r > 1 && audio.thunder === 1);
    s.updateWeather(10.5, 0.016);
    check("閃電 0.3 秒內結束", s.lightningStart === undefined && s.skyDome.material.color.r < 1);
    s.reduceMotion = true; s.nextLightning = 0; s.updateWeather(20, 0.016);
    check("減少動態時不閃電，只有雷聲", s.lightningStart === undefined && audio.thunder === 2 && s.skyDome.material.color.r < 1);
    for (let i = 0; i < 400; i++) s.updateWeather(30 + i * 0.05, 0.05);
    let below = 0; for (let i = 0; i < 1400; i++) if (pos[i * 3 + 1] < 0) below++;
    check("雨絲落地後重新從高處落下", below === 0);

    s.qualityPreset = { particles: 0.6 }; s.reduceMotion = false;
    s.setWeather("rain");
    check("小雨中畫質畫 540 顆，沿用同一組雨絲", s.weatherPoints === s.rainPoints && s.rainPoints.geometry.drawRange.count === 540);
    s.setWeather("clear");
    check("轉晴收起雨絲、停雨聲", !s.rainPoints.visible && s.weatherPoints === null && audio.rain.at(-1)[0] === "stop");
    const darkBefore = s.weatherDark; s.updateWeather(50, 0.1);
    check("天色漸漸轉亮，不是瞬間切換", s.weatherDark < darkBefore && s.weatherDark > 0);
    for (let i = 0; i < 200; i++) s.updateWeather(60 + i * 0.1, 0.1);
    check("約 8 秒後回到原本晴天亮度與乾地面", s.weatherDark === 0 && Math.abs(s.sunMoonLight.intensity - s.weatherBase.sun) < 1e-6 && plaza.roughness === 0.6);
    s.setWeather("blossoms"); const petals = s.blossomPoints;
    let disposed = false; petals.geometry.addEventListener("dispose", () => { disposed = true; });
    s.setWeather("cloudy");
    check("落瓣換掉時釋放幾何；多雲沒有雨", disposed && !s.blossomPoints && s.weatherPoints === null && s.weatherTarget === 0.35);
    s.setWeather("snow");
    check("未知天氣當作晴天", s.currentWeather === "clear");
    // ---- 雨傘與雨衣 ----
    for (const file of ["inventory.js", "scene/offering-models.js", "avatar/appearance.js", "avatar/core.js", "avatar/ritual-props.js", "avatar/rain-gear.js", "avatar/social.js", "avatar/relics.js", "avatar/companions.js"]) env.load(file);
    const a = Object.create(c.TempleAvatarSystem.prototype), sent = [];
    a.scene = new THREE.Scene(); a.playerGroup = new THREE.Group(); a.scene.add(a.playerGroup); a.position = new THREE.Vector3(); a.limbs = {};
    a.config = { ...env.run("AVATAR_DEFAULT_LOOK"), robeColor: "#93422b", holdingItem: "incense", title: "雨中善信", hatType: "none" };
    a.currentAction = "idle"; a.actionProgress = 0; a.keys = {}; a.relics = {}; a.peers = new Map(); a.lastBroadcastPos = new THREE.Vector3(); a.lastBroadcastTime = 0;
    a.channel = { postMessage: data => sent.push(data) }; a.myPeerId = "self"; a.buildAvatarMesh();
    const frame = (t, action = "idle") => { a.currentAction = action; a.animateLimbs(t, 0.016); };
    c.temple3d = { currentWeather: "clear" }; a.playerGroup.position.set(0, 0, 15); frame(1);
    check("沒下雨時不建立雨具", !a.rainGear && !a.rainPoseActive);
    c.temple3d.currentWeather = "rain"; frame(1.1);
    check("下雨在廟埕：預設朱紅油紙傘撐在左手，沒選雨衣就不穿", a.rainGear?.umbrella?.visible && a.rainGear.umbrella.name === "umbrella-red" && Math.abs(a.limbs.armL.rotation.x + 0.95) < 1e-6 && !a.rainGear.coat);
    frame(1.2, "walk");
    check("撐傘走路時左手固定不擺動", a.rainGear.umbrella.visible && Math.abs(a.limbs.armL.rotation.x + 0.95) < 1e-6 && Math.abs(a.limbs.legL.rotation.x) > 0.01);
    a.playerGroup.position.set(0, 0, 1); frame(1.3); frame(1.31);
    check("走進大殿自動收傘、左手放下", !a.rainGear.umbrella.visible && !a.rainPoseActive && Math.abs(a.limbs.armL.rotation.z + 0.22) > 0.1);   // 回到原本持香姿勢
    a.playerGroup.position.set(0, 0, 15); a.setRitualCarry("basket"); frame(1.4);
    check("提籃（右手）與撐傘（左手）可以同時", a.ritualProps.basket.visible && a.rainGear.umbrella.visible);
    a.setRitualCarry("tray"); frame(1.5);
    check("雙手端盤時先收傘", a.ritualProps.tray.visible && !a.rainGear.umbrella.visible);
    a.setRitualCarry(""); frame(1.6, "kneel");
    check("跪拜時收傘", !a.rainGear.umbrella.visible);
    c.templeMotion = { reduced: true }; frame(2); const still = a.rainGear.umbrella.rotation.x; frame(2.7, "walk");
    check("減少動態時傘不晃", a.rainGear.umbrella.rotation.x === still); c.templeMotion = { reduced: false };
    let freed = 0; a.rainGear.umbrella.traverse(o => o.geometry?.addEventListener("dispose", () => freed++));
    Object.assign(a.config, { umbrella: "none", raincoat: "yellow" }); frame(3);
    const coat = a.rainGear.coat;
    check("改成不撐傘、穿黃色雨衣：舊傘釋放，斗篷、兜帽、袖套都穿上", freed > 5 && !a.rainGear.umbrella && coat.length === 4 && coat.every(m => m.visible) && coat.some(m => m.parent === a.limbs.head) && coat.filter(m => m.parent === a.limbs.armL || m.parent === a.limbs.armR).length === 2);
    a.playerGroup.position.set(0, 0, 1); frame(3.1);
    check("雨衣在室內也照樣穿著", coat.every(m => m.visible));
    c.temple3d.currentWeather = "clear"; frame(3.2);
    check("雨停後雨衣收起", coat.every(m => !m.visible));
    let coatFreed = 0; coat.forEach(m => m.geometry.addEventListener("dispose", () => coatFreed++));
    a.buildAvatarMesh(); check("換裝重建時釋放雨具", !a.rainGear && coatFreed === 4);

    c.temple3d.currentWeather = "storm";
    a.handlePeerUpdate({ id: "friend", config: { ...a.config, umbrella: "green", raincoat: "clear" }, pos: [0, 0, 15], rot: 0, action: "walk", ritual: {}, timestamp: Date.now() });
    const peer = a.peers.get("friend"); peer.group.position.set(0, 0, 15); a.animatePeerLimbs(peer, 4, 0.016);
    check("同行依對方設定撐竹青傘、穿透明雨衣", peer.rainGear?.umbrella?.name === "umbrella-green" && peer.rainGear.umbrella.visible && peer.rainGear.coat.length === 4);
    a.removePeer("friend"); check("同行離開時雨具一起釋放", !peer.rainGear);

    const code = c.encodeLookCode({ umbrella: "plain", raincoat: "blue", robeColor: "#112233" }), back = c.decodeLookCode(code);
    check("造型代碼含雨具且來回一致", /^TP-[0-9a-z]{16}-112233$/.test(code) && back.umbrella === "plain" && back.raincoat === "blue", code);
    const older = c.decodeLookCode("TP-00000000000000-c24b2b");
    check("舊 14 碼代碼的雨具用預設", older?.umbrella === "red" && older?.raincoat === "none");
    check("同行送來不合法的雨具代號會改用預設", c.normalizeLook({ umbrella: "__proto__", raincoat: "gold" }).umbrella === "red" && c.normalizeLook({ raincoat: "gold" }).raincoat === "none");
    note("天氣邏輯與實際 Three.js 物件；不建立 WebGLRenderer，畫面與手機幀率需實機確認。");
  }
};

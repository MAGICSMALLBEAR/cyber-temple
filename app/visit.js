// 互動提示與地圖共用地點表；只在 250ms 節拍更新，不增加 3D 物件。
const templeVisit = {
  currentId: null,
  targets(scene = window.temple3d) {
    if (!scene) return [];
    const click = id => () => document.getElementById(id)?.click();
    const place = (id, title, icon, center, spot, radius, label, action, map = true) => ({ id, title, icon, center, spot, face: center, radius, label, action, map });
    const greet = (text, at) => () => {
      scene.avatar?.triggerAction("bow"); window.templeAudio?.playBell(580);
      scene.spawn3DFloatingText(text, new THREE.Vector3(at[0], 2.5, at[1])); window.setDockStatus?.(text);
    };
    const list = [
      place("service", "服務處", "🧧", SERVICE_DESK_POS, [SERVICE_DESK_POS[0] + 1.1, SERVICE_DESK_POS[1]], 2.2, "供品鋪／請香補給", () => window.pilgrimage?.claimSupplies()),
      place("offerings", "大殿供品桌", "🍱", [-2, 0.2], [-2, 1.2], 1.5, "擺供／敬獻／收供", () => window.openFeastModal?.()),
      place("heaven", "天公爐", "🔥", [0, 11.5], [0, 9.6], 2.2, "敬天上香", () => {
        if (window.templeInventory && !window.templeInventory.consume({ incense: 1 })) return;
        if (scene.avatar?.playRitualMotion) scene.avatar.playRitualMotion("incenseOffering");
        else scene.avatar?.triggerAction("bow");
        window.templeAudio?.playBell(560);
        scene.spawn3DFloatingText("天公賜福 • 迎祥納吉", new THREE.Vector3(0, 2.5, 11.5));
        window.setDockStatus?.("🔥 敬拜天公爐完成，願出入平安。"); window.emitRitual?.("heavenCenser");
      }),
      place("main", "大殿香案", "🪔", [0, 0], [0, 0.8], 1.6, "向主神上香", click("btnLightIncense")),
      place("bwa", "筊杯", "🌓", [0, 1.8], [0, 2.2], 1.4, "擲筊請示", click("btnThrowBwa"), false),
      place("chiam", "籤筒", "🎋", [1.4, 0], [1.4, 1.0], 1.5, "求籤", click("btnShakeChiam"), false),
      place("muyu", "木魚", "🪵", [-1.4, 0], [-1.4, 1.0], 1.5, "敲木魚", click("btnKnockMuyu"), false),
      place("pond", "蓮花池", "🪷", [12.5, 13.5], [9.6, 13.5], 3.2, "投幣許願", () => scene.tossWishingCoin()),
      place("furnace", "八角金爐", "🔥", [-12.5, 14.5], [-12.5, 12.3], 2.8, "化金紙", () => scene.burnJossPaper()),
      place("ema", "祈願木牌閣", "⛩️", [-13.5, 8.5], [-11.4, 8.5], 2.6, "掛上祈願木牌", click("btnOpenEma")),
      place("wenchang", "文昌閣", "🎓", [13.5, 5.5], [10.45, 6.3], 3.2, "文昌祈福", () => window.openSideHallModal?.("wenchang")),
      place("taisui", "太歲殿", "🏮", [-13.5, 5.5], [-13.5, 8.3], 3.2, "安太歲", () => window.openTaiSuiModal?.()),
      place("yuelao", "月老閣", "❤️", [13.5, 23.5], [13.5, 26.2], 3.2, "月老祈福", () => window.openSideHallModal?.("yuelao")),
      place("caishen", "財神殿", "💰", [-13.5, 23.5], [-13.5, 26.2], 3.2, "財神祈福", () => window.openSideHallModal?.("caishen")),
      place("bell", "東天鐘樓", "🔔", [9.5, 30], [9.5, 32.5], 3.2, "叩鐘", () => scene.strikeBell()),
      place("drum", "西暮鼓樓", "🥁", [-9.5, 30], [-9.5, 32.5], 3.2, "擊鼓", () => scene.beatDrum()),
      place("ring", "套圈圈攤", "🎯", [-6.5, 25.5], [-6.5, 27.8], 2.8, "玩套圈圈", () => window.nightMarket?.open("ring")),
      place("puppet", "布袋戲台", "🎭", [6.5, 25.5], [6.5, 28], 3, "觀賞布袋戲", () => window.nightMarket?.open("puppet")),
      place("gate", "山門", "⛩️", [0, 38], [0, 35.5], 3.8, "行禮入殿", greet("⛩️ 山門迎祥 • 滌淨塵心", [0, 38])),
      ...[-5.5, 5.5].map((x, i) => place(`lion${i}`, "守護石獅", "🦁", [x, 34], [x, 32], 2.6, "神獅祈福", greet("🦁 神獅鎮煞 • 迎祥納吉", [x, 34]), false))
    ];
    // 使用實際模型座標，避免提示與擺設各自維護位置。
    (scene.interactiveObjects || []).forEach(obj => {
      const type = obj.userData?.type;
      if (!["prayerMat", "donationBox", "chiamCabinet"].includes(type)) return;
      const p = obj.parent.position, index = list.length;
      const isMat = type === "prayerMat";
      list.push(place(`hall${index}`, isMat ? "拜墊" : type === "donationBox" ? "香油箱" : "籤詩櫃", isMat ? "🧎" : type === "donationBox" ? "🪙" : "📜",
        [p.x, p.z], [p.x, p.z + (isMat ? 0 : 0.85)], isMat ? 0.8 : 1.1,
        isMat ? scene.avatar?.currentAction === "kneelSit" ? "起身" : "跪坐稟告" : type === "donationBox" ? "隨喜奉獻" : "重閱籤詩", () => scene.interactWithHallObject(obj), false));
    });
    if (scene.palanquinGroup) {
      const p = scene.palanquinGroup.position;
      list.push(place("palanquin", "神轎", "🏮", [p.x, p.z], [p.x, p.z + 2], 2.8, "鑽轎腳祈福", () => scene.kneelUnderPalanquin(), false));
    }
    return list;
  },
  nearby(scene = window.temple3d, position = scene?.avatar?.position) {
    const p = position; if (!p) return null;
    // 原有近身拜墊／櫃台優先，其他地方選最近的目標。
    return this.targets(scene).map(t => ({ ...t, distance: Math.hypot(p.x - t.center[0], p.z - t.center[1]) }))
      .filter(t => t.distance < t.radius).sort((a, b) => Number(b.id.startsWith("hall")) - Number(a.id.startsWith("hall")) || a.distance - b.distance)[0] || null;
  },
  interact() {
    if (this.modalOpen()) return false;
    const target = this.nearby(); if (!target) return false;
    window.pilgrimage?.cancelRoute(); target.action(); this.update(); return true;
  },
  modalOpen() { return !!document.querySelector(".modal-overlay.open, #avatarModal.open"); },
  update() {
    if (document.hidden) return;
    const button = document.getElementById("btnNearbyInteract"); if (!button) return;
    const target = this.modalOpen() ? null : this.nearby();
    button.hidden = !target;
    if (target && (this.currentId !== target.id || button.dataset.label !== target.label)) {
      button.textContent = `${target.icon} ${target.title} · ${target.label}（E）`;
      button.dataset.label = target.label;
    }
    this.currentId = target?.id || null;
    if (document.getElementById("visitMapModal").classList.contains("open")) this.updateMap();
  },
  positionTools() {
    const dock = document.getElementById("templeDockContainer"), tools = document.getElementById("visitTools");
    if (dock && tools) tools.style.bottom = `${Math.max(100, innerHeight - dock.getBoundingClientRect().top + 10)}px`;
  },
  openMap() {
    document.getElementById("visitMapModal").classList.add("open");
    this.renderMap(); this.updateMap(); this.update();
  },
  svg(tag, attrs, text) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    if (text) el.textContent = text; return el;
  },
  point(x, z) { return [Math.round((x + 18) * 10), Math.round((z + 4) * 10)]; },
  renderMap() {
    const map = document.getElementById("visitMapSvg"), list = document.getElementById("visitMapPlaces");
    map.replaceChildren(); list.replaceChildren();
    map.append(this.svg("path", { d: "M140 5H220V98H355V455H5V98H140Z", fill: "#40281f", stroke: "#bd934c", "stroke-width": 2 }));
    map.append(this.svg("path", { d: "M180 98V435", stroke: "#806341", "stroke-width": 18 }));
    map.append(this.svg("text", { x: 180, y: 18, "text-anchor": "middle", fill: "#ffe29a", "font-size": 11 }, "北 · 大殿"));
    map.append(this.svg("polyline", { id: "visitMapRoute", fill: "none", stroke: "#f5c542", "stroke-width": 3, "stroke-dasharray": "5 4" }));
    this.targets().filter(t => t.map).forEach(t => {
      const [x, y] = this.point(...t.center), g = this.svg("g", { role: "button", tabindex: 0, "aria-label": `前往${t.title}`, class: "map-marker" });
      g.append(this.svg("circle", { cx: x, cy: y, r: 10, fill: "#8c3022", stroke: "#f0c66d" }));
      g.append(this.svg("text", { x, y: y + 4, "text-anchor": "middle", "font-size": 12 }, t.icon));
      g.append(this.svg("text", { x, y: y + 23, "text-anchor": "middle", "font-size": 10, fill: "#f3e3c0" }, t.title));
      g.addEventListener("click", () => this.go(t.id));
      g.addEventListener("keydown", e => { if (["Enter", " "].includes(e.key)) { e.preventDefault(); this.go(t.id); } });
      map.append(g);
      const button = document.createElement("button"); button.className = "btn-custom-pill"; button.textContent = `${t.icon} ${t.title}`;
      button.addEventListener("click", () => this.go(t.id)); list.append(button);
    });
    map.append(this.svg("path", { id: "visitMapPlayer", d: "M0 -9L6 7L0 4L-6 7Z", fill: "#9cf4d4", stroke: "#143e32", "stroke-width": 1.5 }));
  },
  updateMap() {
    const a = window.temple3d?.avatar; if (!a) return;
    const [x, y] = this.point(a.position.x, a.position.z);
    document.getElementById("visitMapPlayer")?.setAttribute("transform", `translate(${x} ${y}) rotate(${180 - a.playerGroup.rotation.y * 180 / Math.PI})`);
    const route = window.pilgrimage?.route;
    const points = route ? [[a.position.x, a.position.z], ...route.points.slice(route.index)] : [];
    document.getElementById("visitMapRoute")?.setAttribute("points", points.map(p => this.point(...p).join(",")).join(" "));
    document.getElementById("visitMapStatus").textContent = route ? `🚶 前往：${route.step.title}` : "綠色箭頭是你；點地標或下方名稱即可前往。";
    document.getElementById("btnMapStop").disabled = !route;
  },
  go(id) {
    const target = this.targets().find(t => t.id === id), scene = window.temple3d;
    if (!target || !scene?.avatar) return false;
    // 預定站位若被模型擋住，選擇物件附近可走的候選點。
    const candidates = [target.spot];
    for (const r of [target.radius - 0.1, target.radius - 0.35, target.radius * 0.65]) for (let i = 0; i < 12; i++) {
      candidates.push([target.center[0] + Math.sin(i * Math.PI / 6) * r, target.center[1] + Math.cos(i * Math.PI / 6) * r]);
    }
    let step, planned, attempts = 0;
    for (const spot of candidates) {
      const [x, z] = spot;
      if (Math.hypot(x - target.center[0], z - target.center[1]) >= target.radius || z < -2.8 || z > 41.5 || Math.abs(x) > (z > 5.8 ? 17.5 : 3.8) || scene.isBlockedAt(x, z, 0.36)) continue;
      if (this.nearby(scene, { x, z })?.id !== target.id) continue;
      if (attempts++ >= 3) break;
      const points = scene.findWalkRoute([scene.avatar.position.x, scene.avatar.position.z], spot);
      if (points.length) { step = { ...target, spot, action: target.label }; planned = points; break; }
    }
    if (!step) { document.getElementById("visitMapStatus").textContent = "暫時找不到通路，請移動到空曠處再試。"; return false; }
    window.pilgrimage.goTo(step, planned);
    document.getElementById("visitMapModal").classList.remove("open"); return true;
  },
  init() {
    document.getElementById("btnNearbyInteract").addEventListener("click", () => this.interact());
    document.getElementById("btnOpenVisitMap").addEventListener("click", () => this.openMap());
    document.getElementById("btnVisitMapPavilion").addEventListener("click", () => this.openMap());
    document.getElementById("visitMapClose").addEventListener("click", () => document.getElementById("visitMapModal").classList.remove("open"));
    document.getElementById("btnMapStop").addEventListener("click", () => { window.pilgrimage?.cancelRoute(); this.updateMap(); });
    window.addEventListener("resize", () => this.positionTools());
    new ResizeObserver(() => this.positionTools()).observe(document.getElementById("templeDockContainer"));
    setInterval(() => this.update(), 250); this.positionTools(); this.update();
  }
};
window.templeVisit = templeVisit;

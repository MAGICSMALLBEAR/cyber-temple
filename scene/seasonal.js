// 節慶裝飾只在日期／預覽選項變動時重建，不新增光源與碰撞。
const TEMPLE_SCENE_THEMES = { none: "日常廟景", newyear: "新春迎福", lantern: "元宵燈會", moon: "中秋團圓", birthday: "神尊慶典" };
function templeFestivalTheme(date = new Date()) {
  const lunar = window.dailyPractice?.toLunar(date), festival = window.dailyPractice?.festivalOf(date);
  if (!lunar || lunar.isLeap) return "none";
  if (lunar.month === 1 && lunar.day <= 5 || festival?.name.startsWith("除夕")) return "newyear";
  if (lunar.month === 1 && lunar.day >= 13 && lunar.day <= 15) return "lantern";
  if (lunar.month === 8 && lunar.day >= 14 && lunar.day <= 16) return "moon";
  if (festival?.deity && /聖誕|成道|出家/.test(festival.name)) return "birthday";
  return "none";
}
class TempleSeasonalMixin {
  setupSeasonalScene() {
    this.seasonalMode = "auto";
    this.applySeasonalScene();
    document.getElementById("selectFestivalScene")?.addEventListener("change", e => this.applySeasonalScene(e.target.value));
    window.addEventListener("focus", () => this.applySeasonalScene(this.seasonalMode));
  }
  applySeasonalScene(mode = "auto", date = new Date()) {
    if (mode !== "auto" && !Object.hasOwn(TEMPLE_SCENE_THEMES, mode)) mode = "auto";
    this.seasonalMode = mode;
    const theme = mode === "auto" ? templeFestivalTheme(date) : mode;
    const festival = window.dailyPractice?.festivalOf(date);
    const title = theme === "birthday" && mode === "auto" && festival ? festival.name : TEMPLE_SCENE_THEMES[theme];
    const select = document.getElementById("selectFestivalScene"), status = document.getElementById("festivalSceneStatus");
    if (select) select.value = mode;
    if (status) status.textContent = `${mode === "auto" ? "依農曆自動切換" : "預覽布置，不影響日期、功課與成就"} · ${title}`;
    if (this.seasonalTheme === theme && this.seasonalTitle === title) return;
    if (this.seasonalGroup) disposeTempleObject(this.seasonalGroup);
    this.seasonalTheme = theme; this.seasonalTitle = title;
    const group = new THREE.Group(); group.name = `festival-${theme}`; group.userData.noCollision = true;
    this.seasonalGroup = group; this.scene.add(group);
    if (theme === "none") return;
    const gold = new THREE.MeshStandardMaterial({ color: 0xe8ba52, roughness: 0.5, metalness: 0.4 });
    const red = new THREE.MeshStandardMaterial({ color: 0xb52d35, emissive: 0x361015, roughness: 0.6 });
    const add = (name, geometry, material, pos) => { const m = new THREE.Mesh(geometry, material); m.name = name; m.position.set(...pos); group.add(m); return m; };
    const sign = (text, width, height, pos, vertical = false) => {
      const m = this.makeHallSign(text, width, height, vertical); m.name = "festival-inscription"; m.position.set(...pos); group.add(m); return m;
    };
    const lantern = (x, y, z, color = red, shape = "round") => {
      const geo = shape === "hex" ? new THREE.CylinderGeometry(0.23, 0.23, 0.55, 6) : new THREE.SphereGeometry(0.27, 12, 10);
      const body = add("festival-lantern", geo, color, [x, y, z]); if (shape !== "hex") body.scale.y = 1.2;
      add("lantern-upper-cap", new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12), gold, [x, y + 0.32, z]);
      add("lantern-lower-cap", new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12), gold, [x, y - 0.32, z]);
      add("lantern-tassel", new THREE.ConeGeometry(0.065, 0.28, 8), gold, [x, y - 0.48, z]);
      add("lantern-cord", new THREE.CylinderGeometry(0.012, 0.012, 0.48, 6), gold, [x, y + 0.55, z]);
    };
    if (theme === "newyear") {
      for (const x of [-3.1, 3.1]) for (const z of [5.4, 9, 12.6]) lantern(x, 3.5, z);
      sign("春到人間添百福", 0.43, 2.5, [-2.35, 2.9, 5.3], true);
      sign("神臨寶殿納千祥", 0.43, 2.5, [2.35, 2.9, 5.3], true);
      sign("新春納福", 2.1, 0.48, [0, 4.65, 5.3]);
    } else if (theme === "lantern") {
      const colors = [red, new THREE.MeshStandardMaterial({ color: 0xe6b35b, emissive: 0x352006 }), new THREE.MeshStandardMaterial({ color: 0x6da8b2, emissive: 0x102a31 })];
      for (let i = 0; i < 12; i++) lantern((i % 2 ? 1 : -1) * (3 + (i % 3) * 0.45), 2.8 + (i % 3) * 0.35, 7 + Math.floor(i / 2) * 3.5, colors[i % 3], "hex");
      sign("上元燈火萬家春", 2.9, 0.5, [0, 4.6, 5.3]);
    } else if (theme === "moon") {
      // 獨立月輪，不改時辰／天候，離開節慶即可完整還原。
      const moonMat = new THREE.MeshBasicMaterial({ color: 0xffedbc, fog: false });
      add("harvest-full-moon", new THREE.SphereGeometry(2.2, 24, 16), moonMat, [15, 16, -18]);
      const crater = new THREE.MeshBasicMaterial({ color: 0xd8c59e, fog: false });
      for (const [x, y, r] of [[-0.7, 0.6, 0.32], [0.65, -0.5, 0.4], [0.35, 0.85, 0.2]]) add("moon-crater", new THREE.CircleGeometry(r, 16), crater, [15 + x, 16 + y, -15.92]);
      for (const x of [-3.2, 3.2]) for (const z of [8, 14, 20]) lantern(x, 3.2, z, gold);
      sign("月圓人團圓", 2.5, 0.5, [0, 4.6, 5.3]);
    } else {
      sign(title, 3.4, 0.6, [0, 4.65, 5.3]);
      for (const x of [-2.9, 2.9]) {
        lantern(x, 3.4, 5.4);
        const vase = add("celebration-flower-vase", new THREE.CylinderGeometry(0.16, 0.23, 0.5, 12), gold, [x, 0.3, 6.4]);
        for (let i = 0; i < 5; i++) add("celebration-flower", new THREE.SphereGeometry(0.14, 8, 6), red, [vase.position.x + Math.sin(i * 2.4) * 0.22, 0.7 + i % 2 * 0.15, 6.4 + Math.cos(i * 2.4) * 0.18]);
      }
    }
  }
  updateSeasonalDate(now) {
    if (now < (this.nextSeasonalCheck || 0)) return;
    this.nextSeasonalCheck = now + 60000;
    if (this.seasonalMode === "auto") this.applySeasonalScene("auto");
  }
}
installTempleMixin(TempleSeasonalMixin);

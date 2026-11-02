// temple3d.js - 賽博虛擬神殿 3D 全景沉浸式 WebGL 引擎
// 包含：大殿、戶外廟埕、天公爐、蓮花許願池、八角金爐、神尊專屬法相切換、角色跟隨與接近觸發

// 神轎停放處（御道東側，避開大殿入口側牆）
const PALANQUIN_REST_X = 3.8;
const PALANQUIN_REST_Z = 9;

class Temple3DScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 角色控制器
    this.avatar = null;

    // 互動 3D 物件引用
    this.interactiveObjects = [];

    // 大殿物件
    this.censerGroup = null;
    this.incenseSticks = [];
    this.smokeParticles = [];
    this.isIncenseLit = false;

    this.bwaBlocks = [];
    this.isBwaTossing = false;

    this.chiamBucket = null;
    this.chiamSticks = [];
    this.isChiamShaking = false;

    this.muyuGroup = null;
    this.mallet = null;
    this.isMuyuStriking = false;

    // 廟埕戶外物件
    this.heavenCenser = null;
    this.wishingPond = null;
    this.pondRipples = [];
    this.isCoinTossing = false;

    this.jossFurnace = null;
    this.flameParticles = [];
    this.isBurningPaper = false;

    // 神明雕像動態部件
    this.throneGroup = null;
    this.deityStatue = null;
    this.deityHalo = null;
    this.deityAccessories = [];

    this.lanterns = [];
    this.candleLights = [];

    // 四時辰晝夜天色與繁星
    this.ambientLight = null;
    this.mainSpot = null;
    this.sunMoonLight = null;
    this.shrineBacklight = null;
    this.lanternLights = [];
    this.starPoints = null;
    this.currentShichen = "auto";

    // 祈願繪馬木牌閣
    this.emaRackGroup = null;
    this.emaPlaques = [];

    // 視角插值與角色跟隨
    this.targetCameraPos = null;
    this.targetLookAt = null;
    this.followAvatar = true; // 預設視角跟隨分身漫遊
    this.isFirstPerson = false; // 第一人稱沉浸模式

    // 晨鐘暮鼓與遶境聖駕
    this.bellStrikerMesh = null;
    this.isBellStriking = false;
    this.drumstickMesh = null;
    this.isDrumBeating = false;
    this.palanquinGroup = null;
    this.liangsanMesh = null;
    this.isParading = false;
    this.paradeZ = PALANQUIN_REST_Z;
    this.paradeDirection = 1;
    this.firecrackerParticles = [];
    this.hasKneeledUnderPalanquin = false;
    this.lanternPagodaTiers = [];

    // 天候與季節氛圍 (Weather Atmosphere)
    this.currentWeather = "clear";
    this.weatherGroup = new THREE.Group();
    this.weatherGroup.name = "weatherGroup";
    this.weatherPoints = null;
    this.weatherVels = null;
    this.blossomSeeds = null;
    this.groundRipples = [];

    // 線上收驚除煞科儀 (Shoujing Ceremony)
    this.shoujingActive = false;
    this.shoujingPurgeParticles = [];
    this.shoujingLightBeam = null;

    // 3D 浮動文字粒子
    this.floatingTexts = [];
    this.lastTime = performance.now();

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. 場景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e0606);
    this.scene.fog = new THREE.FogExp2(0x160808, 0.012);

    // 2. 攝影機 (擴展遠平面至 350m 以容納整座宏偉宮殿牌樓)
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 350);
    this.camera.position.set(0, 3.2, 8.8); // 初始置於分身後上方

    // 3. 渲染器
    // 抗鋸齒只能在建立時決定，其餘畫質設定由 applyQuality 隨時套用
    const initialQuality = window.templeQuality ? window.templeQuality.preset : null;
    this.renderer = new THREE.WebGLRenderer({ antialias: initialQuality ? initialQuality.antialias : true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, initialQuality ? initialQuality.maxPixelRatio : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls (擴大縮放範圍至 75m，支援千米大埕鳥瞰)
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minDistance = 1.4;
    this.controls.maxDistance = 75.0;
    this.controls.target.set(0, 1.1, 4.0); // 初始對準角色上身

    // 5. 構建環境與光影
    this.setupLighting();
    this.buildTempleArchitecture();
    this.buildCourtyard(); // 戶外廟埕
    this.buildAltarAndDeity();
    this.buildCenser();
    this.buildBwaBwei();
    this.buildChiamBucket();
    this.buildMuyu();
    this.buildOfferings();
    this.buildLanternPagodas();
    this.setupDustParticles();
    this.scene.add(this.weatherGroup);

    // 6. 載入 3D 角色系統
    if (window.TempleAvatarSystem) {
      this.avatar = new TempleAvatarSystem(this.scene, this.camera, this.controls);
    }

    // 6.5 畫質分級（場景與燈光都建好之後才套用）
    if (window.templeQuality) window.templeQuality.attach(this);

    // 7. 事件監聽
    window.addEventListener("resize", () => this.onWindowResize());
    this.renderer.domElement.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener("click", (e) => this.onClick(e));

    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "KeyE") {
        this.triggerNearbyInteraction();
      }
      if (e.code === "KeyC") {
        this.resetCameraBehindAvatar(true);
      }
    });

    // 8. 啟動主渲染循環
    this.animate();
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0x7a3d2e, 1.3);
    this.scene.add(this.ambientLight);

    // 大殿正上方金光
    this.mainSpot = new THREE.SpotLight(0xffdf88, 2.9);
    this.mainSpot.position.set(0, 8.5, 3.5);
    this.mainSpot.angle = Math.PI / 3.2;
    this.mainSpot.penumbra = 0.55;
    this.mainSpot.castShadow = true;
    this.mainSpot.shadow.mapSize.width = 1024;
    this.mainSpot.shadow.mapSize.height = 1024;
    this.mainSpot.shadow.bias = -0.001;
    this.scene.add(this.mainSpot);

    // 神龕後方金光
    this.shrineBacklight = new THREE.PointLight(0xffaa22, 2.4, 9);
    this.shrineBacklight.position.set(0, 2.8, -2.5);
    this.scene.add(this.shrineBacklight);

    // 戶外廟埕天光 (大幅擴展陰影相機範圍以覆蓋宏偉三進廟埕與山門)
    this.sunMoonLight = new THREE.DirectionalLight(0xddeeff, 0.95);
    this.sunMoonLight.position.set(15, 32, 22);
    this.sunMoonLight.castShadow = true;
    this.sunMoonLight.shadow.mapSize.width = 2048;
    this.sunMoonLight.shadow.mapSize.height = 2048;
    this.sunMoonLight.shadow.camera.near = 0.5;
    this.sunMoonLight.shadow.camera.far = 140;
    this.sunMoonLight.shadow.camera.left = -32;
    this.sunMoonLight.shadow.camera.right = 32;
    this.sunMoonLight.shadow.camera.top = 32;
    this.sunMoonLight.shadow.camera.bottom = -32;
    this.sunMoonLight.shadow.bias = -0.0005;
    this.scene.add(this.sunMoonLight);

    // 廟埕戶外環境柔和漫射光
    const courtAmbient = new THREE.DirectionalLight(0xfff2e0, 0.4);
    courtAmbient.position.set(-15, 26, 20);
    this.scene.add(courtAmbient);

    // 繁星穹頂
    this.buildStarField();

    // 燭台點光源
    this.candleLights = [];
    [
      [-1.8, 1.8, -0.2],
      [1.8, 1.8, -0.2],
      [-2.6, 2.8, 1.5],
      [2.6, 2.8, 1.5]
    ].forEach(pos => {
      const pLight = new THREE.PointLight(0xff7722, 1.4, 5);
      pLight.position.set(...pos);
      this.scene.add(pLight);
      this.candleLights.push(pLight);
    });
  }

  buildTempleArchitecture() {
    // 1. 大殿青石地磚 (Z 範圍 -3.2 到 5.5)
    const floorGeo = new THREE.PlaneGeometry(16, 10);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c1210, roughness: 0.25, metalness: 0.2 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 1.15);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const gridHelper = new THREE.GridHelper(14, 14, 0x5a2d18, 0x38190c);
    gridHelper.position.set(0, 0.005, 1.15);
    this.scene.add(gridHelper);

    // 2. 後殿神龕木雕背牆
    const wallGeo = new THREE.BoxGeometry(14, 8, 0.4);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3d100d, roughness: 0.6 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 4, -3.2);
    wall.receiveShadow = true;
    this.scene.add(wall);

    const corniceGeo = new THREE.BoxGeometry(14.4, 0.35, 0.8);
    const corniceMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.6, roughness: 0.3 });
    const cornice = new THREE.Mesh(corniceGeo, corniceMat);
    cornice.position.set(0, 6.8, -2.8);
    this.scene.add(cornice);

    // 3. 朱紅大柱
    const pillarGeo = new THREE.CylinderGeometry(0.28, 0.3, 7.5, 24);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8a1818, roughness: 0.35, metalness: 0.1 });
    const pillarBaseMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7, roughness: 0.25 });

    [[-3.4, -1.8], [3.4, -1.8], [-3.4, 4.2], [3.4, 4.2]].forEach(([x, z]) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 3.75, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.35, 24), pillarBaseMat);
      base.position.set(x, 0.175, z);
      this.scene.add(base);
    });

    // 4. 大殿與廟埕交界：朱紅大門門檻與牌匾山門
    const thresholdGeo = new THREE.BoxGeometry(8, 0.25, 0.4);
    const thresholdMat = new THREE.MeshStandardMaterial({ color: 0x6e1b1b, roughness: 0.5 });
    const threshold = new THREE.Mesh(thresholdGeo, thresholdMat);
    threshold.position.set(0, 0.125, 5.8);
    this.scene.add(threshold);

    // 左右照壁
    const screenWallGeo = new THREE.BoxGeometry(3.5, 5.5, 0.3);
    const screenL = new THREE.Mesh(screenWallGeo, wallMat);
    screenL.position.set(-5.2, 2.75, 5.8);
    this.scene.add(screenL);

    const screenR = new THREE.Mesh(screenWallGeo, wallMat);
    screenR.position.set(5.2, 2.75, 5.8);
    this.scene.add(screenR);

    this.buildHangingLanterns();
  }

  // 構建宏偉三進戶外廟埕群 (Courtyard & Plaza)
  buildCourtyard() {
    // 1. 宏偉青石大地坪 (寬 38m，深 38m)
    this.buildPlazaGround();

    // 2. 中央御道九龍神道
    this.buildCentralImperialPath();

    // 3. 巍峨山門牌樓 (Z: 38.0)
    this.buildMountainGate();

    // 4. 青石守護神獅 (Z: 34.0)
    this.buildStoneLions();

    // 5. 神道宮燈與旌旗大道 (Z: 22.0 ~ 36.0)
    this.buildLanternAvenue();

    // 6. 漢白玉圍欄與深山古松林 (四周邊界)
    this.buildPerimeterTreesAndWalls();

    // 7. 戶外天公爐 (中進中央 Z: 11.5)
    this.buildHeavenCenser();

    // 8. 東進院落：荷花池與九曲石拱橋 (X: 12.5, Z: 13.5)
    this.buildWishingPond();

    // 9. 西進院落：八角金爐閣 (X: -12.5, Z: 14.5)
    this.buildJossPaperFurnace();

    // 10. 西進院落：祈願繪馬長廊 (X: -13.5, Z: 8.5)
    this.buildEmaWall();

    // 11. 東進院落：文昌閣智慧殿 (X: 13.5, Z: 5.5)
    this.buildWenchangPavilion();

    // 12. 東進院落：月老天賜良緣閣 (X: 13.5, Z: 23.5)
    this.buildYuelaoPavilion();

    // 13. 西進院落：五路財神金庫洞窟 (X: -13.5, Z: 23.5)
    this.buildCaishenCave();

    // 13.5 西進院落：太歲本命元辰殿 (X: -13.5, Z: 5.5)
    this.buildTaiSuiShrine();

    // 14. 東側前埕：晨鐘天鐘樓 (X: 9.5, Z: 30.0)
    this.buildBellTower();

    // 15. 西側前埕：暮鼓雷音樓 (X: -9.5, Z: 30.0)
    this.buildDrumTower();

    // 16. 迎神遶境八抬神轎與儀仗 (中央神道起點)
    this.buildPalanquinProcession();
  }

  // 1. 宏偉廟埕地坪 (中進廟埕 + 外進大埕)
  buildPlazaGround() {
    const stoneMat1 = new THREE.MeshStandardMaterial({ color: 0x2e2320, roughness: 0.55, metalness: 0.05 });
    const stoneMat2 = new THREE.MeshStandardMaterial({ color: 0x241a18, roughness: 0.6, metalness: 0.05 });

    // 中進廟埕廣場地磚 (Z: 5.5 ~ 23.5, 寬度 36m)
    const courtGeo1 = new THREE.PlaneGeometry(36, 18);
    const court1 = new THREE.Mesh(courtGeo1, stoneMat1);
    court1.rotation.x = -Math.PI / 2;
    court1.position.set(0, -0.01, 14.5);
    court1.receiveShadow = true;
    this.scene.add(court1);

    // 外進廟埕與山門前廣場 (Z: 23.5 ~ 43.5, 寬度 38m)
    const courtGeo2 = new THREE.PlaneGeometry(38, 20);
    const court2 = new THREE.Mesh(courtGeo2, stoneMat2);
    court2.rotation.x = -Math.PI / 2;
    court2.position.set(0, -0.01, 33.5);
    court2.receiveShadow = true;
    this.scene.add(court2);
  }

  // 2. 中央御道九龍神道
  buildCentralImperialPath() {
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.45, metalness: 0.1 });
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, roughness: 0.35, metalness: 0.6 });

    // 漢白玉與青石浮雕神道 (寬 4.8m，貫穿整座大殿至山門 Z: 5.8 ~ 37.0)
    const path = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 31.5), pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.005, 21.5);
    path.receiveShadow = true;
    this.scene.add(path);

    // 御道兩側金黃銅邊條
    [-2.42, 2.42].forEach(x => {
      const border = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 31.5), borderMat);
      border.position.set(x, 0.015, 21.5);
      this.scene.add(border);
    });
  }

  // 3. 巍峨山門牌樓 (Z: 38.0)
  buildMountainGate() {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, 38.0);
    gateGroup.name = "mountainGate";

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8a1c1c, roughness: 0.35 });
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x5a524c, roughness: 0.7 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.75, roughness: 0.25 });
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x224422, roughness: 0.5 });

    // 4根巍峨主柱 (中門寬 4.8m，兩側夾門各寬 2.4m)
    const pillarPositions = [-4.8, -1.8, 1.8, 4.8];
    pillarPositions.forEach(x => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 9.2, 24), pillarMat);
      pillar.position.set(x, 4.6, 0);
      pillar.castShadow = true;
      gateGroup.add(pillar);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.8, 16), baseMat);
      base.position.set(x, 0.4, 0);
      gateGroup.add(base);
    });

    // 大額枋橫樑 (綠色斗栱雕彩)
    const mainBeam = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.45, 0.7), beamMat);
    mainBeam.position.set(0, 7.8, 0);
    gateGroup.add(mainBeam);

    const subBeam = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.35, 0.9), beamMat);
    subBeam.position.set(0, 8.3, 0);
    gateGroup.add(subBeam);

    // 中央主樓歇山頂簷 (高聳九重)
    const mainRoof = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.4, 3.2), roofMat);
    mainRoof.position.set(0, 9.2, 0);
    gateGroup.add(mainRoof);

    const mainRidge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.4, 8), roofMat);
    mainRidge.rotation.z = Math.PI / 2;
    mainRidge.position.set(0, 9.5, 0);
    gateGroup.add(mainRidge);

    // 左右兩側次樓飛簷
    [-3.8, 3.8].forEach(x => {
      const sideRoof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 2.4), roofMat);
      sideRoof.position.set(x, 8.6, 0);
      gateGroup.add(sideRoof);
    });

    // 山門正中金字大牌匾
    const plaqueBoard = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.6, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x1a0808, roughness: 0.6 })
    );
    plaqueBoard.position.set(0, 7.1, 0.38);
    gateGroup.add(plaqueBoard);

    const pCanvas = document.createElement("canvas");
    pCanvas.width = 512;
    pCanvas.height = 128;
    const pCtx = pCanvas.getContext("2d");
    pCtx.fillStyle = "#f5c542";
    pCtx.font = "bold 44px 'Noto Serif TC', serif";
    pCtx.textAlign = "center";
    pCtx.fillText("⛩️ 賽 博 聖 境", 256, 75);
    const pTex = new THREE.CanvasTexture(pCanvas);
    const plaqueFace = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.55), new THREE.MeshBasicMaterial({ map: pTex, transparent: true }));
    plaqueFace.position.set(0, 7.1, 0.44);
    gateGroup.add(plaqueFace);

    // 山門前進香玉階 (5階步道)
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(11.2 - i * 0.4, 0.12, 0.55), baseMat);
      step.position.set(0, -i * 0.12, 1.2 + i * 0.55);
      gateGroup.add(step);
    }

    // 點擊判定區
    const gateHit = new THREE.Mesh(new THREE.BoxGeometry(11.5, 9.0, 1.5), new THREE.MeshBasicMaterial({ visible: false }));
    gateHit.position.set(0, 4.5, 0);
    gateGroup.add(gateHit);
    this.interactiveObjects.push(gateHit);
    gateHit.userData = { type: "mountainGate", tooltip: "⛩️ 巍峨山門牌樓 • 步入聖境，滌淨塵心 (點擊祈福)" };

    this.scene.add(gateGroup);
  }

  // 4. 青石守護神獅 (雄獅踩繡球、雌獅撫幼獅)
  buildStoneLions() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a524c, roughness: 0.65 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4 });

    [-5.5, 5.5].forEach((x, idx) => {
      const lionGroup = new THREE.Group();
      lionGroup.position.set(x, 0, 34.0);
      lionGroup.rotation.y = x > 0 ? -Math.PI / 12 : Math.PI / 12;

      // 雕花石台座
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.8), stoneMat);
      pedestal.position.y = 0.45;
      pedestal.castShadow = true;
      lionGroup.add(pedestal);

      // 獅身
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.2), stoneMat);
      body.position.set(0, 1.25, 0);
      body.castShadow = true;
      lionGroup.add(body);

      // 獅頭
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 16), stoneMat);
      head.position.set(0, 1.8, 0.35);
      lionGroup.add(head);

      // 卷毛鬃毛
      for (let m = 0; m < 6; m++) {
        const mane = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), stoneMat);
        mane.position.set((m % 3 - 1) * 0.32, 1.85, 0.1 - Math.floor(m / 3) * 0.25);
        lionGroup.add(mane);
      }

      // 繡球 / 幼獅
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), redMat);
      ball.position.set(x > 0 ? -0.25 : 0.25, 0.95, 0.6);
      lionGroup.add(ball);

      // 判定區
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 2.0), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = 1.1;
      lionGroup.add(hit);
      this.interactiveObjects.push(hit);
      hit.userData = {
        type: "stoneLion",
        tooltip: `🦁 青石神獅（${idx === 0 ? "雄獅踏繡球" : "雌獅撫幼獅"}）• 威鎮山門辟邪迎祥 (按 [E] 亦可)`
      };

      this.scene.add(lionGroup);
    });
  }

  // 5. 神道宮燈與旌旗大道 (Z: 22.0 ~ 36.0)
  buildLanternAvenue() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6e665e, roughness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a1c1c, roughness: 0.4 });

    [22.0, 26.0, 30.0, 34.0].forEach((z, zIdx) => {
      [-3.8, 3.8].forEach(x => {
        const lanternGroup = new THREE.Group();
        lanternGroup.position.set(x, 0, z);

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.3, 8), stoneMat);
        base.position.y = 0.15;
        lanternGroup.add(base);

        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.4, 8), stoneMat);
        pillar.position.y = 0.9;
        lanternGroup.add(pillar);

        // 燈室與金光
        const chamber = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 0.5, 6),
          new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0x884411 })
        );
        chamber.position.y = 1.7;
        lanternGroup.add(chamber);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.35, 6), stoneMat);
        roof.position.y = 2.1;
        lanternGroup.add(roof);

        // 燈幢點光源
        const pLight = new THREE.PointLight(0xff9922, 0.85, 4.5);
        pLight.position.set(0, 1.7, 0);
        lanternGroup.add(pLight);
        this.lanternLights.push(pLight);

        // 綵旗神幡
        const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.2), woodMat);
        flagPole.position.set(x > 0 ? 0.6 : -0.6, 2.1, 0);
        lanternGroup.add(flagPole);

        const flag = new THREE.Mesh(
          new THREE.PlaneGeometry(0.55, 1.2),
          new THREE.MeshStandardMaterial({ color: zIdx % 2 === 0 ? 0xd4a034 : 0xcc2222, side: THREE.DoubleSide })
        );
        flag.position.set(x > 0 ? 0.9 : -0.9, 3.2, 0);
        lanternGroup.add(flag);

        this.scene.add(lanternGroup);
      });
    });
  }

  // 6. 漢白玉圍欄與深山古松林 (四周邊界)
  buildPerimeterTreesAndWalls() {
    const railMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c8, roughness: 0.5 });
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3d281a, roughness: 0.8 });
    const pineNeedleMat = new THREE.MeshStandardMaterial({ color: 0x183818, roughness: 0.6 });

    // 漢白玉圍欄 (左右兩側 X = ±18.2, 縱貫 Z: 5.8 ~ 42.0)
    [-18.2, 18.2].forEach(x => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.85, 36.5), railMat);
      rail.position.set(x, 0.42, 24.0);
      this.scene.add(rail);

      // 望柱荷花蓮瓣
      for (let z = 6.0; z <= 42.0; z += 3.0) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.15, 8), railMat);
        post.position.set(x, 0.58, z);
        this.scene.add(post);

        const bud = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), railMat);
        bud.position.set(x, 1.22, z);
        this.scene.add(bud);
      }
    });

    // 外圍深山松柏古樹群 (X = ±20.5)
    [-20.5, 20.5].forEach(x => {
      for (let z = 7.0; z <= 41.0; z += 4.5) {
        const tree = new THREE.Group();
        tree.position.set(x + (Math.random() - 0.5) * 1.5, 0, z + (Math.random() - 0.5) * 1.5);

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3.8, 8), treeTrunkMat);
        trunk.position.y = 1.9;
        tree.add(trunk);

        // 三層錐形松樹冠
        [2.8, 3.8, 4.8].forEach((ty, lvl) => {
          const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.6 - lvl * 0.35, 1.6, 8), pineNeedleMat);
          foliage.position.y = ty;
          foliage.castShadow = true;
          tree.add(foliage);
        });

        this.scene.add(tree);
      }
    });
  }

  // 7. 戶外天公爐 (中進中央 Z: 11.5)
  buildHeavenCenser() {
    this.heavenCenser = new THREE.Group();
    this.heavenCenser.position.set(0, 0, 11.5);
    this.heavenCenser.name = "heavenCenser";

    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xb5882e, metalness: 0.85, roughness: 0.3 });

    // 天公高腳八卦鼎
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.75, 0.35, 8), bronzeMat);
    base.position.y = 0.175;
    this.heavenCenser.add(base);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.8, 12), bronzeMat);
    pillar.position.y = 0.75;
    this.heavenCenser.add(pillar);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 0.65, 16), bronzeMat);
    bowl.position.y = 1.35;
    bowl.castShadow = true;
    this.heavenCenser.add(bowl);

    // 香灰與通天大香
    const ash = new THREE.Mesh(new THREE.CircleGeometry(0.65, 16), new THREE.MeshStandardMaterial({ color: 0x888078 }));
    ash.rotation.x = -Math.PI / 2;
    ash.position.y = 1.65;
    this.heavenCenser.add(ash);

    const bigStick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7 })
    );
    bigStick.position.y = 2.3;
    this.heavenCenser.add(bigStick);

    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4400 }));
    ember.position.y = 3.05;
    this.heavenCenser.add(ember);

    this.interactiveObjects.push(bowl);
    bowl.userData = { type: "heavenCenser", tooltip: "🔥 點擊天公爐 或 走近按 [E]：敬拜天公 (行禮)" };

    this.scene.add(this.heavenCenser);
  }

  // 8. 東進院落：蓮花池與九曲石拱橋 (X: 12.5, Z: 13.5)
  buildWishingPond() {
    this.wishingPond = new THREE.Group();
    this.wishingPond.position.set(12.5, 0, 13.5);
    this.wishingPond.name = "wishingPond";

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4d423b, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x6e6056, roughness: 0.6 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.5 });
    const lotusMat = new THREE.MeshStandardMaterial({ color: 0xf06292, roughness: 0.4 });
    const goldCenterMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, metalness: 0.8 });

    // 大荷花池岸 (寬 8.5m x 長 12m)
    const pondBase = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.4, 12.5), stoneMat);
    pondBase.position.y = 0.2;
    this.wishingPond.add(pondBase);

    // 水面 (翠綠清澈微波)
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1d5d61,
      roughness: 0.1,
      metalness: 0.5,
      transparent: true,
      opacity: 0.88
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 12.0), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.35;
    this.wishingPond.add(water);

    // 跨池九曲石拱橋 (3D 實體可走踏拱橋)
    const bridgeGroup = new THREE.Group();
    const bridgeArch = new THREE.Mesh(
      new THREE.BoxGeometry(7.8, 0.22, 1.6),
      new THREE.MeshStandardMaterial({ color: 0xd8d0c8, roughness: 0.6 })
    );
    bridgeArch.position.set(0, 0.55, 0);
    bridgeGroup.add(bridgeArch);

    // 拱橋欄杆
    [-0.8, 0.8].forEach(bz => {
      const bRail = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.45, 0.1), rimMat);
      bRail.position.set(0, 0.85, bz);
      bridgeGroup.add(bRail);
    });
    this.wishingPond.add(bridgeGroup);

    // 蓮花座中央金台 (投幣目標)
    const goldPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.3, 8), goldCenterMat);
    goldPedestal.position.set(0, 0.45, 2.8);
    this.wishingPond.add(goldPedestal);

    // 盛開蓮花瓣
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), lotusMat);
      petal.scale.set(0.6, 1.4, 0.3);
      petal.rotation.x = 0.5;
      petal.rotation.y = angle;
      petal.position.set(Math.cos(angle) * 0.24, 0.6, 2.8 + Math.sin(angle) * 0.24);
      this.wishingPond.add(petal);
    }

    // 散落池面蓮葉
    [[-1.8, 1.5], [1.9, -2.4], [-2.2, -1.8], [2.1, 2.2], [-1.2, 3.4]].forEach(([lx, lz]) => {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12), leafMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(lx, 0.36, lz);
      this.wishingPond.add(pad);
    });

    // 錦鯉池水生生態 (Koi Fish Ecology)
    this.buildKoiFish();

    this.interactiveObjects.push(pondBase);
    pondBase.userData = { type: "wishingPond", tooltip: "🪙 點擊許願池 或 走近按 [E]：投擲金幣許願" };

    this.scene.add(this.wishingPond);
  }

  // 構建蓮花池 3D 錦鯉生態群
  buildKoiFish() {
    this.koiFish = [];
    const fishStyles = [
      { name: "kohaku1", color: 0xffffff, spotColor: 0xef4444 }, // 紅白錦鯉
      { name: "kohaku2", color: 0xffffff, spotColor: 0xf97316 }, // 橙白錦鯉
      { name: "gold1", color: 0xf59e0b, spotColor: 0xffd700 }, // 純金黃金錦鯉
      { name: "gold2", color: 0xd97706, spotColor: 0xfbbf24 }, // 琉璃金錦鯉
      { name: "showa", color: 0x1e293b, spotColor: 0xef4444 }, // 墨黑赤紅三色
      { name: "kohaku3", color: 0xfef08a, spotColor: 0xe11d48 } // 緋白錦鯉
    ];

    fishStyles.forEach((style, idx) => {
      const fishGroup = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: style.color,
        roughness: 0.35,
        metalness: 0.1
      });
      const spotMat = new THREE.MeshStandardMaterial({
        color: style.spotColor,
        roughness: 0.3,
        metalness: 0.2
      });

      // 1. 流線形魚身
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 8), bodyMat);
      body.rotation.x = Math.PI / 2;
      body.scale.set(1.0, 1.0, 0.55);
      fishGroup.add(body);

      // 斑紋色塊
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), spotMat);
      spot.scale.set(0.9, 0.4, 1.4);
      spot.position.set(0, 0.02, 0.04);
      fishGroup.add(spot);

      // 2. 擺動尾鰭
      const tailFin = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.16),
        new THREE.MeshStandardMaterial({ color: style.spotColor, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      tailFin.position.set(0, 0.02, -0.26);
      fishGroup.add(tailFin);

      // 3. 左右胸鰭
      [-0.07, 0.07].forEach(fx => {
        const fin = new THREE.Mesh(
          new THREE.PlaneGeometry(0.06, 0.09),
          new THREE.MeshStandardMaterial({ color: style.color, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
        );
        fin.position.set(fx, 0, 0.08);
        fin.rotation.z = fx > 0 ? -0.4 : 0.4;
        fin.rotation.y = fx > 0 ? 0.3 : -0.3;
        fishGroup.add(fin);
      });

      // 初始游弋參數 (分佈於蓮花池中)
      const angle = (idx / fishStyles.length) * Math.PI * 2;
      const radiusX = 1.3 + (idx % 3) * 0.7;
      const radiusZ = 2.0 + (idx % 2) * 1.3;
      fishGroup.position.set(Math.cos(angle) * radiusX, 0.25, Math.sin(angle) * radiusZ);

      this.wishingPond.add(fishGroup);

      this.koiFish.push({
        group: fishGroup,
        tailFin: tailFin,
        angle: angle,
        speed: 0.45 + (idx % 4) * 0.15,
        radiusX: radiusX,
        radiusZ: radiusZ,
        targetPos: null,
        jumpProgress: 0,
        baseY: 0.24 + (idx % 3) * 0.03
      });
    });
  }

  // 9. 西進院落：八角金爐閣 (X: -12.5, Z: 14.5)
  buildJossPaperFurnace() {
    this.jossFurnace = new THREE.Group();
    this.jossFurnace.position.set(-12.5, 0, 14.5);
    this.jossFurnace.name = "jossFurnace";

    const brickMat = new THREE.MeshStandardMaterial({ color: 0x8a241c, roughness: 0.75 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.75, roughness: 0.25 });

    // 磚造八角爐身
    const furnaceBase = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.8, 8), brickMat);
    furnaceBase.position.y = 0.9;
    furnaceBase.castShadow = true;
    this.jossFurnace.add(furnaceBase);

    // 投紙口 (黑色拱洞 + 內部火光)
    const archHole = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.3), new THREE.MeshBasicMaterial({ color: 0x110202 }));
    archHole.position.set(0.9, 0.95, 0);
    archHole.rotation.y = Math.PI / 2;
    this.jossFurnace.add(archHole);

    // 爐內常明火點光源
    const furnaceLight = new THREE.PointLight(0xff5500, 2.6, 5);
    furnaceLight.position.set(0.7, 0.95, 0);
    this.jossFurnace.add(furnaceLight);

    // 爐頂金色寶塔尖
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.1, 8), roofMat);
    roof.position.y = 2.3;
    this.jossFurnace.add(roof);

    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8), roofMat);
    spire.position.y = 3.0;
    this.jossFurnace.add(spire);

    this.interactiveObjects.push(furnaceBase);
    furnaceBase.userData = { type: "jossFurnace", tooltip: "🔥 點擊金爐 或 走近按 [E]：焚燒金紙化寶" };

    this.scene.add(this.jossFurnace);
  }

  // 繁星穹頂 (Night Starfield) - 覆蓋浩瀚三進聖境夜空
  buildStarField() {
    const starCount = 1200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 85;
      positions[i * 3 + 1] = 10.0 + Math.random() * 32;
      positions[i * 3 + 2] = -15.0 + Math.random() * 75;

      const r = 0.8 + Math.random() * 0.2;
      const g = 0.85 + Math.random() * 0.15;
      const b = 0.95 + Math.random() * 0.05;
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    this.starPoints = new THREE.Points(geo, mat);
    this.scene.add(this.starPoints);
  }

  // 四時辰光影晝夜切換 (卯時晨霧 / 午時金陽 / 酉時夕照 / 子時星空)
  // 適應廣闊 40 米大埕視野，霧氣濃度調降為 0.009 ~ 0.016 確保深遠景深
  setShichen(shichenKey) {
    this.currentShichen = shichenKey;
    let actualKey = shichenKey;
    if (shichenKey === "auto") {
      const h = new Date().getHours();
      if (h >= 5 && h < 9) actualKey = "dawn";
      else if (h >= 9 && h < 16) actualKey = "noon";
      else if (h >= 16 && h < 19) actualKey = "dusk";
      else actualKey = "midnight";
    }

    if (actualKey === "dawn") {
      this.renderer.setClearColor(0x281926, 1);
      this.scene.fog.color.setHex(0x352033);
      this.scene.fog.density = 0.012;
      if (this.ambientLight) this.ambientLight.color.setHex(0x916d7e);
      if (this.mainSpot) { this.mainSpot.color.setHex(0xffe6c2); this.mainSpot.intensity = 2.4; }
      if (this.sunMoonLight) {
        this.sunMoonLight.color.setHex(0xffb896);
        this.sunMoonLight.intensity = 1.4;
        this.sunMoonLight.position.set(16, 18, 26);
      }
      if (this.starPoints) this.starPoints.material.opacity = 0;
      this.setLanternsIntensity(1.0);
    } else if (actualKey === "noon") {
      this.renderer.setClearColor(0x1a120e, 1);
      this.scene.fog.color.setHex(0x241812);
      this.scene.fog.density = 0.009;
      if (this.ambientLight) this.ambientLight.color.setHex(0x7a3d2e);
      if (this.mainSpot) { this.mainSpot.color.setHex(0xffdf88); this.mainSpot.intensity = 3.2; }
      if (this.sunMoonLight) {
        this.sunMoonLight.color.setHex(0xfff6df);
        this.sunMoonLight.intensity = 2.0;
        this.sunMoonLight.position.set(8, 28, 20);
      }
      if (this.starPoints) this.starPoints.material.opacity = 0;
      this.setLanternsIntensity(1.2);
    } else if (actualKey === "dusk") {
      this.renderer.setClearColor(0x240d12, 1);
      this.scene.fog.color.setHex(0x36141a);
      this.scene.fog.density = 0.014;
      if (this.ambientLight) this.ambientLight.color.setHex(0x752e25);
      if (this.mainSpot) { this.mainSpot.color.setHex(0xff8833); this.mainSpot.intensity = 2.6; }
      if (this.sunMoonLight) {
        this.sunMoonLight.color.setHex(0xff5511);
        this.sunMoonLight.intensity = 1.6;
        this.sunMoonLight.position.set(-18, 16, 24);
      }
      if (this.starPoints) this.starPoints.material.opacity = 0.25;
      this.setLanternsIntensity(1.8);
    } else if (actualKey === "midnight") {
      this.renderer.setClearColor(0x050711, 1);
      this.scene.fog.color.setHex(0x080c18);
      this.scene.fog.density = 0.016;
      if (this.ambientLight) this.ambientLight.color.setHex(0x1c2438);
      if (this.mainSpot) { this.mainSpot.color.setHex(0xffb555); this.mainSpot.intensity = 2.3; }
      if (this.sunMoonLight) {
        this.sunMoonLight.color.setHex(0x6688cc);
        this.sunMoonLight.intensity = 1.0;
        this.sunMoonLight.position.set(12, 22, 22);
      }
      if (this.starPoints) this.starPoints.material.opacity = 0.95;
      this.setLanternsIntensity(2.4);
    }

    if (window.templeAudio) {
      window.templeAudio.playShichenChime(actualKey);
    }
  }

  setLanternsIntensity(factor) {
    this.lanternLights.forEach(light => {
      light.intensity = 1.2 * factor;
      light.distance = 4.5 * factor;
    });
  }

  // 祈願繪馬木牌閣 (Ema Plaque Wishing Wall - 西進祈願長廊 X: -13.5, Z: 8.5)
  buildEmaWall() {
    this.emaRackGroup = new THREE.Group();
    this.emaRackGroup.position.set(-13.5, 0, 8.5);
    this.emaRackGroup.rotation.y = 0;
    this.emaRackGroup.name = "emaWall";

    const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x3d1d14, roughness: 0.7 });
    const woodBarMat = new THREE.MeshStandardMaterial({ color: 0x825232, roughness: 0.5 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a241c, roughness: 0.4, metalness: 0.1 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7 });

    // 兩根主木柱
    [-1.4, 1.4].forEach(x => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.2, 12), woodDarkMat);
      pillar.position.set(x, 1.6, 0);
      pillar.castShadow = true;
      this.emaRackGroup.add(pillar);
    });

    // 橫樑 (上橫樑、中橫樑、下橫樑)
    [1.1, 1.8, 2.5].forEach(y => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.08), woodBarMat);
      beam.position.set(0, y, 0);
      this.emaRackGroup.add(beam);
    });

    // 屋頂遮簷
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.16, 0.6), roofMat);
    roof.position.set(0, 3.2, 0);
    this.emaRackGroup.add(roof);

    const roofRidge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8), goldMat);
    roofRidge.rotation.z = Math.PI / 2;
    roofRidge.position.set(0, 3.32, 0);
    this.emaRackGroup.add(roofRidge);

    // 牌匾 "祈願木牌閣"
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.35, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x22110c, roughness: 0.6 })
    );
    signBoard.position.set(0, 2.9, 0.08);
    this.emaRackGroup.add(signBoard);

    const signCanvas = document.createElement("canvas");
    signCanvas.width = 256;
    signCanvas.height = 64;
    const sCtx = signCanvas.getContext("2d");
    sCtx.fillStyle = "#f5c542";
    sCtx.font = "bold 26px 'Noto Serif TC', serif";
    sCtx.textAlign = "center";
    sCtx.fillText("⛩️ 祈願木牌閣", 128, 42);
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.3), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
    signFace.position.set(0, 2.9, 0.12);
    this.emaRackGroup.add(signFace);

    // 點擊判定區
    const clickZone = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 3.2, 0.6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    clickZone.position.set(0, 1.6, 0);
    this.emaRackGroup.add(clickZone);

    this.interactiveObjects.push(clickZone);
    clickZone.userData = {
      type: "emaWall",
      tooltip: "⛩️ 祈願木牌閣 • 點擊掛上/查看木牌 (按 [E] 亦可)"
    };

    this.scene.add(this.emaRackGroup);

    // 載入掛牌
    this.loadEmaPlaques();
  }

  // 載入預設與儲存的祈願木牌
  loadEmaPlaques() {
    const defaultPlaques = [
      { name: "考生小明", type: "exam", wish: "文昌帝君保佑考研順利上岸！", icon: "🎓" },
      { name: "科技碼農", type: "tech", wish: "乖乖神保佑專案零Bug、伺服器常綠！", icon: "🟢" },
      { name: "虔誠信女", type: "romance", wish: "月老爺爺賜良緣，覓得相知相守之人。", icon: "❤️" },
      { name: "創業阿榮", type: "wealth", wish: "武財神賜福正偏財亨通，生意興隆！", icon: "💰" },
      { name: "雲端居士", type: "peace", wish: "天上聖母慈悲護佑，信眾全家康泰祥和。", icon: "🛡️" }
    ];

    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem("temple_ema_plaques") || "[]");
    } catch (e) {}

    const all = [...defaultPlaques, ...stored];
    all.slice(-8).forEach((item, idx) => {
      this.spawnEmaPlaqueMesh(item, idx);
    });
  }

  // 在木架上實體掛上一片 3D 木牌
  spawnEmaPlaqueMesh(data, slotIdx) {
    if (!this.emaRackGroup) return;

    const row = Math.floor(slotIdx / 4);
    const col = slotIdx % 4;

    const x = -1.05 + col * 0.7;
    const y = row === 0 ? 2.3 : 1.6;

    const group = new THREE.Group();
    group.position.set(x, y, 0.05);

    // 掛繩
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6),
      new THREE.MeshBasicMaterial({ color: 0xcc2222 })
    );
    rope.position.y = 0.12;
    group.add(rope);

    // 木牌本體
    const plaqueMat = new THREE.MeshStandardMaterial({ color: 0xecd5ab, roughness: 0.6 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.02), plaqueMat);
    board.castShadow = true;
    group.add(board);

    // 木牌正面文字貼圖
    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 228;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#eedab0";
    ctx.fillRect(0, 0, 192, 228);

    ctx.strokeStyle = "#8b1c1c";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 180, 216);

    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.icon || "🏮", 96, 45);

    ctx.fillStyle = "#8b1c1c";
    ctx.font = "bold 20px 'Noto Serif TC', serif";
    ctx.fillText(data.name || "善信", 96, 80);

    ctx.fillStyle = "#3a1708";
    ctx.font = "16px 'Noto Serif TC', serif";
    const shortWish = (data.wish || "平安吉祥").slice(0, 16);
    ctx.fillText(shortWish.slice(0, 8), 96, 118);
    if (shortWish.length > 8) {
      ctx.fillText(shortWish.slice(8, 16), 96, 142);
    }

    ctx.fillStyle = "#a82020";
    ctx.font = "14px 'Noto Serif TC', serif";
    ctx.fillText("虔誠祈福", 96, 195);

    const tex = new THREE.CanvasTexture(canvas);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.36), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.set(0, 0, 0.012);
    group.add(face);

    // 點擊個別木牌查看
    const plaqueHit = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.08), new THREE.MeshBasicMaterial({ visible: false }));
    group.add(plaqueHit);
    this.interactiveObjects.push(plaqueHit);
    plaqueHit.userData = {
      type: "emaPlaque",
      data: data,
      tooltip: `📜 【${data.name}】祈願：${data.wish}`
    };

    this.emaRackGroup.add(group);
    this.emaPlaques.push({ group, offset: slotIdx * 0.9 });
  }

  // 懸掛新木牌
  hangNewEmaPlaque(data) {
    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem("temple_ema_plaques") || "[]");
    } catch (e) {}
    stored.push(data);
    localStorage.setItem("temple_ema_plaques", JSON.stringify(stored));

    const slotIdx = this.emaPlaques.length % 8;
    this.spawnEmaPlaqueMesh(data, slotIdx);

    if (window.templeAudio) {
      window.templeAudio.playPlaqueHang();
    }
    this.spawn3DFloatingText(`🪵 ${data.name} 祈願木牌已掛上！`, new THREE.Vector3(-13.5, 2.8, 8.5));
  }

  // 11. 東進院落：文昌閣智慧殿 (X: 13.5, Z: 5.5)
  buildWenchangPavilion() {
    const group = new THREE.Group();
    group.position.set(13.5, 0, 5.5);
    group.name = "wenchangPavilion";

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d1c12, roughness: 0.6 });
    const blueRoofMat = new THREE.MeshStandardMaterial({ color: 0x1d4e66, roughness: 0.35, metalness: 0.2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.8, roughness: 0.2 });

    // 青石八角台基
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x4a423d, roughness: 0.7 }));
    base.position.y = 0.2;
    base.receiveShadow = true;
    group.add(base);

    // 八根八角立柱
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.6, 8), woodMat);
      col.position.set(Math.cos(angle) * 2.6, 1.8, Math.sin(angle) * 2.6);
      col.castShadow = true;
      group.add(col);
    }

    // 閣身木雕花壁
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 3.2, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0x5a2818, roughness: 0.7 }));
    wall.position.y = 1.8;
    group.add(wall);

    // 下層歇山飛簷
    const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 0.8, 8), blueRoofMat);
    lowerRoof.position.y = 3.8;
    group.add(lowerRoof);

    // 上層閣樓
    const upperWall = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.6, 8), woodMat);
    upperWall.position.y = 4.8;
    group.add(upperWall);

    // 上層金頂飛簷寶塔
    const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.0, 8), blueRoofMat);
    upperRoof.position.y = 5.8;
    group.add(upperRoof);

    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.0, 8), goldMat);
    spire.position.y = 6.6;
    group.add(spire);

    // 金字匾額 "文昌閣 • 魁星點斗"
    const plaqueMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.08), new THREE.MeshStandardMaterial({ color: 0x1a0a0a }));
    plaqueMesh.position.set(0, 3.1, 2.35);
    group.add(plaqueMesh);

    const pCanvas = document.createElement("canvas");
    pCanvas.width = 256;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext("2d");
    pCtx.fillStyle = "#f5c542";
    pCtx.font = "bold 24px 'Noto Serif TC', serif";
    pCtx.textAlign = "center";
    pCtx.fillText("🎓 文 昌 閣", 128, 42);
    const pTex = new THREE.CanvasTexture(pCanvas);
    const pFace = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.4), new THREE.MeshBasicMaterial({ map: pTex, transparent: true }));
    pFace.position.set(0, 3.1, 2.4);
    group.add(pFace);

    // 門前立體魁星金筆 (Giant Scholar Brush)
    const brushGroup = new THREE.Group();
    brushGroup.position.set(0, 0, 3.2);

    const brushStand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x4a423d }));
    brushStand.position.y = 0.25;
    brushGroup.add(brushStand);

    const brushPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 12), goldMat);
    brushPole.position.y = 1.35;
    brushGroup.add(brushPole);

    const brushTip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0x221111, roughness: 0.8 }));
    brushTip.position.y = 2.45;
    brushGroup.add(brushTip);

    group.add(brushGroup);

    // 點擊判定區
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(5.0, 5.0, 5.0), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 2.5, 0);
    group.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "wenchangPavilion",
      tooltip: "🎓 文昌閣智慧殿 • 點智慧筆、求功名利祿 (按 [E] 亦可)"
    };

    this.scene.add(group);
  }

  // 12. 東進院落：月老天賜良緣閣 (X: 13.5, Z: 23.5)
  buildYuelaoPavilion() {
    const group = new THREE.Group();
    group.position.set(13.5, 0, 23.5);
    group.name = "yuelaoPavilion";

    const redWoodMat = new THREE.MeshStandardMaterial({ color: 0x8a2020, roughness: 0.5 });
    const pinkRoofMat = new THREE.MeshStandardMaterial({ color: 0xa83248, roughness: 0.4, metalness: 0.1 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.8 });

    // 桃紅台基
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.2, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0x4d3838, roughness: 0.7 }));
    base.position.y = 0.2;
    base.receiveShadow = true;
    group.add(base);

    // 六根朱紅木柱
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 3.4, 8), redWoodMat);
      col.position.set(Math.cos(angle) * 2.4, 1.7, Math.sin(angle) * 2.4);
      group.add(col);
    }

    // 亭頂粉桃六角攢尖頂
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.4, 6), pinkRoofMat);
    roof.position.y = 4.0;
    group.add(roof);

    const roofBall = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), goldMat);
    roofBall.position.y = 4.9;
    group.add(roofBall);

    // 粉紅暖光燈
    const pLight = new THREE.PointLight(0xff6688, 1.8, 6.0);
    pLight.position.set(0, 2.2, 0);
    group.add(pLight);

    // 金字匾額 "月老閣 • 天賜良緣"
    const pCanvas = document.createElement("canvas");
    pCanvas.width = 256;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext("2d");
    pCtx.fillStyle = "#ffd0d8";
    pCtx.font = "bold 24px 'Noto Serif TC', serif";
    pCtx.textAlign = "center";
    pCtx.fillText("❤️ 月 老 閣", 128, 42);
    const pTex = new THREE.CanvasTexture(pCanvas);
    const pFace = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.38), new THREE.MeshBasicMaterial({ map: pTex, transparent: true }));
    pFace.position.set(0, 3.1, 2.15);
    group.add(pFace);

    // 門前巨型同心金鎖 (Giant Concentric Love Lock)
    const lockGroup = new THREE.Group();
    lockGroup.position.set(0, 0, 2.8);

    const lockStand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x4a423d }));
    lockStand.position.y = 0.25;
    lockGroup.add(lockStand);

    const lockBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.16), goldMat);
    lockBody.position.y = 0.72;
    lockGroup.add(lockBody);

    const lockShackle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16, Math.PI), goldMat);
    lockShackle.rotation.z = Math.PI;
    lockShackle.position.set(0, 1.05, 0);
    lockGroup.add(lockShackle);

    group.add(lockGroup);

    // 點擊判定區
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.8, 4.8), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 2.4, 0);
    group.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "yuelaoPavilion",
      tooltip: "❤️ 月老天賜良緣閣 • 牽紅線、扣同心鎖、問良緣 (按 [E] 亦可)"
    };

    this.scene.add(group);
  }

  // 13. 西進院落：五路財神金庫洞窟 (X: -13.5, Z: 23.5)
  buildCaishenCave() {
    const group = new THREE.Group();
    group.position.set(-13.5, 0, 23.5);
    group.name = "caishenCave";

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3d352e, roughness: 0.85 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.15 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0x8a1c1c, roughness: 0.5 });

    // 洞窟金石基座
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.5, 0.4, 8), rockMat);
    base.position.y = 0.2;
    base.receiveShadow = true;
    group.add(base);

    // 金石洞窟拱門主體
    const caveArch = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.8, 8, 16, Math.PI), rockMat);
    caveArch.position.set(0, 1.8, 0);
    caveArch.rotation.z = Math.PI;
    group.add(caveArch);

    const backWall = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.2, 8, 1, false, 0, Math.PI), rockMat);
    backWall.position.set(0, 1.8, -0.2);
    group.add(backWall);

    // 洞頂琉璃金瓦簷
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 2.6), redMat);
    roof.position.set(0, 3.5, 0);
    group.add(roof);

    // 洞內黃金寶光
    const goldLight = new THREE.PointLight(0xffbb22, 2.4, 6.0);
    goldLight.position.set(0, 1.6, 0.2);
    group.add(goldLight);

    // 金字匾額 "財神殿 • 招財進寶"
    const pCanvas = document.createElement("canvas");
    pCanvas.width = 256;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext("2d");
    pCtx.fillStyle = "#ffdd44";
    pCtx.font = "bold 24px 'Noto Serif TC', serif";
    pCtx.textAlign = "center";
    pCtx.fillText("💰 財 神 殿", 128, 42);
    const pTex = new THREE.CanvasTexture(pCanvas);
    const pFace = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.38), new THREE.MeshBasicMaterial({ map: pTex, transparent: true }));
    pFace.position.set(0, 3.1, 1.15);
    group.add(pFace);

    // 洞前巨型金元寶聚寶盆 (Treasure Basin with Golden Ingot)
    const basinGroup = new THREE.Group();
    basinGroup.position.set(0, 0, 2.2);

    const basinBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.45, 12), redMat);
    basinBase.position.y = 0.225;
    basinGroup.add(basinBase);

    // 金元寶造型 (雙橢圓金錠)
    const ingotBody = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), goldMat);
    ingotBody.scale.set(1.5, 0.7, 0.9);
    ingotBody.position.y = 0.65;
    basinGroup.add(ingotBody);

    const ingotTop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), goldMat);
    ingotTop.position.set(0, 0.82, 0);
    basinGroup.add(ingotTop);

    // 金虎爺像 (Golden Tiger General)
    const tigerMat = new THREE.MeshStandardMaterial({ color: 0xd49b20, roughness: 0.4 });
    const tiger = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.55), tigerMat);
    tiger.position.set(1.4, 0.35, 1.8);
    basinGroup.add(tiger);

    group.add(basinGroup);

    // 點擊判定區
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.8, 4.8), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 2.4, 0);
    group.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "caishenCave",
      tooltip: "💰 五路財神金庫 • 摸金元寶、請發財水、金虎爺咬錢 (按 [E] 亦可)"
    };

    this.scene.add(group);
  }

  // 13.5 西進院落：太歲本命元辰殿 (X: -13.5, Z: 5.5)
  buildTaiSuiShrine() {
    const group = new THREE.Group();
    group.position.set(-13.5, 0, 5.5);
    group.name = "taisuiShrine";

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a1818, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.8, roughness: 0.25 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1f3b30, roughness: 0.45, metalness: 0.1 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3d3532, roughness: 0.7 });

    // 1. 基座台基
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.45, 4.8), stoneMat);
    base.position.y = 0.225;
    group.add(base);

    // 2. 四根朱漆大柱與金箍
    const pillarGeo = new THREE.CylinderGeometry(0.14, 0.14, 3.2, 12);
    [
      [-1.9, 1.82, -1.9],
      [1.9, 1.82, -1.9],
      [-1.9, 1.82, 1.9],
      [1.9, 1.82, 1.9]
    ].forEach(([x, y, z]) => {
      const p = new THREE.Mesh(pillarGeo, woodMat);
      p.position.set(x, y, z);
      group.add(p);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 12), goldMat);
      cap.position.set(x, 3.42, z);
      group.add(cap);
    });

    // 3. 殿宇重檐歇山頂
    const roofGeo = new THREE.ConeGeometry(3.6, 1.5, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 4.15;
    group.add(roof);

    // 寶頂金葫蘆
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), goldMat);
    finial.position.y = 4.95;
    group.add(finial);

    // 4. 殿額金匾「太歲元辰殿」
    const plaqueGeo = new THREE.BoxGeometry(1.6, 0.42, 0.08);
    const plaque = new THREE.Mesh(plaqueGeo, woodMat);
    plaque.position.set(0, 3.15, 1.95);
    group.add(plaque);

    const pBorder = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.48, 0.06), goldMat);
    pBorder.position.set(0, 3.15, 1.93);
    group.add(pBorder);

    // 5. 神案與太歲神牌
    const altar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 1.2), woodMat);
    altar.position.set(0, 0.87, 0);
    group.add(altar);

    // 太歲星君金光神牌 (Golden Tai Sui Plaque)
    const plaqueTable = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.1, 0.08), goldMat);
    plaqueTable.position.set(0, 1.85, -0.15);
    group.add(plaqueTable);
    this.taiSuiPlaqueMesh = plaqueTable;

    // 6. 本命元辰長生斗燈 (Yuan Chen Dipper Lamp)
    const dipperGroup = new THREE.Group();
    dipperGroup.position.set(0, 1.32, 0.2);

    // 八角長生斗 (木質斗桶盛滿五穀白米)
    const dipperGeo = new THREE.CylinderGeometry(0.38, 0.32, 0.28, 8);
    const dipperMat = new THREE.MeshStandardMaterial({ color: 0x8a2020, roughness: 0.5 });
    const dipperMesh = new THREE.Mesh(dipperGeo, dipperMat);
    dipperGroup.add(dipperMesh);

    // 斗內白米五穀
    const riceGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.04, 16);
    const riceMat = new THREE.MeshStandardMaterial({ color: 0xfffde7, roughness: 0.8 });
    const rice = new THREE.Mesh(riceGeo, riceMat);
    rice.position.y = 0.12;
    dipperGroup.add(rice);

    // 斗中法器：青銅七星神劍、吉祥剪刀、度量尺
    const swordMat = new THREE.MeshStandardMaterial({ color: 0x80deea, metalness: 0.8 });
    const dipperSword = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.45, 0.01), swordMat);
    dipperSword.position.set(-0.12, 0.32, 0);
    dipperGroup.add(dipperSword);

    const rulerMat = new THREE.MeshStandardMaterial({ color: 0xd4a034 });
    const ruler = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.38, 0.008), rulerMat);
    ruler.position.set(0.12, 0.28, 0);
    dipperGroup.add(ruler);

    // 斗心長明琉璃斗燈 (Eternal Flame & Light)
    const lampGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.07, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffecb3, transparent: true, opacity: 0.75, emissive: 0xffb300, emissiveIntensity: 0.4 })
    );
    lampGlass.position.set(0, 0.22, 0);
    dipperGroup.add(lampGlass);

    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6d00 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), flameMat);
    flame.position.set(0, 0.34, 0);
    dipperGroup.add(flame);
    this.taiSuiFlameMesh = flame;

    // 斗燈神聖光源
    const dipperLight = new THREE.PointLight(0xffaa22, 1.4, 5.5);
    dipperLight.position.set(0, 0.45, 0);
    dipperGroup.add(dipperLight);
    this.taiSuiDipperLight = dipperLight;

    group.add(dipperGroup);

    // 7. 點擊與射線互動判定盒
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.8, 4.8), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 2.4, 0);
    group.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "taisuiShrine",
      tooltip: "🏮 太歲殿 • 安奉太歲星君與元辰斗燈 (點擊或按 [E] 進入)"
    };

    this.scene.add(group);
  }

  // 點亮元辰斗燈與安奉太歲星君科儀特效
  lightTaiSuiDipper(petitionerName = "善信", zodiacName = "生肖", generalName = "太歲星君") {
    if (this.avatar) {
      this.avatar.triggerAction("pray");
    }
    if (window.templeAudio) {
      window.templeAudio.playTaiSuiBlessing();
    }

    const pos = new THREE.Vector3(-13.5, 1.8, 5.5);

    // 金牌加持輝光
    if (this.taiSuiDipperLight) {
      this.taiSuiDipperLight.intensity = 3.2;
      setTimeout(() => {
        if (this.taiSuiDipperLight) this.taiSuiDipperLight.intensity = 1.4;
      }, 2500);
    }

    this.spawn3DFloatingText(`🏮 ${petitionerName} 安奉太歲 • 元辰光彩！`, pos.clone().add(new THREE.Vector3(0, 2.2, 0)));
    if (window.setDockStatus) window.setDockStatus(`🏮 善信【${petitionerName}】（${zodiacName}）已於太歲殿虔誠安奉【${generalName}】，本命元辰斗燈長明！`);
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku(`🏮 恭賀善信【${petitionerName}】於太歲殿祈安植福，元辰光彩、逢凶化吉！`);
    if (window.addMerit) window.addMerit(150);
  }

  // 拍攝目前場景高清畫面 (供拍立得與明信片使用)
  takeSnapshot() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL("image/png");
  }

  // 14. 東側前埕：晨鐘天鐘樓 (X: 9.5, Z: 30.0)
  buildBellTower() {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(9.5, 0, 30.0);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a423e, roughness: 0.7 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c1a1a, roughness: 0.5 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x243d34, roughness: 0.45 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7, roughness: 0.3 });
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x826842, metalness: 0.85, roughness: 0.35 });

    // 1. 基座石階
    const baseGeo = new THREE.BoxGeometry(4.2, 0.7, 4.2);
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 0.35;
    base.receiveShadow = true;
    towerGroup.add(base);

    // 2. 四根朱紅大柱
    const pillarPositions = [
      [-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]
    ];
    pillarPositions.forEach(([px, pz]) => {
      const pGeo = new THREE.CylinderGeometry(0.14, 0.16, 3.6, 12);
      const pillar = new THREE.Mesh(pGeo, woodMat);
      pillar.position.set(px, 2.5, pz);
      pillar.castShadow = true;
      towerGroup.add(pillar);
    });

    // 3. 飛簷屋頂 (重檐歇山頂)
    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.2, 4), tileMat);
    roof1.position.y = 4.6;
    roof1.rotation.y = Math.PI / 4;
    towerGroup.add(roof1);

    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(2.6, 0.9, 4), tileMat);
    roof2.position.y = 5.4;
    roof2.rotation.y = Math.PI / 4;
    towerGroup.add(roof2);

    // 金色寶頂
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), goldMat);
    finial.position.y = 6.0;
    towerGroup.add(finial);

    // 4. 大梵金鐘 (Grand Bronze Bell)
    const bellGroup = new THREE.Group();
    bellGroup.position.set(0, 2.6, 0);

    const bellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 1.5, 20), bronzeMat);
    bellBody.castShadow = true;
    bellGroup.add(bellBody);

    const bellTop = new THREE.Mesh(new THREE.SphereGeometry(0.56, 16, 16), bronzeMat);
    bellTop.position.y = 0.75;
    bellGroup.add(bellTop);

    // 鐘口祥雲下緣
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.08, 12, 24), goldMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.75;
    bellGroup.add(rim);

    // 鐘紐蒲牢神獸吊環
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 16), goldMat);
    hook.position.y = 1.35;
    bellGroup.add(hook);

    towerGroup.add(bellGroup);

    // 5. 懸掛撞木 (Striker Log)
    const strikerGroup = new THREE.Group();
    strikerGroup.position.set(1.5, 3.2, 0);

    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), woodMat);
    cord.position.set(0, -0.6, 0);
    strikerGroup.add(cord);

    const logGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.4, 12);
    const logMat = new THREE.MeshStandardMaterial({ color: 0x5a2d0c, roughness: 0.8 });
    const log = new THREE.Mesh(logGeo, logMat);
    log.rotation.z = Math.PI / 2;
    log.position.set(-0.3, -1.2, 0);
    strikerGroup.add(log);

    // 撞木紅綢彩帶
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.15), new THREE.MeshBasicMaterial({ color: 0xd93838 }));
    ribbon.position.set(-0.3, -1.4, 0);
    strikerGroup.add(ribbon);

    towerGroup.add(strikerGroup);
    this.bellStrikerMesh = strikerGroup;

    // 點擊判定區
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(4.2, 5.5, 4.2), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 2.75, 0);
    towerGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "bellTower",
      tooltip: "🔔 東天鐘樓 • 叩撞金鐘祈福 (按 [E] 亦可)"
    };

    this.scene.add(towerGroup);
  }

  // 15. 西側前埕：暮鼓雷音樓 (X: -9.5, Z: 30.0)
  buildDrumTower() {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-9.5, 0, 30.0);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a423e, roughness: 0.7 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c1a1a, roughness: 0.5 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x243d34, roughness: 0.45 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7, roughness: 0.3 });
    const drumSkinMat = new THREE.MeshStandardMaterial({ color: 0xded2b8, roughness: 0.85 });

    // 1. 基座石階
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 4.2), stoneMat);
    base.position.y = 0.35;
    base.receiveShadow = true;
    towerGroup.add(base);

    // 2. 四根朱紅大柱
    const pillarPositions = [
      [-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]
    ];
    pillarPositions.forEach(([px, pz]) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.6, 12), woodMat);
      p.position.set(px, 2.5, pz);
      p.castShadow = true;
      towerGroup.add(p);
    });

    // 3. 飛簷屋頂
    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.2, 4), tileMat);
    roof1.position.y = 4.6;
    roof1.rotation.y = Math.PI / 4;
    towerGroup.add(roof1);

    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(2.6, 0.9, 4), tileMat);
    roof2.position.y = 5.4;
    roof2.rotation.y = Math.PI / 4;
    towerGroup.add(roof2);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), goldMat);
    finial.position.y = 6.0;
    towerGroup.add(finial);

    // 4. 雷音大天鼓 (Grand Temple Drum)
    const drumGroup = new THREE.Group();
    drumGroup.position.set(0, 2.5, 0);

    const bodyGeo = new THREE.CylinderGeometry(0.9, 0.9, 1.3, 24);
    const drumBody = new THREE.Mesh(bodyGeo, woodMat);
    drumBody.rotation.z = Math.PI / 2;
    drumBody.castShadow = true;
    drumGroup.add(drumBody);

    const skinGeo = new THREE.CircleGeometry(0.88, 24);
    const skinLeft = new THREE.Mesh(skinGeo, drumSkinMat);
    skinLeft.rotation.y = -Math.PI / 2;
    skinLeft.position.x = -0.655;
    drumGroup.add(skinLeft);

    const skinRight = new THREE.Mesh(skinGeo, drumSkinMat);
    skinRight.rotation.y = Math.PI / 2;
    skinRight.position.x = 0.655;
    drumGroup.add(skinRight);

    const rimL = new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.04, 8, 24), goldMat);
    rimL.rotation.y = Math.PI / 2;
    rimL.position.x = -0.64;
    drumGroup.add(rimL);

    const rimR = new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.04, 8, 24), goldMat);
    rimR.rotation.y = Math.PI / 2;
    rimR.position.x = 0.64;
    drumGroup.add(rimR);

    // 鼓架 (四足雕花木架)
    const standMat = new THREE.MeshStandardMaterial({ color: 0x3d1708, roughness: 0.7 });
    for (let sx of [-0.4, 0.4]) {
      for (let sz of [-0.6, 0.6]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 8), standMat);
        leg.position.set(sx, -0.9, sz);
        drumGroup.add(leg);
      }
    }

    towerGroup.add(drumGroup);

    // 5. 紅纓鼓槌
    const stickGroup = new THREE.Group();
    stickGroup.position.set(0.9, 2.5, 0.4);

    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.75, 8), woodMat);
    stick.rotation.x = Math.PI / 4;
    stickGroup.add(stick);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xd93838 }));
    head.position.set(0, 0.25, -0.25);
    stickGroup.add(head);

    towerGroup.add(stickGroup);
    this.drumstickMesh = stickGroup;

    // 點擊判定區
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(4.2, 5.5, 4.2), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 2.75, 0);
    towerGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "drumTower",
      tooltip: "🥁 西暮鼓樓 • 擊響雷鼓祈福 (按 [E] 亦可)"
    };

    this.scene.add(towerGroup);
  }

  // 16. 迎神遶境八抬神轎與儀仗隊伍 (中央神道起點)
  buildPalanquinProcession() {
    this.palanquinGroup = new THREE.Group();
    // 平時停在御道東側，不擋大殿入口的視線；遶境時才移到中央御道
    this.palanquinGroup.position.set(PALANQUIN_REST_X, 0.8, PALANQUIN_REST_Z);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5c542, metalness: 0.8, roughness: 0.25 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0x991f1f, roughness: 0.45 });
    const yellowSilkMat = new THREE.MeshStandardMaterial({ color: 0xf5cf3d, roughness: 0.55 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a180d, roughness: 0.7 });

    // 1. 兩條超長金龍雕花抬轎大桿 (長 4.8m)
    for (let x of [-0.65, 0.65]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 4.8, 12), redMat);
      pole.rotation.x = Math.PI / 2;
      this.palanquinGroup.add(pole);

      // 前後金龍首飾
      for (let z of [-2.4, 2.4]) {
        const dragonHead = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.25, 8), goldMat);
        dragonHead.rotation.x = z > 0 ? Math.PI / 2 : -Math.PI / 2;
        dragonHead.position.set(x, 0, z);
        this.palanquinGroup.add(dragonHead);
      }
    }

    // 2. 八抬轎廂 (Palanquin Cabin)
    const cabin = new THREE.Group();
    cabin.position.set(0, 0.2, 0);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 1.1), woodMat);
    cabin.add(floor);

    for (let cx of [-0.48, 0.48]) {
      for (let cz of [-0.48, 0.48]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8), goldMat);
        col.position.set(cx, 0.55, cz);
        cabin.add(col);
      }
    }

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.55, 4), yellowSilkMat);
    roof.position.y = 1.35;
    roof.rotation.y = Math.PI / 4;
    cabin.add(roof);

    for (let rx of [-0.6, 0.6]) {
      for (let rz of [-0.6, 0.6]) {
        const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.25, 6), new THREE.MeshBasicMaterial({ color: 0xd93838 }));
        tassel.position.set(rx, 1.1, rz);
        cabin.add(tassel);
      }
    }

    const statue = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.65, 12), goldMat);
    statue.position.set(0, 0.38, 0);
    cabin.add(statue);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 8, 20), new THREE.MeshBasicMaterial({ color: 0xffe885 }));
    halo.position.set(0, 0.65, -0.05);
    cabin.add(halo);

    this.palanquinGroup.add(cabin);

    // 3. 轎前旋轉黃羅涼傘 (Imperial Sun Canopy)
    this.liangsanMesh = new THREE.Group();
    this.liangsanMesh.position.set(0, 0, 2.2);

    const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8), woodMat);
    umbrellaPole.position.y = 1.1;
    this.liangsanMesh.add(umbrellaPole);

    const umbrellaTop = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.55, 0.35, 16), yellowSilkMat);
    umbrellaTop.position.y = 1.95;
    this.liangsanMesh.add(umbrellaTop);

    const umbrellaRoof = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.25, 16), goldMat);
    umbrellaRoof.position.y = 2.2;
    this.liangsanMesh.add(umbrellaRoof);

    this.palanquinGroup.add(this.liangsanMesh);

    // 點擊判定區
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 5.0), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 1.2, 0);
    this.palanquinGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "palanquin",
      tooltip: "🏮 神明聖駕 • 恭敬鑽轎腳 / 隨香護駕 (按 [E] 亦可)"
    };

    this.scene.add(this.palanquinGroup);
  }

  // 大殿千佛光明燈塔 (Twin 3D Lantern Pagodas)
  buildLanternPagodas() {
    this.lanternPagodaTiers = [];
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7, roughness: 0.3 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffb84d });

    const pagodaPositions = [
      [-3.6, -0.6], [3.6, -0.6]
    ];

    pagodaPositions.forEach(([px, pz]) => {
      const pagodaGroup = new THREE.Group();
      pagodaGroup.position.set(px, 0, pz);

      for (let tier = 0; tier < 5; tier++) {
        const y = 0.4 + tier * 0.65;
        const radius = 0.65 - tier * 0.08;

        const eave = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius, 0.08, 6), goldMat);
        eave.position.y = y + 0.3;
        pagodaGroup.add(eave);

        for (let j = 0; j < 6; j++) {
          const angle = (j / 6) * Math.PI * 2;
          const lx = Math.cos(angle) * (radius * 0.75);
          const lz = Math.sin(angle) * (radius * 0.75);

          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), lampGlowMat);
          lamp.position.set(lx, y + 0.12, lz);
          pagodaGroup.add(lamp);
          this.lanternPagodaTiers.push(lamp);
        }
      }

      const topJewel = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffe885 }));
      topJewel.position.y = 3.8;
      pagodaGroup.add(topJewel);

      this.scene.add(pagodaGroup);
    });
  }

  // 叩撞金鐘動作與特效
  strikeBell() {
    if (this.isBellStriking) return;
    this.isBellStriking = true;
    window.emitRitual?.("bell");

    if (window.templeAudio) window.templeAudio.playTempleBellStrike();

    if (this.bellStrikerMesh) {
      let swingProgress = 0;
      const initialRotZ = this.bellStrikerMesh.rotation.z;
      const swingInterval = setInterval(() => {
        swingProgress += 0.12;
        if (swingProgress < Math.PI) {
          this.bellStrikerMesh.rotation.z = initialRotZ + Math.sin(swingProgress) * 0.45;
        } else {
          this.bellStrikerMesh.rotation.z = initialRotZ;
          clearInterval(swingInterval);
          this.isBellStriking = false;
        }
      }, 25);
    } else {
      setTimeout(() => { this.isBellStriking = false; }, 800);
    }

    const waveGeo = new THREE.RingGeometry(0.3, 0.45, 24);
    const waveMat = new THREE.MeshBasicMaterial({ color: 0xffe885, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const wave = new THREE.Mesh(waveGeo, waveMat);
    wave.rotation.x = Math.PI / 2;
    wave.position.set(9.5, 2.0, 30.0);
    this.scene.add(wave);
    this.pondRipples.push({ mesh: wave, birth: performance.now(), duration: 2500 });

    this.spawn3DFloatingText("🔔 晨鐘震響 • 萬籟俱寂，梵音廣被！", new THREE.Vector3(9.5, 3.8, 30.0));
    if (window.addMerit) window.addMerit(108);
    if (window.setDockStatus) window.setDockStatus("🔔 東鐘樓大梵金鐘鳴響！萬籟俱寂，煩惱全消，增長無量功德 +108！");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🔔 叩撞東天鐘樓大梵金鐘：願此鐘聲超法界，鐵圍幽暗悉皆聞！");
    this.avatar?.triggerAction("bow");
  }

  // 擊響雷鼓動作與特效
  beatDrum() {
    if (this.isDrumBeating) return;
    this.isDrumBeating = true;
    window.emitRitual?.("drum");

    if (window.templeAudio) window.templeAudio.playTempleDrumStrike();

    if (this.drumstickMesh) {
      let beatProgress = 0;
      const initialRotX = this.drumstickMesh.rotation.x;
      const beatInterval = setInterval(() => {
        beatProgress += 0.14;
        if (beatProgress < Math.PI) {
          this.drumstickMesh.rotation.x = initialRotX - Math.sin(beatProgress) * 0.4;
        } else {
          this.drumstickMesh.rotation.x = initialRotX;
          clearInterval(beatInterval);
          this.isDrumBeating = false;
        }
      }, 25);
    } else {
      setTimeout(() => { this.isDrumBeating = false; }, 600);
    }

    const waveGeo = new THREE.RingGeometry(0.4, 0.6, 24);
    const waveMat = new THREE.MeshBasicMaterial({ color: 0xff5533, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const wave = new THREE.Mesh(waveGeo, waveMat);
    wave.rotation.x = Math.PI / 2;
    wave.position.set(-9.5, 2.0, 30.0);
    this.scene.add(wave);
    this.pondRipples.push({ mesh: wave, birth: performance.now(), duration: 2200 });

    this.spawn3DFloatingText("🥁 暮鼓雷音 • 警世破迷，慧光通明！", new THREE.Vector3(-9.5, 3.8, 30.0));
    if (window.addMerit) window.addMerit(108);
    if (window.setDockStatus) window.setDockStatus("🥁 西鼓樓雷音法鼓震響！破迷啟悟，正氣充盈，增長無量功德 +108！");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🥁 擊響西暮鼓樓法雨雷音鼓：如雷警世，破除三障，福慧雙圓！");
    this.avatar?.triggerAction("bow");
  }

  // 迎神遶境巡禮啟動
  startParade() {
    if (this.isParading) {
      if (window.setDockStatus) window.setDockStatus("🏮 迎神遶境巡禮正在盛大進行中！可隨香同行護駕。");
      return;
    }
    this.isParading = true;
    this.paradeZ = PALANQUIN_REST_Z;
    this.paradeDirection = 1;
    this.hasKneeledUnderPalanquin = false;

    if (window.templeAudio) window.templeAudio.playParadeMusic();
    this.spawn3DFloatingText("🏮 聖駕起駕 • 迎神遶境大吉！", new THREE.Vector3(0, 3.2, PALANQUIN_REST_Z));

    if (window.setDockStatus) window.setDockStatus("🏮 神明聖駕起駕！八抬大轎出巡，鑼鼓齊鳴、鞭炮喧天！信眾可隨香祈福！");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🏮 恭迎神明聖駕出巡遶境！風調雨順，國泰民安，四時吉祥！");

    this.setCameraView("parade");
  }

  spawnFirecrackerParticle() {
    if (!this.palanquinGroup) return;
    const x = (Math.random() > 0.5 ? 1 : -1) * (1.6 + Math.random() * 1.6);
    const z = this.palanquinGroup.position.z + (Math.random() - 0.5) * 3.0;

    const sparkGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 6, 6);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.3 ? 0xffea00 : 0xff3300,
      transparent: true,
      opacity: 0.95
    });
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.set(x, 0.15 + Math.random() * 0.4, z);
    this.scene.add(spark);

    this.firecrackerParticles.push({
      mesh: spark,
      vx: (Math.random() - 0.5) * 0.04,
      vy: 0.03 + Math.random() * 0.05,
      vz: (Math.random() - 0.5) * 0.04,
      life: 0,
      maxLife: 35 + Math.random() * 20
    });
  }

  kneelUnderPalanquin() {
    if (this.hasKneeledUnderPalanquin) return;
    this.hasKneeledUnderPalanquin = true;
    setTimeout(() => { this.hasKneeledUnderPalanquin = false; }, 8000);

    this.avatar?.triggerAction("kneel");
    if (window.templeAudio) window.templeAudio.playBell(792);

    const jiaoZ = this.palanquinGroup ? this.palanquinGroup.position.z : 12.0;
    this.spawn3DFloatingText("✨ 聖駕過頂 • 鑽轎腳大吉！消災延壽", new THREE.Vector3(0, 2.2, jiaoZ));
    if (window.addMerit) window.addMerit(168);
    if (window.setDockStatus) window.setDockStatus("✨ 善信恭迎聖駕鑽轎腳！神威從頂門加持，消災解厄，賜福延壽，功德 +168！");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("✨ 誠心伏地鑽轎腳！蒙神聖過頂加持，逢凶化吉、百病皆消！");
  }

  igniteLanternOnPagoda(name = "善信") {
    if (this.lanternPagodaTiers.length === 0) return;
    const targetLamp = this.lanternPagodaTiers[Math.floor(Math.random() * this.lanternPagodaTiers.length)];
    if (targetLamp) {
      const worldPos = new THREE.Vector3();
      targetLamp.getWorldPosition(worldPos);

      this.spawn3DFloatingText(`🏮 ${name} 長明祈福`, worldPos.clone().add(new THREE.Vector3(0, 0.4, 0)));
      if (window.templeAudio) window.templeAudio.playBell(720);
    }
  }

  // ==========================================
  // 天候與季節氛圍系統 (Seasonal Weather Atmosphere)
  // ==========================================
  setWeather(weatherType) {
    this.currentWeather = weatherType;

    // 清除既有天候物件
    while (this.weatherGroup.children.length > 0) {
      const obj = this.weatherGroup.children[0];
      this.weatherGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
    this.weatherPoints = null;
    this.weatherVels = null;
    this.blossomSeeds = null;
    this.groundRipples = [];

    if (weatherType === "rain") {
      if (window.templeAudio) window.templeAudio.startRainSound();

      // 900 顆清透雨絲粒子
      const count = 900;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const vels = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 44; // X 跨度
        pos[i * 3 + 1] = Math.random() * 24 + 0.5; // Y 高度
        pos[i * 3 + 2] = Math.random() * 52 - 6; // Z 跨度
        vels[i] = 0.42 + Math.random() * 0.28;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x90caf9,
        size: 0.16,
        transparent: true,
        opacity: 0.75
      });
      const points = new THREE.Points(geo, mat);
      this.weatherGroup.add(points);
      this.weatherPoints = points;
      this.weatherVels = vels;

      this.spawn3DFloatingText("🌧️ 梵天甘霖 • 潤澤十方", new THREE.Vector3(0, 3.5, 8.0));
      if (window.setDockStatus) window.setDockStatus("🌧️ 梵天甘霖微雨飄落，滌淨廟埕青石塵埃，潤澤十方信眾。");
    } else if (weatherType === "blossoms") {
      if (window.templeAudio) window.templeAudio.stopRainSound();

      // 320 瓣春桃落瓣
      const count = 320;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const seeds = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 44;
        pos[i * 3 + 1] = Math.random() * 18 + 0.5;
        pos[i * 3 + 2] = Math.random() * 52 - 6;
        seeds[i] = Math.random() * 100;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xff80ab,
        size: 0.26,
        transparent: true,
        opacity: 0.85
      });
      const points = new THREE.Points(geo, mat);
      this.weatherGroup.add(points);
      this.weatherPoints = points;
      this.blossomSeeds = seeds;

      this.spawn3DFloatingText("🌸 春桃芳菲 • 祥光普照", new THREE.Vector3(0, 3.5, 8.0));
      if (window.setDockStatus) window.setDockStatus("🌸 桃花花瓣隨微風輕舞廟埕長廊，春滿人間，吉慶祥瑞。");
    } else {
      // clear 晴空
      if (window.templeAudio) window.templeAudio.stopRainSound();
      this.spawn3DFloatingText("☀️ 天朗氣清 • 晴空萬里", new THREE.Vector3(0, 3.5, 8.0));
      if (window.setDockStatus) window.setDockStatus("☀️ 晴空碧藍，宮闕巍峨，陽光普照神威顯赫。");
    }
    this.applyParticleBudget();
  }

  // 地面雨滴漣漪生成
  spawnGroundRipple(x, z) {
    const geo = new THREE.RingGeometry(0.04, 0.09, 16);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xbbdefb,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.02, z);
    this.weatherGroup.add(mesh);
    this.groundRipples.push({ mesh, mat, life: 1.0 });
  }

  // ==========================================
  // 線上收驚除煞科儀 (Virtual Shoujing Ceremony)
  // ==========================================
  startShoujingEffect(petitionerName = "善信", reasonLabel = "心神不寧") {
    if (this.avatar) {
      this.avatar.triggerAction("pray");
    }
    if (window.templeAudio) {
      window.templeAudio.playShoujingChime();
    }

    const pos = this.avatar ? this.avatar.position.clone() : new THREE.Vector3(0, 0, 4.0);

    this.spawn3DFloatingText("🪔 敬稟仙真 • 前三後四淨香掃煞", pos.clone().add(new THREE.Vector3(0, 2.5, 0)));
    if (window.setDockStatus) window.setDockStatus(`🪔 正在為【${petitionerName}】進行收驚解厄科儀（事由：${reasonLabel}）...`);

    // 階段 1：掃煞（生成 24 顆環繞黑灰色陰煞濁氣，被金香驅散）
    const purgeCount = 24;
    for (let i = 0; i < purgeCount; i++) {
      const pGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const pMat = new THREE.MeshBasicMaterial({
        color: 0x37474f,
        transparent: true,
        opacity: 0.8
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      const angle = (i / purgeCount) * Math.PI * 2;
      pMesh.position.set(pos.x + Math.cos(angle) * 0.7, pos.y + 0.3 + (i % 5) * 0.25, pos.z + Math.sin(angle) * 0.7);
      this.scene.add(pMesh);
      this.shoujingPurgeParticles.push({
        mesh: pMesh,
        mat: pMat,
        vx: Math.cos(angle) * 0.02,
        vy: 0.025 + Math.random() * 0.02,
        vz: Math.sin(angle) * 0.02,
        life: 1.0
      });
    }

    // 階段 2：金光神咒降臨加持天柱 (1.0 秒後)
    setTimeout(() => {
      const beamGeo = new THREE.CylinderGeometry(0.85, 0.95, 16, 24, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xffd54f,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(pos.x, 8.0, pos.z);
      this.scene.add(beam);
      this.shoujingLightBeam = { mesh: beam, mat: beamMat, life: 1.0 };

      this.spawn3DFloatingText("✨ 金光覆照 • 魂魄歸位", pos.clone().add(new THREE.Vector3(0, 3.2, 0)));
      if (window.templeAudio) window.templeAudio.playBell(528);
    }, 1000);

    // 階段 3：科儀圓滿 (2.6 秒後)
    setTimeout(() => {
      this.spawn3DFloatingText("🌟 魂魄安泰 • 災厄不侵 (+120功德)", pos.clone().add(new THREE.Vector3(0, 3.6, 0)));
      if (window.setDockStatus) window.setDockStatus(`🌟 【${petitionerName}】收驚科儀圓滿！三魂七魄歸位，獲金光庇佑 (+120 功德)。`);
      if (window.liveTempleWall) window.liveTempleWall.addDanmaku(`🪔 賀【${petitionerName}】收驚科儀圓滿！神魂安泰，災厄消散！`);
      if (window.addMerit) window.addMerit(120);
    }, 2600);
  }

  buildHangingLanterns() {
    [
      [-2.6, 3.5, -0.5],
      [2.6, 3.5, -0.5],
      [-2.6, 3.5, 1.8],
      [2.6, 3.5, 1.8]
    ].forEach(([x, y, z], idx) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);

      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2), new THREE.MeshBasicMaterial({ color: 0x9e782f }));
      rope.position.y = 0.6;
      group.add(rope);

      const bodyGeo = new THREE.SphereGeometry(0.32, 16, 16);
      bodyGeo.scale(1, 1.3, 1);
      const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xcc2222, emissive: 0x771111, roughness: 0.4 }));
      group.add(body);

      // 宮燈點光源
      const lanternLight = new THREE.PointLight(0xff7722, 1.2, 4.5);
      lanternLight.position.set(0, 0, 0);
      group.add(lanternLight);
      this.lanternLights.push(lanternLight);

      const capGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16);
      const capMat = new THREE.MeshStandardMaterial({ color: 0xf5c542, metalness: 0.8 });
      const capTop = new THREE.Mesh(capGeo, capMat);
      capTop.position.y = 0.42;
      group.add(capTop);

      const capBottom = new THREE.Mesh(capGeo, capMat);
      capBottom.position.y = -0.42;
      group.add(capBottom);

      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.35, 8), capMat);
      tassel.position.y = -0.62;
      group.add(tassel);

      this.scene.add(group);
      this.lanterns.push({ group, offset: idx * 0.8 });
    });
  }

  buildAltarAndDeity() {
    const altarGroup = new THREE.Group();
    altarGroup.position.set(0, 0, -0.6);

    const tableTopGeo = new THREE.BoxGeometry(4.2, 0.2, 1.6);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x42150e, roughness: 0.3, metalness: 0.15 });
    const tableTop = new THREE.Mesh(tableTopGeo, tableMat);
    tableTop.position.y = 1.25;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    altarGroup.add(tableTop);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.75, 1.5), new THREE.MeshStandardMaterial({ color: 0x821a1a, roughness: 0.5 }));
    skirt.position.y = 0.78;
    altarGroup.add(skirt);

    const legGeo = new THREE.BoxGeometry(0.2, 1.2, 0.2);
    [[-1.9, -0.65], [1.9, -0.65], [-1.9, 0.65], [1.9, 0.65]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, tableMat);
      leg.position.set(lx, 0.6, lz);
      leg.castShadow = true;
      altarGroup.add(leg);
    });

    this.scene.add(altarGroup);
    this.buildDeityThrone();
  }

  buildDeityThrone() {
    this.throneGroup = new THREE.Group();
    this.throneGroup.position.set(0, 1.8, -2.4);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfad050, metalness: 0.85, roughness: 0.2 });
    this.deityStatue = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 1.6, 24), goldMat);
    this.deityStatue.position.y = 0.8;
    this.deityStatue.castShadow = true;
    this.throneGroup.add(this.deityStatue);

    this.deityHead = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 24), goldMat);
    this.deityHead.position.y = 1.95;
    this.throneGroup.add(this.deityHead);

    const haloGeo = new THREE.TorusGeometry(0.85, 0.05, 16, 48);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffea88 });
    this.deityHalo = new THREE.Mesh(haloGeo, haloMat);
    this.deityHalo.position.set(0, 2.0, -0.15);
    this.throneGroup.add(this.deityHalo);

    this.scene.add(this.throneGroup);
    this.switchDeityStatue("mazu");
  }

  // 神尊專屬法相切換 (媽祖/文昌/財神/月老/綠色乖乖)
  switchDeityStatue(deityKey) {
    if (!this.throneGroup) return;

    // 清除專屬飾品
    this.deityAccessories.forEach(obj => this.throneGroup.remove(obj));
    this.deityAccessories = [];

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfad050, metalness: 0.85, roughness: 0.2 });

    if (deityKey === "guaiguai") {
      // 科技守護神：正殿中央化身為巨型發光「綠色乖乖袋」雕像！
      this.deityStatue.visible = false;
      this.deityHead.visible = false;

      const packGeo = new THREE.BoxGeometry(1.1, 1.6, 0.45);
      const packMat = new THREE.MeshStandardMaterial({
        color: 0x1faa38,
        emissive: 0x0a4414,
        roughness: 0.35
      });
      const giantPack = new THREE.Mesh(packGeo, packMat);
      giantPack.position.y = 1.2;
      giantPack.rotation.y = 0.08;
      this.throneGroup.add(giantPack);
      this.deityAccessories.push(giantPack);

      // 綠色蓮花底座
      const lotusBase = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7 }));
      lotusBase.position.y = 0.15;
      this.throneGroup.add(lotusBase);
      this.deityAccessories.push(lotusBase);

      this.deityHalo.material.color.setHex(0x55ff77);
    } else {
      this.deityStatue.visible = true;
      this.deityHead.visible = true;
      this.deityHalo.material.color.setHex(0xffea88);

      if (deityKey === "caishen") {
        // 武財神：手捧碩大發光金元寶
        const yuanbaoGeo = new THREE.SphereGeometry(0.28, 16, 16);
        yuanbaoGeo.scale(1.4, 0.7, 0.9);
        const yuanbao = new THREE.Mesh(yuanbaoGeo, new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 }));
        yuanbao.position.set(0, 1.15, 0.65);
        this.throneGroup.add(yuanbao);
        this.deityAccessories.push(yuanbao);
      } else if (deityKey === "wenchang") {
        // 文昌帝君：手執文昌如意玉筆
        const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x221111 }));
        brush.position.set(0.45, 1.2, 0.5);
        brush.rotation.z = -0.4;
        this.throneGroup.add(brush);
        this.deityAccessories.push(brush);
      } else if (deityKey === "yuelao") {
        // 月下老人：胸前紅繡球與良緣紅線繩
        const knot = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 8, 16), new THREE.MeshStandardMaterial({ color: 0xdd1111, emissive: 0x550000 }));
        knot.position.set(0, 1.1, 0.55);
        this.throneGroup.add(knot);
        this.deityAccessories.push(knot);
      } else {
        // 媽祖：頂戴九旒冕珠簾
        const crown = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.15, 0.5), goldMat);
        crown.position.set(0, 2.35, 0);
        this.throneGroup.add(crown);
        this.deityAccessories.push(crown);
      }
    }
  }

  buildCenser() {
    this.censerGroup = new THREE.Group();
    this.censerGroup.position.set(0, 1.35, -0.3);
    this.censerGroup.name = "censer";

    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xaa7a28, metalness: 0.8, roughness: 0.3 });
    const potGeo = new THREE.SphereGeometry(0.36, 24, 16);
    potGeo.scale(1, 0.65, 1);
    const pot = new THREE.Mesh(potGeo, bronzeMat);
    pot.position.y = 0.22;
    pot.castShadow = true;
    this.censerGroup.add(pot);

    const earGeo = new THREE.TorusGeometry(0.08, 0.025, 8, 16);
    const earL = new THREE.Mesh(earGeo, bronzeMat);
    earL.position.set(-0.36, 0.26, 0);
    earL.rotation.y = Math.PI / 2;
    this.censerGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, bronzeMat);
    earR.position.set(0.36, 0.26, 0);
    earR.rotation.y = Math.PI / 2;
    this.censerGroup.add(earR);

    [[0, -0.22], [-0.18, 0.12], [0.18, 0.12]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.12, 12), bronzeMat);
      leg.position.set(lx, 0.06, lz);
      this.censerGroup.add(leg);
    });

    const ash = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), new THREE.MeshStandardMaterial({ color: 0x999088, roughness: 0.9 }));
    ash.rotation.x = -Math.PI / 2;
    ash.position.y = 0.35;
    this.censerGroup.add(ash);

    const stickMat = new THREE.MeshStandardMaterial({ color: 0x8b2500, roughness: 0.6 });
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });

    this.incenseSticks = [];
    [-0.07, 0, 0.07].forEach((sx, idx) => {
      const stickGroup = new THREE.Group();
      stickGroup.position.set(sx, 0.35, 0);
      stickGroup.rotation.z = (idx - 1) * 0.05;

      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.65, 8), stickMat);
      stick.position.y = 0.325;
      stickGroup.add(stick);

      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), emberMat);
      ember.position.y = 0.65;
      ember.visible = false;
      stickGroup.add(ember);

      this.censerGroup.add(stickGroup);
      this.incenseSticks.push({ group: stickGroup, ember });
    });

    this.interactiveObjects.push(pot);
    pot.userData = { type: "censer", tooltip: "🔥 點擊香爐 或 走近按 [E]：插香祈願" };

    this.scene.add(this.censerGroup);
  }

  buildBwaBwei() {
    this.bwaBlocks = [];
    const bwaMatRound = new THREE.MeshStandardMaterial({ color: 0xe03838, roughness: 0.35, metalness: 0.1 });

    for (let i = 0; i < 2; i++) {
      const bwaGroup = new THREE.Group();
      bwaGroup.name = `bwa_${i}`;

      const shape = new THREE.Shape();
      shape.moveTo(-0.16, -0.32);
      shape.quadraticCurveTo(-0.25, 0, -0.16, 0.32);
      shape.quadraticCurveTo(0.12, 0, -0.16, -0.32);

      const extrudeSettings = { depth: 0.1, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.04, bevelThickness: 0.05 };
      const bwaGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      bwaGeo.center();

      const bwaMesh = new THREE.Mesh(bwaGeo, bwaMatRound);
      bwaMesh.rotation.x = Math.PI / 2;
      bwaMesh.castShadow = true;
      bwaGroup.add(bwaMesh);

      const initialX = (i === 0 ? -0.32 : 0.32);
      bwaGroup.position.set(initialX, 0.08, 1.8);
      bwaGroup.rotation.y = (i === 0 ? 0.3 : -0.3);

      this.scene.add(bwaGroup);
      this.bwaBlocks.push(bwaGroup);

      this.interactiveObjects.push(bwaMesh);
      bwaMesh.userData = { type: "bwa", tooltip: "🌓 點擊筊杯 或 走近按 [E]：誠心擲筊請示" };
    }
  }

  buildChiamBucket() {
    this.chiamBucket = new THREE.Group();
    this.chiamBucket.position.set(1.4, 1.35, -0.3);
    this.chiamBucket.name = "chiamBucket";

    const bucketMat = new THREE.MeshStandardMaterial({ color: 0x6e2510, roughness: 0.4 });
    const bucketMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.55, 18, 1, true), bucketMat);
    bucketMesh.position.y = 0.275;
    bucketMesh.castShadow = true;
    this.chiamBucket.add(bucketMesh);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7 });
    const hoop1 = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.012, 8, 24), goldMat);
    hoop1.position.y = 0.15;
    hoop1.rotation.x = Math.PI / 2;
    this.chiamBucket.add(hoop1);

    const hoop2 = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.012, 8, 24), goldMat);
    hoop2.position.y = 0.45;
    hoop2.rotation.x = Math.PI / 2;
    this.chiamBucket.add(hoop2);

    this.chiamSticks = [];
    const stickMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.5 });
    const stickRedMat = new THREE.MeshStandardMaterial({ color: 0xaa2020 });

    for (let i = 0; i < 28; i++) {
      const sGroup = new THREE.Group();
      const angle = (i / 28) * Math.PI * 2;
      const radius = 0.04 + Math.random() * 0.08;
      sGroup.position.set(Math.cos(angle) * radius, 0.28, Math.sin(angle) * radius);
      sGroup.rotation.z = (Math.random() - 0.5) * 0.12;

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.5, 6), stickMat);
      body.position.y = 0.25;
      sGroup.add(body);

      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.08, 6), stickRedMat);
      tip.position.y = 0.48;
      sGroup.add(tip);

      this.chiamBucket.add(sGroup);
      this.chiamSticks.push(sGroup);
    }

    this.interactiveObjects.push(bucketMesh);
    bucketMesh.userData = { type: "chiam", tooltip: "🎋 點擊籤筒 或 走近按 [E]：虔心搖筒求籤" };

    this.scene.add(this.chiamBucket);
  }

  buildMuyu() {
    this.muyuGroup = new THREE.Group();
    this.muyuGroup.position.set(-1.4, 1.35, -0.3);
    this.muyuGroup.name = "muyu";

    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x992020, roughness: 0.7 });
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.08, 16), cushionMat);
    cushion.position.y = 0.04;
    this.muyuGroup.add(cushion);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a2d12, roughness: 0.35, metalness: 0.1 });
    const bodyGeo = new THREE.SphereGeometry(0.18, 18, 16);
    bodyGeo.scale(1.2, 0.85, 1);
    const muyuMesh = new THREE.Mesh(bodyGeo, woodMat);
    muyuMesh.position.y = 0.18;
    muyuMesh.castShadow = true;
    this.muyuGroup.add(muyuMesh);

    this.mallet = new THREE.Group();
    this.mallet.position.set(-0.15, 0.32, 0.18);
    this.mallet.rotation.z = -0.4;

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 8), new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.6 }));
    handle.position.y = 0.19;
    this.mallet.add(handle);

    const malletHead = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), cushionMat);
    malletHead.position.y = 0.38;
    this.mallet.add(malletHead);

    this.muyuGroup.add(this.mallet);

    this.interactiveObjects.push(muyuMesh);
    muyuMesh.userData = { type: "muyu", tooltip: "🪵 點擊木魚 或 走近按 [E]：功德+1 (按空白鍵亦可)" };

    this.scene.add(this.muyuGroup);
  }

  buildOfferings() {
    this.offeringsGroup = new THREE.Group();
    this.offeringsGroup.position.set(0, 1.35, 0.1);
    this.scene.add(this.offeringsGroup);

    // 讀取本地儲存或預設五大經典御賜供品
    const savedDishes = JSON.parse(localStorage.getItem("temple_feast_dishes") || '["fruit", "peach", "fagao", "redturtle", "guaiguai"]');
    this.updateAltarFeastOfferings(savedDishes);
  }

  // 更新神案上的五大供品 3D 模型
  updateAltarFeastOfferings(dishTypes = ["fruit", "peach", "fagao", "redturtle", "guaiguai"]) {
    if (!this.offeringsGroup) return;

    // 清除舊供品物件
    while (this.offeringsGroup.children.length > 0) {
      const child = this.offeringsGroup.children[0];
      this.offeringsGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    const goldPlateMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.85, roughness: 0.2 });
    const redPlateMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });

    const slotXs = [-1.05, -0.52, 0, 0.52, 1.05];

    dishTypes.forEach((type, idx) => {
      const posX = slotXs[idx] !== undefined ? slotXs[idx] : (idx - 2) * 0.5;
      const dishGroup = new THREE.Group();
      dishGroup.position.set(posX, 0, 0);

      // 金紋底盤
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.025, 20), goldPlateMat);
      plate.position.y = 0.012;
      dishGroup.add(plate);

      if (type === "fruit") {
        // 🍎 五福平安果盤
        const fruitMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25 });
        const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
        [[-0.05, 0.04, -0.04], [0.05, 0.04, -0.04], [0, 0.04, 0.05]].forEach(pos => {
          const apple = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), fruitMat);
          apple.position.set(pos[0], pos[1], pos[2]);
          dishGroup.add(apple);
        });
        const orange = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), orangeMat);
        orange.position.set(0, 0.11, 0);
        dishGroup.add(orange);
      } else if (type === "peach") {
        // 🍑 長生仙桃 (王母蟠桃)
        const peachMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.3 });
        [-0.04, 0.04].forEach(px => {
          const peach = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), peachMat);
          peach.scale.set(0.9, 1.2, 0.9);
          peach.position.set(px, 0.065, 0);
          dishGroup.add(peach);
          // 綠葉
          const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 0.06), greenMat);
          leaf.position.set(px, 0.02, 0.06);
          leaf.rotation.x = 0.3;
          dishGroup.add(leaf);
        });
      } else if (type === "fagao") {
        // 🍞 富貴發糕 (開花發糕)
        const cakeMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.07, 14), cakeMat);
        base.position.y = 0.045;
        dishGroup.add(base);
        // 開花頂部
        for (let b = 0; b < 4; b++) {
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), cakeMat);
          const angle = (b / 4) * Math.PI * 2;
          petal.position.set(Math.cos(angle) * 0.035, 0.085, Math.sin(angle) * 0.035);
          dishGroup.add(petal);
        }
      } else if (type === "redturtle") {
        // 🐢 祈福紅龜粿
        const turtleMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
        const cake = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), turtleMat);
        cake.scale.set(1.1, 0.45, 1.3);
        cake.position.y = 0.04;
        dishGroup.add(cake);
        // 香蕉葉墊底
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.22), greenMat);
        leaf.rotation.x = -Math.PI / 2;
        leaf.position.y = 0.024;
        dishGroup.add(leaf);
      } else if (type === "guaiguai") {
        // 🟢 金牌科技乖乖
        const bagMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4, metalness: 0.1 });
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.20, 0.07), bagMat);
        bag.position.y = 0.11;
        bag.rotation.y = 0.15;
        dishGroup.add(bag);
        // 金牌彩帶
        const goldBand = new THREE.Mesh(new THREE.BoxGeometry(0.162, 0.04, 0.072), goldPlateMat);
        goldBand.position.y = 0.11;
        goldBand.rotation.y = 0.15;
        dishGroup.add(goldBand);
      } else if (type === "milktea") {
        // 🧋 全糖特大珍珠奶茶
        const teaMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 16), teaMat);
        cup.position.y = 0.08;
        dishGroup.add(cup);
        // 吸管
        const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 8), redPlateMat);
        straw.position.set(0.015, 0.15, 0);
        straw.rotation.z = 0.15;
        dishGroup.add(straw);
      } else if (type === "chicken") {
        // 🍗 香脆現炸大雞排
        const chickenMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
        const chicken = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.11), chickenMat);
        chicken.position.y = 0.04;
        chicken.rotation.y = 0.2;
        dishGroup.add(chicken);
        // 紙袋下半部
        const bagMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.042, 0.06), bagMat);
        bag.position.set(0, 0.038, 0.03);
        bag.rotation.y = 0.2;
        dishGroup.add(bag);
      } else if (type === "flowers") {
        // 🌸 清雅素果鮮花花瓶
        const vaseMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.3, roughness: 0.2 });
        const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.12, 12), vaseMat);
        vase.position.y = 0.07;
        dishGroup.add(vase);
        // 百合與菊花花球
        const flowerMat = new THREE.MeshStandardMaterial({ color: 0xfef08a });
        for (let f = 0; f < 3; f++) {
          const fl = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), flowerMat);
          fl.position.set((f - 1) * 0.025, 0.14, 0);
          dishGroup.add(fl);
        }
      }

      this.offeringsGroup.add(dishGroup);
    });
  }

  // 呈獻大典金光神威慶典
  celebrateFeastOffering() {
    if (this.deityHalo) {
      this.deityHalo.scale.set(1.2, 1.2, 1.2);
      setTimeout(() => {
        if (this.deityHalo) this.deityHalo.scale.set(1, 1, 1);
      }, 1500);
    }
    this.spawn3DFloatingText("✨ 筵席呈獻 • 神威顯赫 • 福壽綿長！", new THREE.Vector3(0, 2.8, 0.1));
    if (window.templeAudio) {
      window.templeAudio.playFeastOffering();
    }
  }

  // 金色筊杯外觀開關
  setBwaGoldenMaterial(isGolden) {
    if (!this.bwaBlocks || this.bwaBlocks.length < 2) return;
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.2 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xe03838, roughness: 0.35, metalness: 0.1 });
    const mat = isGolden ? goldMat : redMat;
    this.bwaBlocks.forEach(bGroup => {
      bGroup.children.forEach(child => {
        if (child.material) child.material = mat;
      });
    });
  }

  setupDustParticles() {
    const particleCount = 260;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 12;
      positions[i + 1] = 0.2 + Math.random() * 5.0;
      positions[i + 2] = -2 + Math.random() * 16;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.045,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.dustPoints = new THREE.Points(geo, mat);
    this.scene.add(this.dustPoints);
  }

  // 接近觸發判斷
  triggerNearbyInteraction() {
    if (!this.avatar) return;
    const p = this.avatar.position;

    // 1. 走近天公爐 (< 2.2m, 中進中央 Z: 11.5)
    if (p.distanceTo(new THREE.Vector3(0, 0, 11.5)) < 2.2) {
      this.avatar.triggerAction("bow");
      window.templeAudio.playBell(560);
      this.spawn3DFloatingText("天公賜福 • 迎祥納吉", new THREE.Vector3(0, 2.5, 11.5));
      document.getElementById("dockStatusBar").innerText = "🔥 敬拜天公爐完成！玉皇上帝庇佑元辰光彩、平安吉祥！";
      return;
    }

    // 2. 走近東進蓮花許願池與拱橋 (< 3.2m, X: 12.5, Z: 13.5)
    if (p.distanceTo(new THREE.Vector3(12.5, 0, 13.5)) < 3.2) {
      this.tossWishingCoin();
      return;
    }

    // 3. 走近西進八角金爐閣 (< 2.8m, X: -12.5, Z: 14.5)
    if (p.distanceTo(new THREE.Vector3(-12.5, 0, 14.5)) < 2.8) {
      this.burnJossPaper();
      return;
    }

    // 4. 走近西進祈願木牌閣長廊 (< 2.6m, X: -13.5, Z: 8.5)
    if (p.distanceTo(new THREE.Vector3(-13.5, 0, 8.5)) < 2.6) {
      document.getElementById("btnOpenEma")?.click();
      return;
    }

    // 5. 走近東進文昌閣智慧殿 (< 3.2m, X: 13.5, Z: 5.5)
    if (p.distanceTo(new THREE.Vector3(13.5, 0, 5.5)) < 3.2) {
      if (window.openSideHallModal) window.openSideHallModal('wenchang');
      return;
    }

    // 6. 走近東進月老天賜良緣閣 (< 3.2m, X: 13.5, Z: 23.5)
    if (p.distanceTo(new THREE.Vector3(13.5, 0, 23.5)) < 3.2) {
      if (window.openSideHallModal) window.openSideHallModal('yuelao');
      return;
    }

    // 7. 走近西進五路財神金庫洞窟 (< 3.2m, X: -13.5, Z: 23.5)
    if (p.distanceTo(new THREE.Vector3(-13.5, 0, 23.5)) < 3.2) {
      if (window.openSideHallModal) window.openSideHallModal('caishen');
      return;
    }

    // 7.5 走近西進太歲本命元辰殿 (< 3.2m, X: -13.5, Z: 5.5)
    if (p.distanceTo(new THREE.Vector3(-13.5, 0, 5.5)) < 3.2) {
      if (window.openTaiSuiModal) window.openTaiSuiModal();
      return;
    }

    // 8. 走近巍峨山門牌樓 (< 3.8m, 外進山門 Z: 38.0)
    if (p.distanceTo(new THREE.Vector3(0, 0, 38.0)) < 3.8) {
      this.avatar.triggerAction("bow");
      if (window.templeAudio) window.templeAudio.playBell(720);
      this.spawn3DFloatingText("山門迎祥 • 滌淨塵心", new THREE.Vector3(0, 3.2, 38.0));
      document.getElementById("dockStatusBar").innerText = "⛩️ 善信踏入巍峨山門！步入清淨聖境，滌盡人間煩憂！";
      return;
    }

    // 9. 走近青石守護神獅 (< 2.6m, X: ±5.5, Z: 34.0)
    if (p.distanceTo(new THREE.Vector3(-5.5, 0, 34.0)) < 2.6 || p.distanceTo(new THREE.Vector3(5.5, 0, 34.0)) < 2.6) {
      this.avatar.triggerAction("bow");
      if (window.templeAudio) window.templeAudio.playBell(580);
      const lionX = p.x > 0 ? 5.5 : -5.5;
      this.spawn3DFloatingText("神獅鎮煞 • 迎祥納吉", new THREE.Vector3(lionX, 2.5, 34.0));
      document.getElementById("dockStatusBar").innerText = "🦁 守護青石神獅威嚴鎮守！辟邪納吉，保佑四時無災、八節有慶！";
      return;
    }

    // 10. 走近大殿香案 (< 1.6m, Z: -0.3)
    if (p.distanceTo(new THREE.Vector3(0, 0, 0)) < 1.6) {
      document.getElementById("btnLightIncense")?.click();
      return;
    }

    // 11. 走近地面筊杯 (< 1.4m, Z: 1.8)
    if (p.distanceTo(new THREE.Vector3(0, 0, 1.8)) < 1.4) {
      document.getElementById("btnThrowBwa")?.click();
      return;
    }

    // 12. 走近籤筒 (< 1.5m, X: 1.4)
    if (p.distanceTo(new THREE.Vector3(1.4, 0, 0)) < 1.5) {
      document.getElementById("btnShakeChiam")?.click();
      return;
    }

    // 13. 走近木魚 (< 1.5m, X: -1.4)
    if (p.distanceTo(new THREE.Vector3(-1.4, 0, 0)) < 1.5) {
      document.getElementById("btnKnockMuyu")?.click();
      return;
    }

    // 14. 走近東側天鐘樓 (< 3.2m, X: 9.5, Z: 30.0)
    if (p.distanceTo(new THREE.Vector3(9.5, 0, 30.0)) < 3.2) {
      this.strikeBell();
      return;
    }

    // 15. 走近西側暮鼓樓 (< 3.2m, X: -9.5, Z: 30.0)
    if (p.distanceTo(new THREE.Vector3(-9.5, 0, 30.0)) < 3.2) {
      this.beatDrum();
      return;
    }

    // 16. 走近迎神遶境八抬神轎 (< 2.8m)
    if (this.palanquinGroup && p.distanceTo(this.palanquinGroup.position) < 2.8) {
      this.kneelUnderPalanquin();
      return;
    }

    // 預設執行三鞠躬
    this.avatar.triggerAction("bow");
  }

  // 投擲金幣許願 (Wishing Coin Toss)
  tossWishingCoin() {
    if (this.isCoinTossing) return;
    this.isCoinTossing = true;
    window.emitRitual?.("coin");

    if (this.avatar) {
      this.avatar.triggerAction("pray");
    }

    // 生成金幣模型
    const coinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.015, 12);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
    const coin = new THREE.Mesh(coinGeo, coinMat);

    const startPos = this.avatar ? this.avatar.position.clone().add(new THREE.Vector3(0, 0.8, 0)) : new THREE.Vector3(10.5, 1.0, 13.5);
    const targetPos = new THREE.Vector3(12.5 + (Math.random() - 0.5) * 1.5, 0.36, 13.5 + (Math.random() - 0.5) * 2.0);

    coin.position.copy(startPos);
    this.scene.add(coin);

    const startTime = performance.now();
    const duration = 1100;

    const animateCoin = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        // 拋物線
        coin.position.lerpVectors(startPos, targetPos, progress);
        coin.position.y += Math.sin(progress * Math.PI) * 1.2;

        coin.rotation.x += 0.25;
        coin.rotation.z += 0.2;
        requestAnimationFrame(animateCoin);
      } else {
        // 落水
        this.scene.remove(coin);
        window.templeAudio.playCoinWaterSplash();

        // 水花漣漪
        this.spawnPondRipple(targetPos);
        this.spawn3DFloatingText("心想事成 • 金幣落池", targetPos.clone().add(new THREE.Vector3(0, 0.6, 0)));

        // 激起錦鯉爭食聚集
        if (this.wishingPond) {
          const localTarget = this.wishingPond.worldToLocal(targetPos.clone());
          this.feedKoiFish(localTarget);
        }

        const wishes = [
          "🪙 金幣入池！文昌帝君保佑：才思泉湧，心想事成！",
          "🪙 金幣落入蓮花池！武財神恩賜：財運大通，八方進寶！",
          "🪙 蓮花泛水！月老牽引：佳偶良緣，和睦美滿！"
        ];
        const wishMsg = wishes[Math.floor(Math.random() * wishes.length)];
        document.getElementById("dockStatusBar").innerText = wishMsg;

        this.isCoinTossing = false;
      }
    };

    requestAnimationFrame(animateCoin);
  }

  // 錦鯉投食爭游
  feedKoiFish(pondLocalPos) {
    if (!this.koiFish) return;
    this.koiFish.forEach(fish => {
      fish.targetPos = pondLocalPos.clone();
      fish.targetPos.y = fish.baseY;
    });
  }

  // 每一影格更新錦鯉游動姿態
  updateKoiFish(time, dt) {
    if (!this.koiFish || this.koiFish.length === 0) return;

    this.koiFish.forEach((fish, idx) => {
      const tailSpeed = fish.targetPos ? 15 : 7;
      fish.tailFin.rotation.y = Math.sin(time * tailSpeed + idx) * 0.38;

      if (fish.targetPos) {
        // 朝投幣水花游動
        const cur = fish.group.position;
        const dx = fish.targetPos.x - cur.x;
        const dz = fish.targetPos.z - cur.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.28) {
          const heading = Math.atan2(dx, dz);
          fish.group.rotation.y = THREE.MathUtils.lerp(fish.group.rotation.y, heading, 0.12);
          fish.group.position.x += Math.sin(heading) * dt * 1.35;
          fish.group.position.z += Math.cos(heading) * dt * 1.35;
        } else {
          // 到達聚攏點，有機會破水翻騰小跳
          if (fish.jumpProgress <= 0 && Math.random() < 0.5) {
            fish.jumpProgress = 1.0;
          }
          fish.targetPos = null;
        }
      } else {
        // 常態巡遊軌跡
        fish.angle += dt * fish.speed * 0.35;
        const curX = Math.cos(fish.angle) * fish.radiusX;
        const curZ = Math.sin(fish.angle) * fish.radiusZ;

        const nextAngle = fish.angle + 0.05;
        const nextX = Math.cos(nextAngle) * fish.radiusX;
        const nextZ = Math.sin(nextAngle) * fish.radiusZ;
        const heading = Math.atan2(nextX - curX, nextZ - curZ);

        fish.group.rotation.y = THREE.MathUtils.lerp(fish.group.rotation.y, heading, 0.08);
        fish.group.position.x = THREE.MathUtils.lerp(fish.group.position.x, curX, 0.08);
        fish.group.position.z = THREE.MathUtils.lerp(fish.group.position.z, curZ, 0.08);
      }

      // 破水小跳躍
      let jumpY = 0;
      if (fish.jumpProgress > 0) {
        fish.jumpProgress -= dt * 2.2;
        jumpY = Math.sin((1 - Math.max(0, fish.jumpProgress)) * Math.PI) * 0.26;
      }
      fish.group.position.y = fish.baseY + jumpY + Math.sin(time * 3 + idx) * 0.012;
    });
  }

  // -------------------------------------------------------------
  // 平溪賽博祈願天燈盛典 (Sky Lanterns)
  // -------------------------------------------------------------
  launchSkyLantern({ text = "萬事順遂", color = "#dc2626", petitionerName = "善信" } = {}) {
    if (!this.skyLanterns) this.skyLanterns = [];

    const lanternGroup = new THREE.Group();
    // 燈罩四角錐梯形
    const lanternGeo = new THREE.CylinderGeometry(0.28, 0.42, 0.75, 4);

    // 動態繪製祈願題詞畫布材質
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 256);

    // 仿古金邊框
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 232, 232);
    ctx.strokeRect(18, 18, 220, 220);

    // 祈願直書文字
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px 'Noto Serif TC', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const chars = (text || "平安喜樂").split("");
    const startY = 128 - (chars.length * 28) / 2;
    chars.forEach((c, idx) => {
      ctx.fillText(c, 128, startY + idx * 30);
    });

    // 善信落款與小朱印
    ctx.font = "14px serif";
    ctx.fillStyle = "#fef08a";
    ctx.fillText(`${petitionerName || "善信"} 虔祈`, 128, 218);

    const tex = new THREE.CanvasTexture(canvas);
    const lanternMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.5
    });

    const lanternMesh = new THREE.Mesh(lanternGeo, lanternMat);
    lanternMesh.position.y = 0.38;
    lanternGroup.add(lanternMesh);

    // 底座竹篾鐵圈
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.015, 6, 16), ringMat);
    ring.rotation.x = Math.PI / 2;
    lanternGroup.add(ring);

    // 內部金光燭火點光源
    const fireLight = new THREE.PointLight(0xffaa22, 1.4, 6.0);
    fireLight.position.set(0, 0.3, 0);
    lanternGroup.add(fireLight);

    // 初始位置：信眾面前或廟埕中庭
    let startPos = new THREE.Vector3(0, 1.2, 12.0);
    if (this.avatar) {
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.avatar.playerGroup.rotation.y);
      startPos = this.avatar.position.clone().add(forward.multiplyScalar(0.95)).add(new THREE.Vector3(0, 1.1, 0));
    }
    lanternGroup.position.copy(startPos);
    this.scene.add(lanternGroup);

    if (window.templeAudio) {
      window.templeAudio.playSkyLanternLaunch();
    }

    this.skyLanterns.push({
      group: lanternGroup,
      fireLight: fireLight,
      vy: 0.95 + Math.random() * 0.3,
      vx: 0.12 + (Math.random() - 0.5) * 0.15,
      vz: -0.22 + (Math.random() - 0.5) * 0.12,
      rotSpeed: (Math.random() - 0.5) * 0.015,
      life: 0,
      maxLife: 60 + Math.random() * 15
    });

    this.spawn3DFloatingText(`🏮「${text}」祈願天燈冉冉升空，福運直達天聽！`, startPos.clone().add(new THREE.Vector3(0, 0.6, 0)));
  }

  // 每一影格更新天燈漂浮上升物理
  updateSkyLanterns(time, dt) {
    if (!this.skyLanterns || this.skyLanterns.length === 0) return;

    for (let i = this.skyLanterns.length - 1; i >= 0; i--) {
      const sl = this.skyLanterns[i];
      sl.life += dt;

      sl.group.position.y += sl.vy * dt;
      sl.group.position.x += sl.vx * dt;
      sl.group.position.z += sl.vz * dt;

      sl.group.rotation.x = Math.sin(time * 1.8 + i) * 0.05;
      sl.group.rotation.z = Math.cos(time * 1.5 + i) * 0.05;
      sl.group.rotation.y += sl.rotSpeed;

      if (sl.fireLight) {
        sl.fireLight.intensity = 1.1 + Math.sin(time * 10 + i * 2) * 0.35;
      }

      if (sl.life >= sl.maxLife || sl.group.position.y > 65.0) {
        this.scene.remove(sl.group);
        this.skyLanterns.splice(i, 1);
      }
    }
  }

  // 水院祈願水燈 (Floating River Lamp)
  launchWaterLantern({ text = "心願順遂", petitionerName = "善信" } = {}) {
    if (!this.waterLanterns) this.waterLanterns = [];

    const lanternGroup = new THREE.Group();
    const lotusMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 });
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), lotusMat);
      petal.scale.set(0.6, 1.4, 0.3);
      petal.rotation.x = 0.6;
      petal.rotation.y = angle;
      petal.position.set(Math.cos(angle) * 0.12, 0.03, Math.sin(angle) * 0.12);
      lanternGroup.add(petal);
    }
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), centerMat);
    candle.position.y = 0.04;
    lanternGroup.add(candle);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 6), flameMat);
    flame.position.y = 0.09;
    lanternGroup.add(flame);

    const candleLight = new THREE.PointLight(0xff9900, 0.9, 2.5);
    candleLight.position.y = 0.1;
    lanternGroup.add(candleLight);

    lanternGroup.position.set(12.5 + (Math.random() - 0.5) * 1.5, 0.36, 13.5 + 2.0);
    this.scene.add(lanternGroup);

    if (window.templeAudio) {
      window.templeAudio.playWaterLanternRelease();
    }

    this.waterLanterns.push({
      group: lanternGroup,
      candleLight: candleLight,
      vx: (Math.random() - 0.5) * 0.06,
      vz: (Math.random() - 0.5) * 0.06,
      birth: performance.now(),
      duration: 45000
    });

    this.spawn3DFloatingText(`🪷「${text}」祈願水燈順流漂動，點亮福田！`, lanternGroup.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
  }

  // 每一影格更新水燈漂浮
  updateWaterLanterns(time, dt) {
    if (!this.waterLanterns || this.waterLanterns.length === 0) return;

    const now = performance.now();
    for (let i = this.waterLanterns.length - 1; i >= 0; i--) {
      const wl = this.waterLanterns[i];
      const elapsed = now - wl.birth;
      if (elapsed < wl.duration) {
        wl.group.position.x += wl.vx * dt;
        wl.group.position.z += wl.vz * dt;
        wl.group.rotation.y += dt * 0.05;
        if (wl.candleLight) {
          wl.candleLight.intensity = 0.8 + Math.sin(time * 8 + i) * 0.25;
        }
      } else {
        this.scene.remove(wl.group);
        this.waterLanterns.splice(i, 1);
      }
    }
  }

  spawnPondRipple(pos) {
    const ringGeo = new THREE.RingGeometry(0.02, 0.06, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xaaeedd, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos);
    ring.position.y = 0.37;
    this.scene.add(ring);

    this.pondRipples.push({ mesh: ring, birth: performance.now(), duration: 900 });
  }

  // 焚燒金紙化寶 (Joss Paper Burning)
  burnJossPaper() {
    if (this.isBurningPaper) return;
    this.isBurningPaper = true;
    window.emitRitual?.("paper");

    if (this.avatar) {
      this.avatar.triggerAction("bow");
    }

    window.templeAudio.playJossPaperFlame();
    this.spawn3DFloatingText("金紙化寶 • 功德無量", new THREE.Vector3(-12.5, 2.6, 14.5));

    // 金紙張飛入火門
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xf5c542, roughness: 0.4 });
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12), paperMat);
        paper.position.set(-11.5 + (Math.random() - 0.5) * 0.3, 1.2, 14.5 + (Math.random() - 0.5) * 0.3);
        this.scene.add(paper);

        const pStart = performance.now();
        const fly = (now) => {
          const prog = (now - pStart) / 600;
          if (prog < 1) {
            paper.position.x -= 0.016;
            paper.position.y -= 0.005;
            paper.rotation.z += 0.1;
            requestAnimationFrame(fly);
          } else {
            this.scene.remove(paper);
            // 產生金燼火花
            this.spawnFlameEmber(new THREE.Vector3(-12.5, 1.8, 14.5));
          }
        };
        requestAnimationFrame(fly);
      }, i * 140);
    }

    document.getElementById("dockStatusBar").innerText = "🔥 金紙化寶入金爐！香火長明，神佛共鑒，增福添壽！";
    setTimeout(() => {
      this.isBurningPaper = false;
    }, 1500);
  }

  spawnFlameEmber(pos) {
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    ember.position.copy(pos);
    this.scene.add(ember);
    this.flameParticles.push({ mesh: ember, birth: performance.now(), duration: 800 });
  }

  lightIncense() {
    this.isIncenseLit = true;
    this.incenseSticks.forEach(item => {
      item.ember.visible = true;
    });

    if (!this.emberLight) {
      this.emberLight = new THREE.PointLight(0xff5500, 1.5, 2.5);
      this.emberLight.position.set(0, 2.0, -0.3);
      this.scene.add(this.emberLight);
    }

    this.spawn3DFloatingText("三炷清香 • 誠心達天", new THREE.Vector3(0, 2.2, -0.3));
    if (this.avatar) {
      this.avatar.triggerAction("bow");
    }
  }

  tossBwa(callback) {
    if (this.isBwaTossing) return;
    this.isBwaTossing = true;

    if (this.avatar) {
      this.avatar.triggerAction("kneel");
    }

    const startTime = performance.now();
    const duration = 1200;

    const outcome1 = Math.random() < 0.5 ? 0 : 1;
    const outcome2 = Math.random() < 0.5 ? 0 : 1;

    const bwa1 = this.bwaBlocks[0];
    const bwa2 = this.bwaBlocks[1];

    const animateToss = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        const height = Math.sin(progress * Math.PI) * 1.5;
        bwa1.position.y = 0.08 + height;
        bwa2.position.y = 0.08 + height;

        bwa1.rotation.x += 0.28;
        bwa1.rotation.y += 0.24;
        bwa1.rotation.z += 0.18;

        bwa2.rotation.x += 0.24;
        bwa2.rotation.y += 0.30;
        bwa2.rotation.z += 0.15;

        requestAnimationFrame(animateToss);
      } else {
        bwa1.position.set(-0.35 + (Math.random() - 0.5) * 0.1, 0.08, 1.8 + (Math.random() - 0.5) * 0.1);
        bwa2.position.set(0.35 + (Math.random() - 0.5) * 0.1, 0.08, 1.8 + (Math.random() - 0.5) * 0.1);

        bwa1.rotation.set(outcome1 === 0 ? Math.PI / 2 : -Math.PI / 2, Math.random() * 0.5, 0);
        bwa2.rotation.set(outcome2 === 0 ? Math.PI / 2 : -Math.PI / 2, -Math.random() * 0.5, 0);

        this.isBwaTossing = false;
        if (callback) callback({ outcome1, outcome2 });
      }
    };

    requestAnimationFrame(animateToss);
  }

  shakeChiamBucket(callback) {
    if (this.isChiamShaking) return;
    this.isChiamShaking = true;

    if (this.avatar) {
      this.avatar.triggerAction("pray");
    }

    const startTime = performance.now();
    const duration = 1400;
    const bucket = this.chiamBucket;
    const targetStick = this.chiamSticks[Math.floor(Math.random() * this.chiamSticks.length)];

    const animateShake = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.7) {
        bucket.rotation.z = Math.sin(elapsed * 0.035) * 0.12;
        bucket.rotation.x = Math.cos(elapsed * 0.025) * 0.08;
        requestAnimationFrame(animateShake);
      } else if (progress < 1) {
        bucket.rotation.set(0, 0, 0);
        targetStick.position.y = 0.28 + ((progress - 0.7) / 0.3) * 0.35;
        requestAnimationFrame(animateShake);
      } else {
        this.isChiamShaking = false;
        if (callback) callback();
      }
    };

    requestAnimationFrame(animateShake);
  }

  strikeMuyu() {
    if (!this.mallet || this.isMuyuStriking) return;
    this.isMuyuStriking = true;

    this.mallet.rotation.z = 0.15;
    this.muyuGroup.position.y = 1.32;

    setTimeout(() => {
      this.mallet.rotation.z = -0.4;
      this.muyuGroup.position.y = 1.35;
      this.isMuyuStriking = false;
    }, 120);

    const customTxt = document.getElementById("txtCustomFloat")?.value || "功德 +1";
    this.spawn3DFloatingText(customTxt, new THREE.Vector3(-1.4, 1.8, -0.3));

    if (this.avatar) {
      this.avatar.triggerAction("pray");
    }
  }

  spawn3DFloatingText(text, position) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 32px "Noto Serif TC", serif';
    ctx.fillStyle = '#ffe885';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#f5c542';
    ctx.shadowBlur = 10;
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(position);
    sprite.scale.set(1.2, 0.3, 1);

    this.scene.add(sprite);
    this.floatingTexts.push({ sprite, birth: performance.now(), duration: 1600 });
  }

  // 平滑拉回或對齊至角色背後第 3 人稱視角
  resetCameraBehindAvatar(smooth = true) {
    if (!this.avatar) return;
    this.followAvatar = true;

    // 依據角色朝向角計算身後 4.8 米、高度 2.5 米之絕佳第 3 人稱俯瞰位置
    const rotY = this.avatar.playerGroup ? this.avatar.playerGroup.rotation.y : 0;
    const backOffsetX = -Math.sin(rotY) * 4.8;
    const backOffsetZ = -Math.cos(rotY) * 4.8;

    const targetPos = new THREE.Vector3(
      this.avatar.position.x + backOffsetX,
      this.avatar.position.y + 2.5,
      this.avatar.position.z + backOffsetZ
    );
    const targetLook = new THREE.Vector3(
      this.avatar.position.x,
      this.avatar.position.y + 1.1,
      this.avatar.position.z
    );

    if (smooth) {
      this.targetCameraPos = targetPos;
      this.targetLookAt = targetLook;
    } else {
      this.camera.position.copy(targetPos);
      this.controls.target.copy(targetLook);
      this.targetCameraPos = null;
      this.targetLookAt = null;
    }

    // 更新視角塢按鈕啟用狀態
    document.querySelectorAll(".btn-cam-view").forEach(b => {
      b.classList.toggle("active", b.dataset.view === "follow");
    });
  }

  setCameraView(viewName) {
    if (viewName === "follow") {
      if (this.isFirstPerson) {
        this.isFirstPerson = false;
        if (this.avatar && this.avatar.playerGroup) this.avatar.playerGroup.visible = true;
        this.controls.minDistance = 1.4;
        this.controls.maxDistance = 75.0;
      }
      this.resetCameraBehindAvatar(true);
      return;
    }

    if (viewName === "firstPerson") {
      this.isFirstPerson = true;
      this.followAvatar = true;
      if (this.avatar && this.avatar.playerGroup) {
        this.avatar.playerGroup.visible = false;
      }
      this.controls.minDistance = 0.01;
      this.controls.maxDistance = 0.01;
      this.camera.position.set(this.avatar.position.x, this.avatar.position.y + 1.05, this.avatar.position.z);
      const rotY = this.avatar.playerGroup ? this.avatar.playerGroup.rotation.y : 0;
      this.controls.target.set(
        this.avatar.position.x + Math.sin(rotY) * 4.0,
        this.avatar.position.y + 1.05,
        this.avatar.position.z + Math.cos(rotY) * 4.0
      );
      this.targetCameraPos = null;
      this.targetLookAt = null;
      document.querySelectorAll(".btn-cam-view").forEach(b => {
        b.classList.toggle("active", b.dataset.view === "firstPerson");
      });
      return;
    }

    // 若退出第一人稱，恢復分身模型可見與預設縮放範圍
    if (this.isFirstPerson) {
      this.isFirstPerson = false;
      if (this.avatar && this.avatar.playerGroup) {
        this.avatar.playerGroup.visible = true;
      }
      this.controls.minDistance = 1.4;
      this.controls.maxDistance = 75.0;
    }

    // 若切換為固定場景視角，暫停分身自動跟隨
    this.followAvatar = false;

    const views = {
      overview: { pos: new THREE.Vector3(0, 3.4, 7.8), look: new THREE.Vector3(0, 1.3, 1.5) },
      censer: { pos: new THREE.Vector3(0, 2.0, 1.2), look: new THREE.Vector3(0, 1.45, -0.3) },
      bwa: { pos: new THREE.Vector3(0, 3.5, 2.6), look: new THREE.Vector3(0, 0.1, 1.8) },
      chiam: { pos: new THREE.Vector3(1.1, 1.9, 0.6), look: new THREE.Vector3(1.4, 1.5, -0.3) },
      muyu: { pos: new THREE.Vector3(-1.1, 1.9, 0.6), look: new THREE.Vector3(-1.4, 1.5, -0.3) },
      courtyard: { pos: new THREE.Vector3(0, 6.5, 22.0), look: new THREE.Vector3(0, 1.8, 11.5) },
      pond: { pos: new THREE.Vector3(8.5, 4.0, 17.5), look: new THREE.Vector3(12.5, 0.6, 13.5) },
      furnace: { pos: new THREE.Vector3(-8.5, 4.0, 17.5), look: new THREE.Vector3(-12.5, 1.2, 14.5) },
      ema: { pos: new THREE.Vector3(-10.2, 3.2, 11.2), look: new THREE.Vector3(-13.5, 1.8, 8.5) },
      wenchang: { pos: new THREE.Vector3(13.5, 3.5, 10.5), look: new THREE.Vector3(13.5, 1.8, 5.5) },
      yuelao: { pos: new THREE.Vector3(13.5, 3.5, 28.5), look: new THREE.Vector3(13.5, 1.8, 23.5) },
      caishen: { pos: new THREE.Vector3(-13.5, 3.5, 28.5), look: new THREE.Vector3(-13.5, 1.8, 23.5) },
      taisui: { pos: new THREE.Vector3(-10.2, 3.2, 10.5), look: new THREE.Vector3(-13.5, 1.8, 5.5) },
      bellTower: { pos: new THREE.Vector3(6.2, 3.2, 33.8), look: new THREE.Vector3(9.5, 2.2, 30.0) },
      drumTower: { pos: new THREE.Vector3(-6.2, 3.2, 33.8), look: new THREE.Vector3(-9.5, 2.2, 30.0) },
      parade: { pos: new THREE.Vector3(2.5, 3.2, (this.palanquinGroup ? this.palanquinGroup.position.z + 4.5 : 12.0)), look: new THREE.Vector3(0, 1.4, (this.palanquinGroup ? this.palanquinGroup.position.z : 7.5)) },
      gate: { pos: new THREE.Vector3(0, 5.5, 46.0), look: new THREE.Vector3(0, 4.0, 36.0) },
      skyview: { pos: new THREE.Vector3(0, 34.0, 48.0), look: new THREE.Vector3(0, 1.5, 14.0) }
    };

    const target = views[viewName] || views.overview;
    this.targetCameraPos = target.pos;
    this.targetLookAt = target.look;
  }

  onMouseMove(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects);

    const tooltipEl = document.getElementById("canvas3dTooltip");
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      this.renderer.domElement.style.cursor = "pointer";
      if (tooltipEl && obj.userData?.tooltip) {
        tooltipEl.innerText = obj.userData.tooltip;
        tooltipEl.style.display = "block";
        tooltipEl.style.left = `${e.clientX + 15}px`;
        tooltipEl.style.top = `${e.clientY + 15}px`;
      }
    } else {
      this.renderer.domElement.style.cursor = "default";
      if (tooltipEl) tooltipEl.style.display = "none";
    }
  }

  onClick(e) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects);

    if (intersects.length > 0) {
      const type = intersects[0].object.userData?.type;
      if (type === "censer") {
        document.getElementById("btnLightIncense")?.click();
      } else if (type === "bwa") {
        document.getElementById("btnThrowBwa")?.click();
      } else if (type === "chiam") {
        document.getElementById("btnShakeChiam")?.click();
      } else if (type === "muyu") {
        this.strikeMuyu();
        document.getElementById("btnKnockMuyu")?.click();
      } else if (type === "heavenCenser") {
        this.triggerNearbyInteraction();
      } else if (type === "wishingPond") {
        this.tossWishingCoin();
      } else if (type === "jossFurnace") {
        this.burnJossPaper();
      } else if (type === "emaWall" || type === "emaPlaque") {
        document.getElementById("btnOpenEma")?.click();
      } else if (type === "mountainGate") {
        this.avatar?.triggerAction("bow");
        if (window.templeAudio) window.templeAudio.playBell(720);
        this.spawn3DFloatingText("山門迎祥 • 滌淨塵心", new THREE.Vector3(0, 3.5, 38.0));
        document.getElementById("dockStatusBar").innerText = "⛩️ 巍峨山門牌樓！步入清淨聖境，滌盡人間塵囂。";
      } else if (type === "stoneLion") {
        this.avatar?.triggerAction("bow");
        if (window.templeAudio) window.templeAudio.playBell(580);
        const lionX = intersects[0].point?.x > 0 ? 5.5 : -5.5;
        this.spawn3DFloatingText("神獅鎮煞 • 辟邪迎祥", new THREE.Vector3(lionX, 2.5, 34.0));
        document.getElementById("dockStatusBar").innerText = "🦁 青石神獅威鎮山門！辟邪降福，護佑合境平安！";
      } else if (type === "wenchangPavilion") {
        if (window.openSideHallModal) window.openSideHallModal('wenchang');
      } else if (type === "yuelaoPavilion") {
        if (window.openSideHallModal) window.openSideHallModal('yuelao');
      } else if (type === "caishenCave") {
        if (window.openSideHallModal) window.openSideHallModal('caishen');
      } else if (type === "taisuiShrine") {
        if (window.openTaiSuiModal) window.openTaiSuiModal();
      } else if (type === "bellTower") {
        this.strikeBell();
      } else if (type === "drumTower") {
        this.beatDrum();
      } else if (type === "palanquin") {
        this.kneelUnderPalanquin();
      }
    }
  }

  // ---------- 畫質分級 ----------
  applyQuality(preset) {
    this.qualityPreset = preset;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.maxPixelRatio));
    this.onWindowResize();

    const shadowType = preset.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    const shadowsChanged = this.renderer.shadowMap.enabled !== preset.shadows || this.renderer.shadowMap.type !== shadowType;
    this.renderer.shadowMap.enabled = preset.shadows;
    this.renderer.shadowMap.type = shadowType;
    [[this.sunMoonLight, preset.sunShadowSize], [this.mainSpot, preset.spotShadowSize]].forEach(([light, size]) => {
      if (!light || light.shadow.mapSize.width === size) return;
      light.shadow.mapSize.set(size, size);
      // 舊的陰影貼圖要丟掉，three 才會以新尺寸重建
      if (light.shadow.map) {
        light.shadow.map.dispose();
        light.shadow.map = null;
      }
    });
    // 陰影開關或類型改變後，所有材質都要重新編譯
    if (shadowsChanged) {
      this.scene.traverse(obj => {
        if (!obj.material) return;
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => { m.needsUpdate = true; });
      });
    }
    this.applyParticleBudget();
    this.applyLightBudget();
  }

  // 粒子只畫前面一部分，不重建幾何
  applyParticleBudget() {
    const factor = this.qualityPreset ? this.qualityPreset.particles : 1;
    [this.starPoints, this.dustPoints, this.weatherPoints].forEach(points => {
      if (!points) return;
      const total = points.geometry.attributes.position.count;
      points.geometry.setDrawRange(0, Math.max(1, Math.floor(total * factor)));
    });
  }

  // 低畫質關掉裝飾用點光源（每盞點光源都會增加每個像素的計算），只留神像主光
  applyLightBudget() {
    const allow = !this.qualityPreset || this.qualityPreset.decorLights;
    this.scene.traverse(obj => {
      if (obj.isPointLight && obj !== this.shrineBacklight && obj.visible !== allow) obj.visible = allow;
    });
  }

  onWindowResize() {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // 科儀過程中會動態新增點光源（化金紙、點香），低畫質時定期關掉
    this.qualityFrame = (this.qualityFrame || 0) + 1;
    if (this.qualityFrame % 90 === 0 && this.qualityPreset && !this.qualityPreset.decorLights) this.applyLightBudget();

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) * 0.001, 0.1);
    this.lastTime = now;
    const time = now * 0.001;

    // 1. 角色系統更新 (行走與骨架) 與 鏡頭平滑跟隨 (Smooth Camera Follow)
    if (this.avatar) {
      const prevAvatarPos = this.avatar.position.clone();
      this.avatar.update(dt);

      // 更新音效聽者 3D 位置
      if (window.templeAudio) {
        window.templeAudio.updateListenerPosition(this.avatar.position.x, this.avatar.position.y, this.avatar.position.z);
      }

      // 當玩家操控角色移動且當前處於固定鏡頭時，智能恢復分身隨行模式
      if (this.avatar.isMoving && !this.followAvatar) {
        const dist = this.camera.position.distanceTo(this.avatar.position);
        if (dist > 12.0) {
          this.resetCameraBehindAvatar(true);
        } else {
          this.followAvatar = true;
          this.targetCameraPos = null;
          this.targetLookAt = null;
          document.querySelectorAll(".btn-cam-view").forEach(b => {
            b.classList.toggle("active", b.dataset.view === "follow");
          });
        }
      }

      // 視角鏡頭平滑跟隨角色 (第一人稱或第 3 人稱)
      if (this.isFirstPerson) {
        // 第一人稱直接緊貼分身眼部高度 (y = 1.05)
        const eyePos = new THREE.Vector3(this.avatar.position.x, this.avatar.position.y + 1.05, this.avatar.position.z);
        const deltaEye = new THREE.Vector3().subVectors(eyePos, this.camera.position);
        if (deltaEye.lengthSq() > 0.0000001) {
          this.camera.position.add(deltaEye);
          this.controls.target.add(deltaEye);
        }
      } else if (this.followAvatar) {
        const deltaMove = new THREE.Vector3().subVectors(this.avatar.position, prevAvatarPos);

        if (this.targetCameraPos && this.targetLookAt) {
          // 若正在進行視角過渡動畫，同步平移過渡目標點，確保過渡不滯後
          if (deltaMove.lengthSq() > 0.0000001) {
            this.targetCameraPos.add(deltaMove);
            this.targetLookAt.add(deltaMove);
          }
        } else {
          // 常態跟隨：若角色產生位移，攝影機與 controls.target 完全同步平移
          if (deltaMove.lengthSq() > 0.0000001) {
            this.controls.target.add(deltaMove);
            this.camera.position.add(deltaMove);
          }

          // 微調目標焦點平滑貼合角色上身 (y + 1.1)，消除累積浮點漂移
          const idealFocus = new THREE.Vector3(this.avatar.position.x, this.avatar.position.y + 1.1, this.avatar.position.z);
          const focusDrift = new THREE.Vector3().subVectors(idealFocus, this.controls.target);
          if (focusDrift.lengthSq() > 0.00001) {
            const correction = focusDrift.multiplyScalar(0.12);
            this.controls.target.add(correction);
            this.camera.position.add(correction);
          }
        }
      }
    }

    // 2. 燈籠微風搖曳
    this.lanterns.forEach(l => {
      l.group.rotation.z = Math.sin(time * 1.5 + l.offset) * 0.05;
      l.group.rotation.x = Math.cos(time * 1.2 + l.offset) * 0.03;
    });

    // 3. 祈願繪馬木牌隨風輕晃
    this.emaPlaques.forEach(p => {
      p.group.rotation.z = Math.sin(time * 2.2 + p.offset) * 0.06;
      p.group.rotation.x = Math.cos(time * 1.8 + p.offset) * 0.04;
    });

    // 4. 繁星穹頂微閃
    if (this.starPoints && this.starPoints.material.opacity > 0) {
      this.starPoints.material.size = 0.18 + Math.sin(time * 3) * 0.03;
    }

    // 5. 燭火呼吸閃爍
    this.candleLights.forEach((light, i) => {
      light.intensity = 1.2 + Math.sin(time * 8 + i * 2) * 0.3;
    });

    // 4. 神環自轉
    if (this.deityHalo) {
      this.deityHalo.rotation.z += 0.004;
    }

    // 5. 浮塵上升
    if (this.dustPoints) {
      const pos = this.dustPoints.geometry.attributes.position.array;
      for (let i = 1; i < pos.length; i += 3) {
        pos[i] += 0.002;
        if (pos[i] > 5) pos[i] = 0.2;
      }
      this.dustPoints.geometry.attributes.position.needsUpdate = true;
    }

    // 6. 3D 香煙粒子
    if (this.isIncenseLit) {
      if (Math.random() < 0.4) {
        const smokeGeo = new THREE.SphereGeometry(0.015, 6, 6);
        const smokeMat = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.6 });
        const particle = new THREE.Mesh(smokeGeo, smokeMat);
        const stickIdx = Math.floor(Math.random() * 3);
        const startX = (stickIdx - 1) * 0.07;
        particle.position.set(startX, 2.0, -0.3);
        this.scene.add(particle);
        this.smokeParticles.push({
          mesh: particle,
          vx: (Math.random() - 0.5) * 0.008,
          vy: 0.012 + Math.random() * 0.008,
          life: 0,
          maxLife: 90 + Math.random() * 30
        });
      }

      for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
        const sp = this.smokeParticles[i];
        sp.life++;
        sp.mesh.position.y += sp.vy;
        sp.mesh.position.x += sp.vx + Math.sin(time * 3 + sp.mesh.position.y) * 0.003;
        sp.mesh.scale.multiplyScalar(1.025);
        sp.mesh.material.opacity = 0.6 * (1 - sp.life / sp.maxLife);

        if (sp.life >= sp.maxLife) {
          this.scene.remove(sp.mesh);
          this.smokeParticles.splice(i, 1);
        }
      }
    }

    // 7. 許願池水花波紋擴散
    for (let i = this.pondRipples.length - 1; i >= 0; i--) {
      const rp = this.pondRipples[i];
      const prog = (now - rp.birth) / rp.duration;
      if (prog < 1) {
        rp.mesh.scale.setScalar(1 + prog * 4.5);
        rp.mesh.material.opacity = 0.9 * (1 - prog);
      } else {
        this.scene.remove(rp.mesh);
        this.pondRipples.splice(i, 1);
      }
    }

    // 8. 金爐飛灰火花
    for (let i = this.flameParticles.length - 1; i >= 0; i--) {
      const fl = this.flameParticles[i];
      const prog = (now - fl.birth) / fl.duration;
      if (prog < 1) {
        fl.mesh.position.y += 0.015;
        fl.mesh.position.x += (Math.random() - 0.5) * 0.006;
      } else {
        this.scene.remove(fl.mesh);
        this.flameParticles.splice(i, 1);
      }
    }

    // 9. 迎神遶境涼傘旋轉與神轎進退巡禮
    if (this.liangsanMesh) {
      this.liangsanMesh.rotation.y += 0.025;
    }

    // 起駕時從東側停放處平移到中央御道，回鑾後再移回
    if (this.palanquinGroup) {
      const targetX = this.isParading ? 0 : PALANQUIN_REST_X;
      this.palanquinGroup.position.x += (targetX - this.palanquinGroup.position.x) * Math.min(1, dt * 2.5);
    }

    if (this.isParading && this.palanquinGroup) {
      this.palanquinGroup.position.z += dt * 2.4 * this.paradeDirection;
      this.palanquinGroup.position.y = 0.8 + Math.sin(time * 5.5) * 0.08;
      this.palanquinGroup.rotation.z = Math.sin(time * 4.5) * 0.03;

      if (Math.random() < 0.28) {
        this.spawnFirecrackerParticle();
      }

      if (this.palanquinGroup.position.z >= 35.0 && this.paradeDirection > 0) {
        this.paradeDirection = -1;
        this.palanquinGroup.rotation.y = Math.PI;
        this.spawn3DFloatingText("🏮 聖駕巡抵山門！祈福圓滿，起駕回鑾！", new THREE.Vector3(0, 3.2, 35.0));
      } else if (this.palanquinGroup.position.z <= PALANQUIN_REST_Z && this.paradeDirection < 0) {
        this.paradeDirection = 1;
        this.palanquinGroup.rotation.y = 0;
        this.isParading = false;
        this.spawn3DFloatingText("🏮 聖駕回鑾安座！合境平安，萬福駢臻！", new THREE.Vector3(0, 3.2, PALANQUIN_REST_Z));
        if (window.setDockStatus) window.setDockStatus("🏮 神明聖駕出巡圓滿，回鑾安座！信眾闔家蒙受庇佑！");
      }

      if (this.avatar && !this.hasKneeledUnderPalanquin) {
        const distToJiao = this.avatar.position.distanceTo(this.palanquinGroup.position);
        if (distToJiao < 2.2) {
          this.kneelUnderPalanquin();
        }
      }
    }

    // 鞭炮火花粒子更新
    for (let i = this.firecrackerParticles.length - 1; i >= 0; i--) {
      const fp = this.firecrackerParticles[i];
      fp.life++;
      fp.mesh.position.x += fp.vx;
      fp.mesh.position.y += fp.vy;
      fp.mesh.position.z += fp.vz;
      fp.mesh.scale.multiplyScalar(0.96);
      if (fp.life >= fp.maxLife) {
        this.scene.remove(fp.mesh);
        this.firecrackerParticles.splice(i, 1);
      }
    }

    // 天候微粒與水花漣漪更新
    if (this.currentWeather === "rain" && this.weatherPoints && this.weatherVels) {
      const pos = this.weatherPoints.geometry.attributes.position.array;
      for (let i = 0; i < this.weatherVels.length; i++) {
        pos[i * 3 + 1] -= this.weatherVels[i];
        if (pos[i * 3 + 1] < 0.05) {
          pos[i * 3 + 1] = 24.0 + Math.random() * 3.0;
          if (Math.random() < 0.03 && this.groundRipples.length < 25) {
            this.spawnGroundRipple(pos[i * 3], pos[i * 3 + 2]);
          }
        }
      }
      this.weatherPoints.geometry.attributes.position.needsUpdate = true;
    } else if (this.currentWeather === "blossoms" && this.weatherPoints && this.blossomSeeds) {
      const pos = this.weatherPoints.geometry.attributes.position.array;
      for (let i = 0; i < this.blossomSeeds.length; i++) {
        const seed = this.blossomSeeds[i];
        pos[i * 3 + 1] -= 0.035;
        pos[i * 3] += Math.sin(time * 1.5 + seed) * 0.02 + 0.015;
        pos[i * 3 + 2] += Math.cos(time * 1.2 + seed) * 0.01;
        if (pos[i * 3 + 1] < 0.05) {
          pos[i * 3 + 1] = 18.0 + Math.random() * 2.0;
          pos[i * 3] = (Math.random() - 0.5) * 44;
          pos[i * 3 + 2] = Math.random() * 52 - 6;
        }
      }
      this.weatherPoints.geometry.attributes.position.needsUpdate = true;
    }

    // 地面漣漪消退更新
    for (let i = this.groundRipples.length - 1; i >= 0; i--) {
      const rip = this.groundRipples[i];
      rip.life -= 0.035;
      rip.mesh.scale.multiplyScalar(1.04);
      rip.mat.opacity = Math.max(0, rip.life * 0.65);
      if (rip.life <= 0) {
        this.weatherGroup.remove(rip.mesh);
        rip.mesh.geometry.dispose();
        rip.mat.dispose();
        this.groundRipples.splice(i, 1);
      }
    }

    // 線上收驚除煞粒子與金光天柱更新
    for (let i = this.shoujingPurgeParticles.length - 1; i >= 0; i--) {
      const sp = this.shoujingPurgeParticles[i];
      sp.life -= 0.025;
      sp.mesh.position.x += sp.vx;
      sp.mesh.position.y += sp.vy;
      sp.mesh.position.z += sp.vz;
      sp.mesh.scale.multiplyScalar(1.02);
      sp.mat.opacity = Math.max(0, sp.life * 0.8);
      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        sp.mat.dispose();
        this.shoujingPurgeParticles.splice(i, 1);
      }
    }

    if (this.shoujingLightBeam) {
      this.shoujingLightBeam.life -= 0.016;
      this.shoujingLightBeam.mesh.rotation.y += 0.04;
      this.shoujingLightBeam.mat.opacity = Math.max(0, this.shoujingLightBeam.life * 0.65);
      if (this.shoujingLightBeam.life <= 0) {
        this.scene.remove(this.shoujingLightBeam.mesh);
        this.shoujingLightBeam.mesh.geometry.dispose();
        this.shoujingLightBeam.mat.dispose();
        this.shoujingLightBeam = null;
      }
    }

    // 錦鯉游動生態更新
    this.updateKoiFish(time, dt);

    // 祈願天燈升空物理更新
    this.updateSkyLanterns(time, dt);

    // 水燈漂浮更新
    this.updateWaterLanterns(time, dt);

    // 10. 3D 浮動文字
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      const age = now - ft.birth;
      const progress = age / ft.duration;

      if (progress < 1) {
        ft.sprite.position.y += 0.01;
        ft.sprite.material.opacity = 1 - Math.pow(progress, 2);
      } else {
        this.scene.remove(ft.sprite);
        this.floatingTexts.splice(i, 1);
      }
    }

    // 10. 攝影機視角平滑插值 (Lerp)
    if (this.targetCameraPos && this.targetLookAt) {
      this.camera.position.lerp(this.targetCameraPos, 0.08);
      this.controls.target.lerp(this.targetLookAt, 0.08);
      if (this.camera.position.distanceTo(this.targetCameraPos) < 0.04) {
        this.camera.position.copy(this.targetCameraPos);
        this.controls.target.copy(this.targetLookAt);
        this.targetCameraPos = null;
        this.targetLookAt = null;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.Temple3DScene = Temple3DScene;

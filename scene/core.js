// scene/core.js - 賽博虛擬神殿 3D 引擎核心：場景、燈光、鏡頭、點選互動與主迴圈
// 各區域的建模與互動方法在 scene/*.js，以 installTempleMixin() 掛回 Temple3DScene.prototype

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
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // 維持 r128 時代的外觀：不做 sRGB 輸出轉換（色彩管理已在 three.bundle 關閉）
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute("aria-label", "神殿 3D 場景：WASD 或方向鍵移動，E 與附近地點互動，C 重置視角。也可用廟區地圖選擇目的地。");
    this.renderer.domElement.addEventListener("pointerdown", () => {
      if (!document.querySelector('.modal-overlay.open:not(#avatarModal)')) this.renderer.domElement.focus({ preventScroll: true });
    });

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
    this.buildServiceDesk();   // 廟埕服務處（完整參拜流程的第一站）
    this.buildHallInterior();
    this.buildNightMarket();
    this.setupSeasonalScene();
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
      if (window.templeReading?.blocksSceneKeys(e)) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "KeyE" && !e.repeat) {
        this.triggerNearbyInteraction();
      }
      if (e.code === "KeyC") {
        this.resetCameraBehindAvatar(true);
      }
    });

    // 8. VR 模式（只在偵測到頭盔時顯示按鈕）與主渲染循環
    //    用 setAnimationLoop：平常等同 requestAnimationFrame，進入 VR 時由頭盔控制更新頻率
    this.setupXR();
    // 角色碰撞：所有建築、分身與 NPC 都建好後才整理碰撞方塊
    this.buildCollisionMap();
    this.renderer.setAnimationLoop(() => this.animate());
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

  // 拍攝目前場景高清畫面 (供拍立得與明信片使用)
  takeSnapshot() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL("image/png");
  }

  // 接近觸發判斷
  triggerNearbyInteraction() {
    if (!this.avatar) return;
    if (window.templeVisit) {
      if (!window.templeVisit.interact() && !window.templeVisit.modalOpen()) this.avatar.triggerAction("bow");
      return;
    }
    const p = this.avatar.position;

    if (this.tryHallInteraction()) return;
    if (this.tryMarketInteraction()) return;

    // 1. 走近天公爐 (< 2.2m, 中進中央 Z: 11.5)
    if (p.distanceTo(new THREE.Vector3(0, 0, 11.5)) < 2.2) {
      if (window.templeInventory && !window.templeInventory.consume({ incense: 1 })) return;
      this.avatar.triggerAction("bow");
      window.templeAudio.playBell(560);
      this.spawn3DFloatingText("天公賜福 • 迎祥納吉", new THREE.Vector3(0, 2.5, 11.5));
      document.getElementById("dockStatusBar").innerText = "🔥 敬拜天公爐完成！玉皇上帝庇佑元辰光彩、平安吉祥！";
      window.emitRitual?.("heavenCenser");
      return;
    }

    // 1.5 走近服務處 (< 2.2m)：領清香與金紙
    if (this.serviceDeskPos && p.distanceTo(this.serviceDeskPos) < 2.2) {
      window.pilgrimage?.claimSupplies();
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

  resumeCameraFollow() {
    if (!this.avatar) return;
    this.followAvatar = true;
    // 從固定遠景回到隨行時保留畫面朝向，避免按後退卻因鏡頭翻面而反轉。
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    offset.y = 0;
    if (offset.lengthSq() < 1e-8) offset.set(0, 0, 1);
    offset.normalize().multiplyScalar(4.8);
    this.targetCameraPos = this.avatar.position.clone().add(offset).add(new THREE.Vector3(0, 2.5, 0));
    this.targetLookAt = this.avatar.position.clone().add(new THREE.Vector3(0, 1.1, 0));
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
      market: { pos: new THREE.Vector3(-6.5, 3.3, 31.5), look: new THREE.Vector3(-6.5, 1.2, 25.5) },
      puppet: { pos: new THREE.Vector3(6.5, 2.9, 31.0), look: new THREE.Vector3(6.5, 2.0, 25.5) },
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
    // 觸控點擊前沒有 mousemove，必須使用這次點擊的座標。
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects);

    if (intersects.length > 0) {
      const type = intersects[0].object.userData?.type;
      if (type === "ringStall" || type === "puppetStage") {
        window.nightMarket?.open(type === "ringStall" ? "ring" : "puppet");
      } else if (["prayerMat", "donationBox", "chiamCabinet"].includes(type)) {
        this.interactWithHallObject(intersects[0].object);
      } else if (type === "serviceDesk") {
        window.pilgrimage?.claimSupplies();
      } else if (type === "censer") {
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

  onWindowResize() {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {

    const now = performance.now();
    if (window.templePower && !window.templePower.shouldRender(now, this)) return;
    this.updateSeasonalDate(now);

    // 科儀過程中會動態新增點光源（化金紙、點香），低畫質時定期關掉
    this.qualityFrame = (this.qualityFrame || 0) + 1;
    if (this.qualityFrame % 90 === 0 && this.qualityPreset && !this.qualityPreset.decorLights) this.applyLightBudget();

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
          this.resumeCameraFollow();
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
      if (this.isXR) {
        // VR 中鏡頭由頭盔控制，不跟隨分身
      } else if (this.isFirstPerson) {
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
    if (!this.isXR && this.targetCameraPos && this.targetLookAt) {
      this.camera.position.lerp(this.targetCameraPos, 0.08);
      this.controls.target.lerp(this.targetLookAt, 0.08);
      if (this.camera.position.distanceTo(this.targetCameraPos) < 0.04) {
        this.camera.position.copy(this.targetCameraPos);
        this.controls.target.copy(this.targetLookAt);
        this.targetCameraPos = null;
        this.targetLookAt = null;
      }
    }

    // VR 中鏡頭由頭盔控制，不讓滑鼠視角控制器改動
    if (!this.isXR) this.controls.update();
    this.renderer.render(this.scene, this.camera);
    window.templeQuality?.recordFrame(now);
    this.updatePuppetStage(time);
  }
}

window.Temple3DScene = Temple3DScene;

// 把 mixin 類別的方法掛到 Temple3DScene；同名方法視為錯誤，避免兩個檔案互相覆蓋
function installTempleMixin(mixin) {
  for (const key of Object.getOwnPropertyNames(mixin.prototype)) {
    if (key === "constructor") continue;
    if (Object.prototype.hasOwnProperty.call(Temple3DScene.prototype, key)) {
      throw new Error(`Temple3DScene 方法重複定義：${key}`);
    }
    Object.defineProperty(Temple3DScene.prototype, key, Object.getOwnPropertyDescriptor(mixin.prototype, key));
  }
}

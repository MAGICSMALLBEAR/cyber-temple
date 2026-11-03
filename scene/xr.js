// scene/xr.js - WebXR 虛擬實境模式（第一階段）：戴上頭盔站在大殿正中、面向神案觀看
// 只有瀏覽器偵測到可用的 VR 頭盔時，頂部才會出現「🥽 VR」按鈕。WebXR 需要 https 或 localhost。
// 進入時把鏡頭放進固定的載具（xrDolly）交給頭盔控制，隱藏自己的分身、停用滑鼠視角；離開時全部還原。

// 載具位置：大殿正中、神案前方，面向神尊（鏡頭預設朝 -z）
const XR_STAND_POSITION = [0, 0, 3.4];

class TempleXRMixin {
  setupXR() {
    this.isXR = false;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType("local-floor");
    this.xrDolly = new THREE.Group();
    this.xrDolly.name = "xrDolly";
    this.xrDolly.position.set(...XR_STAND_POSITION);
    this.scene.add(this.xrDolly);
    this.renderer.xr.addEventListener("sessionstart", () => this.onXRSessionStart());
    this.renderer.xr.addEventListener("sessionend", () => this.onXRSessionEnd());
    this.setupXRButton();
  }

  async setupXRButton() {
    const btn = document.getElementById("btnEnterVR");
    if (!btn) return;
    btn.hidden = true;
    if (!("xr" in navigator) || !window.isSecureContext) return;
    let supported = false;
    try {
      supported = await navigator.xr.isSessionSupported("immersive-vr");
    } catch (e) {}
    if (!supported) return;
    btn.hidden = false;
    btn.addEventListener("click", () => this.toggleXRSession());
  }

  async toggleXRSession() {
    const current = this.renderer.xr.getSession();
    if (current) {
      await current.end();
      return;
    }
    try {
      const session = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "bounded-floor"] });
      await this.renderer.xr.setSession(session);
    } catch (err) {
      console.warn("無法進入 VR：", err);
      if (window.setDockStatus) window.setDockStatus("🥽 無法進入 VR，請確認頭盔已連線並允許瀏覽器使用。");
    }
  }

  onXRSessionStart() {
    this.isXR = true;
    this.xrSaved = {
      position: this.camera.position.clone(),
      quaternion: this.camera.quaternion.clone(),
      target: this.controls.target.clone(),
      avatarVisible: this.avatar && this.avatar.playerGroup ? this.avatar.playerGroup.visible : true
    };
    this.xrDolly.add(this.camera);
    this.camera.position.set(0, 0, 0);
    this.camera.quaternion.identity();
    this.controls.enabled = false;
    if (this.avatar && this.avatar.playerGroup) this.avatar.playerGroup.visible = false;
    document.body.classList.add("xr-active");
    const btn = document.getElementById("btnEnterVR");
    if (btn) btn.textContent = "🥽 離開 VR";
    if (window.setDockStatus) window.setDockStatus("🥽 已進入 VR：你正站在大殿正中，抬頭可見神尊與千佛燈塔。");
  }

  onXRSessionEnd() {
    this.isXR = false;
    this.scene.add(this.camera);
    if (this.xrSaved) {
      this.camera.position.copy(this.xrSaved.position);
      this.camera.quaternion.copy(this.xrSaved.quaternion);
      this.controls.target.copy(this.xrSaved.target);
      if (this.avatar && this.avatar.playerGroup) this.avatar.playerGroup.visible = this.xrSaved.avatarVisible;
    }
    this.controls.enabled = true;
    this.controls.update();
    document.body.classList.remove("xr-active");
    const btn = document.getElementById("btnEnterVR");
    if (btn) btn.textContent = "🥽 VR";
  }
}

installTempleMixin(TempleXRMixin);

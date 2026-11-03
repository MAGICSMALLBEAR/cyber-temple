// avatar/relics.js - 護身與法器：開光靈符光環、八卦神鏡、九品蓮花座、步步生蓮、法器裝備

class AvatarRelicsMixin {
  // 構建開光平安符護身靈光環
  buildAmuletAura(amuletType) {
    if (this.limbs.amuletAura) {
      this.playerGroup.remove(this.limbs.amuletAura);
      this.limbs.amuletAura = null;
    }
    if (!amuletType) return;

    const auraGroup = new THREE.Group();
    auraGroup.position.set(0, 0.52, 0);

    const ringGeo = new THREE.TorusGeometry(0.48, 0.02, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    auraGroup.add(ring);

    // 8 顆金色靈動旋轉微粒
    const dotCount = 8;
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd700 })
      );
      dot.position.set(Math.cos(angle) * 0.48, 0, Math.sin(angle) * 0.48);
      auraGroup.add(dot);
    }

    this.playerGroup.add(auraGroup);
    this.limbs.amuletAura = auraGroup;
  }

  equipAmulet(amuletType) {
    this.equippedAmulet = amuletType;
    if (amuletType) {
      localStorage.setItem("temple_equipped_amulet", amuletType);
    } else {
      localStorage.removeItem("temple_equipped_amulet");
    }
    this.buildAmuletAura(amuletType);
  }

  // 構建浮空旋轉紫薇八卦神鏡
  buildBaguaMirror(enabled) {
    if (this.limbs.baguaMirror) {
      this.playerGroup.remove(this.limbs.baguaMirror);
      this.limbs.baguaMirror = null;
    }
    if (!enabled) return;

    const mirrorGroup = new THREE.Group();
    mirrorGroup.position.set(0.42, 1.15, -0.15);

    // 八角紅木/青銅外框
    const frameGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.025, 8);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8b3a1a, roughness: 0.6, metalness: 0.3 });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.rotation.x = Math.PI / 2;
    mirrorGroup.add(frameMesh);

    // 鏡心銀光青銅凹面
    const mirrorGeo = new THREE.CircleGeometry(0.12, 24);
    const mirrorMat = new THREE.MeshStandardMaterial({
      color: 0xe0f7fa,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x26c6da,
      emissiveIntensity: 0.35
    });
    const mirrorDisc = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirrorDisc.position.z = 0.015;
    mirrorGroup.add(mirrorDisc);

    // 太極陰陽金色靈珠
    const beadGeo = new THREE.SphereGeometry(0.03, 12, 12);
    const beadMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
    const bead = new THREE.Mesh(beadGeo, beadMat);
    bead.position.z = 0.025;
    mirrorGroup.add(bead);

    // 外圈金色靈光環
    const haloGeo = new THREE.TorusGeometry(0.21, 0.008, 6, 24);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.8 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    mirrorGroup.add(halo);

    this.playerGroup.add(mirrorGroup);
    this.limbs.baguaMirror = mirrorGroup;
  }

  // 構建琉璃九品蓮花座
  buildLotusThrone(show) {
    if (this.limbs.lotusThrone) {
      this.playerGroup.remove(this.limbs.lotusThrone);
      this.limbs.lotusThrone = null;
    }
    if (!show) return;

    const throneGroup = new THREE.Group();
    throneGroup.position.set(0, -0.05, 0);

    // 八角鎏金台座底盤
    const baseGeo = new THREE.CylinderGeometry(0.46, 0.52, 0.08, 8);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.75, roughness: 0.3 });
    const base = new THREE.Mesh(baseGeo, goldMat);
    base.position.y = 0.04;
    throneGroup.add(base);

    // 核心金色蓮蓬台
    const podGeo = new THREE.CylinderGeometry(0.32, 0.30, 0.06, 16);
    const podMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0xffa000, emissiveIntensity: 0.3 });
    const pod = new THREE.Mesh(podGeo, podMat);
    pod.position.y = 0.09;
    throneGroup.add(pod);

    // 12 瓣盛開粉紅琉璃蓮花花瓣
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xff80ab,
      roughness: 0.4,
      metalness: 0.15
    });
    const petalCount = 12;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petalGeo = new THREE.ConeGeometry(0.09, 0.24, 4);
      petalGeo.scale(1.2, 1, 0.35);
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(angle) * 0.38, 0.12, Math.sin(angle) * 0.38);
      petal.rotation.y = -angle + Math.PI / 2;
      petal.rotation.z = -0.35;
      throneGroup.add(petal);
    }

    // 座底柔和發光符陣光圈
    const glowGeo = new THREE.RingGeometry(0.2, 0.65, 24);
    glowGeo.rotateX(-Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffb74d,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.01;
    throneGroup.add(glow);

    this.playerGroup.add(throneGroup);
    this.limbs.lotusThrone = throneGroup;
  }

  // 步步生蓮踏蓮印記生成
  spawnLotusStepDecal() {
    if (!this.lotusDecalGeo) {
      this.lotusDecalGeo = new THREE.CircleGeometry(0.24, 16);
      this.lotusDecalGeo.rotateX(-Math.PI / 2);
    }
    if (!this.lotusDecalTex) {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.translate(32, 32);
      ctx.fillStyle = "rgba(255, 105, 180, 0.85)";
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 16, 7, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.rotate((Math.PI * 2) / 8);
      }
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd700";
      ctx.fill();
      this.lotusDecalTex = new THREE.CanvasTexture(canvas);
    }

    const mat = new THREE.MeshBasicMaterial({
      map: this.lotusDecalTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(this.lotusDecalGeo, mat);
    mesh.position.set(this.position.x, 0.02, this.position.z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(mesh);
    this.lotusDecals.push({ mesh, mat, life: 1.0 });
  }

  // 法器結緣裝備開關
  equipRelic(relicType, isEquipped) {
    this.relics[relicType] = isEquipped;

    if (relicType === "sword") {
      if (isEquipped) {
        this.relics["whisk"] = false;
        this.relics["calabash"] = false;
        this.config.holdingItem = "sword";
      } else {
        this.config.holdingItem = "incense";
      }
      this.buildAvatarMesh();
    } else if (relicType === "whisk") {
      if (isEquipped) {
        this.relics["sword"] = false;
        this.relics["calabash"] = false;
        this.config.holdingItem = "whisk";
      } else {
        this.config.holdingItem = "incense";
      }
      this.buildAvatarMesh();
    } else if (relicType === "calabash") {
      if (isEquipped) {
        this.relics["sword"] = false;
        this.relics["whisk"] = false;
        this.config.holdingItem = "calabash";
      } else {
        this.config.holdingItem = "incense";
      }
      this.buildAvatarMesh();
    } else if (relicType === "baguaMirror") {
      this.config.hasBaguaMirror = isEquipped;
      this.buildBaguaMirror(isEquipped);
    } else if (relicType === "lotusSteps") {
      this.config.hasLotusSteps = isEquipped;
    } else if (relicType === "lotusThrone") {
      this.config.hasLotusThrone = isEquipped;
      if (this.currentAction === "meditate") {
        this.buildLotusThrone(isEquipped);
      }
    }

    localStorage.setItem("temple_equipped_relics", JSON.stringify(this.relics));
    this.broadcastMyState(true);
  }
}

installAvatarMixin(AvatarRelicsMixin);

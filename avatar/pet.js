// avatar/pet.js - 隨身萌寵護法神獸：建模、切換、撫摸互動、跟隨動畫

class AvatarPetMixin {
  // 構建祥瑞萌寵護法神獸 3D 模型
  buildPetMesh(type) {
    this.petType = type || "none";
    this.petLimbs = {};

    // 清空舊寵物物件
    while (this.petGroup && this.petGroup.children.length > 0) {
      const child = this.petGroup.children[0];
      this.petGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    if (!this.petGroup || this.petType === "none") {
      if (this.petGroup) this.petGroup.visible = false;
      return;
    }
    this.petGroup.visible = true;

    if (this.petType === "tiger") {
      // 🐯 金虎爺大將軍：萌系金虎身形、額頭金印「王」、小翅膀、口銜金元寶、搖晃尾巴
      const goldFurMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
      const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
      const goldShinyMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
      const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 });
      const blackMat = new THREE.MeshBasicMaterial({ color: 0x18181b });

      // 1. 圓滾滾身軀
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), goldFurMat);
      body.scale.set(1.0, 0.85, 1.25);
      body.position.set(0, 0.24, 0);
      this.petGroup.add(body);

      // 白拋拋肚肚
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), bellyMat);
      belly.scale.set(0.85, 0.7, 1.1);
      belly.position.set(0, 0.18, 0.05);
      this.petGroup.add(belly);

      // 虎紋條紋 (左右兩側暗紋)
      [-0.18, 0.18].forEach(sx => {
        [-0.05, 0.08].forEach(sz => {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.02), stripeMat);
          stripe.position.set(sx, 0.26, sz);
          stripe.rotation.y = sx > 0 ? 0.3 : -0.3;
          this.petGroup.add(stripe);
        });
      });

      // 2. 圓滾滾大頭部
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), goldFurMat);
      head.position.set(0, 0.36, 0.2);
      this.petGroup.add(head);

      // 額頭金印「王」字
      const wangPlat = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.02), goldShinyMat);
      wangPlat.position.set(0, 0.46, 0.35);
      this.petGroup.add(wangPlat);

      // 圓滾滾虎耳朵 (外金內粉)
      [-0.11, 0.11].forEach(ex => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), goldFurMat);
        ear.position.set(ex, 0.48, 0.16);
        this.petGroup.add(ear);

        const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), pinkMat);
        innerEar.position.set(ex, 0.48, 0.19);
        this.petGroup.add(innerEar);
      });

      // 黑眼睛與黑鼻尖
      [-0.065, 0.065].forEach(ox => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), blackMat);
        eye.position.set(ox, 0.38, 0.36);
        this.petGroup.add(eye);
      });
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), blackMat);
      nose.position.set(0, 0.33, 0.38);
      this.petGroup.add(nose);

      // 口銜萬兩金元寶
      const yuanbaoGroup = new THREE.Group();
      const ybBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.065, 0.04, 10), goldShinyMat);
      const ybTop = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), goldShinyMat);
      ybTop.scale.set(1.4, 0.6, 0.8);
      ybTop.position.set(0, 0.025, 0);
      yuanbaoGroup.add(ybBase);
      yuanbaoGroup.add(ybTop);
      yuanbaoGroup.position.set(0, 0.28, 0.38);
      this.petGroup.add(yuanbaoGroup);

      // 祥雲小羽翼 (背後左右各一片白金翅膀)
      [-0.14, 0.14].forEach(wx => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.02), bellyMat);
        wing.position.set(wx, 0.38, -0.08);
        wing.rotation.z = wx > 0 ? -0.35 : 0.35;
        this.petGroup.add(wing);
      });

      // 4 隻短短萌爪
      [[-0.11, 0.1], [0.11, 0.1], [-0.11, -0.15], [0.11, -0.15]].forEach(([px, pz]) => {
        const paw = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.12, 8), goldFurMat);
        paw.position.set(px, 0.06, pz);
        this.petGroup.add(paw);
      });

      // 翹翹搖擺虎尾巴
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.22, 8), goldFurMat);
      tail.position.set(0, 0.3, -0.26);
      tail.rotation.x = -0.7;
      this.petGroup.add(tail);
      this.petLimbs.tail = tail;

    } else if (this.petType === "turtle") {
      // 🐢 九品金靈龜：翠玉金背甲、太極八卦雕紋、生機碧綠靈環
      const jadeMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.2 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.3 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xa7f3d0, roughness: 0.6 });
      const blackMat = new THREE.MeshBasicMaterial({ color: 0x111827 });

      // 1. 拱形玉甲
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), jadeMat);
      shell.scale.set(1.0, 0.55, 1.2);
      shell.position.set(0, 0.18, 0);
      this.petGroup.add(shell);

      // 金色甲邊緣
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.03, 8, 20), goldMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 0.12, 0);
      this.petGroup.add(rim);

      // 背上太極八卦浮印金環
      const baguaRing = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.11, 8), goldMat);
      baguaRing.rotation.x = -Math.PI / 2;
      baguaRing.position.set(0, 0.315, 0);
      this.petGroup.add(baguaRing);

      // 2. 探出的小龜頭
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), skinMat);
      head.position.set(0, 0.16, 0.3);
      this.petGroup.add(head);

      // 眼睛
      [-0.045, 0.045].forEach(ex => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), blackMat);
        eye.position.set(ex, 0.18, 0.36);
        this.petGroup.add(eye);
      });

      // 4 個扁扁划動槳足
      [[-0.18, 0.14], [0.18, 0.14], [-0.18, -0.14], [0.18, -0.14]].forEach(([fx, fz]) => {
        const flipper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.08), skinMat);
        flipper.position.set(fx, 0.08, fz);
        flipper.rotation.y = fx > 0 ? 0.4 : -0.4;
        this.petGroup.add(flipper);
      });

      // 短尾巴
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 8), skinMat);
      tail.rotation.x = -Math.PI / 2;
      tail.position.set(0, 0.12, -0.3);
      this.petGroup.add(tail);

      // 懸浮聚氣綠光環
      const aura = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.015, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.7 })
      );
      aura.rotation.x = Math.PI / 2;
      aura.position.set(0, 0.34, 0);
      this.petGroup.add(aura);
      this.petLimbs.aura = aura;

    } else if (this.petType === "rabbit") {
      // 🐰 廣寒玉兔：通體雪白泛光、長長耳廓、小搗藥杵臼、紅寶石眼睛
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.5 });
      const redEyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.7 });

      // 1. 胖胖雪白兔身
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 14), whiteMat);
      body.scale.set(0.95, 1.15, 1.1);
      body.position.set(0, 0.22, 0);
      this.petGroup.add(body);

      // 圓滾滾頭部
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), whiteMat);
      head.position.set(0, 0.38, 0.14);
      this.petGroup.add(head);

      // 長長的兔耳朵 (豎立微晃)
      [-0.07, 0.07].forEach(ex => {
        const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 0.25, 8), whiteMat);
        ear.position.set(ex, 0.58, 0.1);
        ear.rotation.z = ex > 0 ? -0.15 : 0.15;
        this.petGroup.add(ear);

        const innerEar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.01), innerEarMat);
        innerEar.position.set(ex, 0.58, 0.125);
        this.petGroup.add(innerEar);
      });

      // 紅寶石眼睛與粉鼻
      [-0.06, 0.06].forEach(ox => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), redEyeMat);
        eye.position.set(ox, 0.4, 0.27);
        this.petGroup.add(eye);
      });
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), innerEarMat);
      nose.position.set(0, 0.35, 0.29);
      this.petGroup.add(nose);

      // 雙手捧著小長生藥臼與搗藥杵
      const mortar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.08, 10), woodMat);
      mortar.position.set(0, 0.18, 0.26);
      this.petGroup.add(mortar);

      const pestle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.11, 8), woodMat);
      pestle.position.set(0.02, 0.22, 0.26);
      pestle.rotation.z = 0.3;
      this.petGroup.add(pestle);

      // 4 隻兔爪
      [[-0.08, 0.1], [0.08, 0.1], [-0.09, -0.08], [0.09, -0.08]].forEach(([px, pz]) => {
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), whiteMat);
        foot.position.set(px, 0.05, pz);
        this.petGroup.add(foot);
      });

      // 圓滾滾毛球尾巴
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), whiteMat);
      tail.position.set(0, 0.18, -0.22);
      this.petGroup.add(tail);
    }
  }

  // 切換萌寵護法
  setPetType(type) {
    this.petType = type;
    localStorage.setItem("temple_active_pet", type);
    this.buildPetMesh(type);
  }

  // 撫摸萌寵互動 (Petting Interaction)
  interactWithPet() {
    if (this.petType === "none") return null;
    this.petJumpTimer = 1.0;
    this.spawnPetSparks();
    if (window.templeAudio) {
      window.templeAudio.playPetPurr(this.petType);
    }
    const petNames = {
      tiger: "🐯 金虎爺大將軍",
      turtle: "🐢 九品金靈龜",
      rabbit: "🐰 廣寒玉兔"
    };
    return {
      type: this.petType,
      name: petNames[this.petType] || "祥瑞萌寵",
      merits: 36
    };
  }

  // 萌寵歡欣金幣愛心微粒
  spawnPetSparks() {
    for (let i = 0; i < 7; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: this.petType === "tiger" ? 0xffd700 : (this.petType === "turtle" ? 0x34d399 : 0xf472b6),
        transparent: true,
        opacity: 0.95
      });
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), sparkMat);
      spark.position.copy(this.petGroup.position).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        0.2 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.35
      ));
      this.scene.add(spark);
      this.petSparks.push({
        mesh: spark,
        vy: 0.02 + Math.random() * 0.025,
        vx: (Math.random() - 0.5) * 0.015,
        vz: (Math.random() - 0.5) * 0.015,
        life: 1.0
      });
    }
  }

  // 萌寵每影格跟隨與動作更新
  updatePet(time, dt) {
    if (this.petType === "none" || !this.petGroup || !this.petGroup.visible) return;

    // 計算分身背後的目標站位 (身後約 1.1m，略偏右側 0.42m)
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerGroup.rotation.y);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerGroup.rotation.y);
    const targetPetPos = this.position.clone()
      .sub(forward.clone().multiplyScalar(1.05))
      .add(right.clone().multiplyScalar(0.42));
    targetPetPos.y = 0.02;

    // 平滑追隨分身位置
    this.petPos.lerp(targetPetPos, 0.12);

    // 萌寵朝向：朝向分身或行進方向
    const toPlayer = new THREE.Vector3().subVectors(this.position, this.petPos);
    toPlayer.y = 0;
    if (toPlayer.lengthSq() > 0.01) {
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      this.petGroup.rotation.y = THREE.MathUtils.lerp(this.petGroup.rotation.y, targetAngle, 0.15);
    }

    // 動作動畫調制
    let bob = 0;
    if (this.petJumpTimer > 0) {
      // 撫摸跳躍翻滾特效
      this.petJumpTimer -= dt * 2.2;
      const jumpNorm = Math.max(0, this.petJumpTimer);
      bob = Math.sin((1 - jumpNorm) * Math.PI) * 0.42;
      this.petGroup.rotation.y += dt * 10.0;
    } else if (this.isMoving) {
      // 跟隨奔跑顛簸小跳
      const hopFreq = (this.isSprinting || this.keys.shift) ? 14 : 9;
      bob = Math.abs(Math.sin(time * hopFreq)) * 0.11;
    } else {
      // 原地呼吸微動
      bob = Math.sin(time * 2.5) * 0.015;
    }

    this.petGroup.position.set(this.petPos.x, targetPetPos.y + bob, this.petPos.z);

    // 虎尾巴搖擺
    if (this.petLimbs.tail) {
      this.petLimbs.tail.rotation.y = Math.sin(time * 7) * 0.35;
    }
    // 靈龜光環自轉
    if (this.petLimbs.aura) {
      this.petLimbs.aura.rotation.z += 0.03;
    }

    // 更新萌寵金幣愛心微粒
    for (let i = this.petSparks.length - 1; i >= 0; i--) {
      const sp = this.petSparks[i];
      sp.life -= dt * 1.5;
      sp.mesh.position.y += sp.vy;
      sp.mesh.position.x += sp.vx;
      sp.mesh.position.z += sp.vz;
      sp.mesh.material.opacity = Math.max(0, sp.life);
      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        sp.mesh.material.dispose();
        this.petSparks.splice(i, 1);
      }
    }
  }
}

installAvatarMixin(AvatarPetMixin);

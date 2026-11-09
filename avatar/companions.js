// avatar/companions.js - 同殿的其他人：真人連線的同行分身（BroadcastChannel／SSE 同步）與廟內 NPC 善信

class AvatarCompanionsMixin {
  // 生成遍布三進廟宇各處的同行 NPC 善信 (沉浸式寧靜零社交同在氛圍)
  spawnQuietCompanions() {
    const companionPresets = [
      { name: "淡淡的月光", color: 0x8a3818, pos: [-1.4, 0, 1.2], action: "meditate" }, // 大殿後方蒲團
      { name: "靜心的雲", color: 0x2d4875, pos: [1.4, 0, 1.2], action: "pray" }, // 大殿供桌旁
      { name: "虔誠香客小美", color: 0xc24b2b, pos: [0, 0, 9.6], action: "bow" }, // 天公爐前
      { name: "池畔許願小哥", color: 0x2e7d32, pos: [11.2, 0, 13.5], action: "pray" }, // 東進蓮花池拱橋前
      { name: "長廊寫願學長", color: 0x6a1b9a, pos: [-12.2, 0, 8.5], action: "meditate" }, // 西進祈願長廊
      { name: "山門迎客道長", color: 0xd4a034, pos: [-2.2, 0, 36.5], action: "bow" }, // 巍峨山門前
      { name: "樹下祈願阿嬤", color: 0x7a4a8a, pos: [-5.6, 0, 19.6], action: "pray" }, // 祈願樹旁
      { name: "泉邊靜心少年", color: 0x2f7a8a, pos: [3.6, 0, 18.6], action: "meditate" }, // 蓮心淨泉旁
      { name: "賣地瓜球的阿姨", color: 0xb8622c, pos: [-15.5, 0, 33.6], action: "bow" }, // 美食街攤後
      { name: "茶攤老闆", color: 0x5a4a30, pos: [12.5, 0, 33.6], action: "bow" }, // 美食街攤後
      { name: "逛夜市的小情侶", color: 0xc24b7a, pos: [-11, 0, 37.2], action: "pray" }, // 美食街前
      { name: "來還願的學生", color: 0x3a5a9a, pos: [-8.2, 0, 9.4], action: "bow" } // 神位小龕前
    ];

    companionPresets.forEach(p => {
      const npcGroup = new THREE.Group();
      npcGroup.position.set(...p.pos);

      // 蒲團
      const matMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.32, 0.06, 16),
        new THREE.MeshStandardMaterial({ color: 0x822020 })
      );
      matMesh.position.y = 0.03;
      npcGroup.add(matMesh);

      // 身形
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.28, 0.45, 12),
        new THREE.MeshStandardMaterial({ color: p.color })
      );
      body.position.y = 0.32;
      npcGroup.add(body);

      // 頭部
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffdfc4 })
      );
      head.position.y = 0.68;
      npcGroup.add(head);

      // 稱號
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "rgba(20, 5, 5, 0.8)";
      ctx.strokeStyle = "#cba260";
      ctx.lineWidth = 2;
      ctx.roundRect(10, 10, 236, 44, 20);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e0cb9d";
      ctx.font = "bold 20px 'Noto Serif TC', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.name, 128, 32);

      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
      sprite.position.set(0, 1.1, 0);
      sprite.scale.set(0.75, 0.2, 1);
      npcGroup.add(sprite);

      this.scene.add(npcGroup);
      this.npcs.push({ group: npcGroup, action: p.action, offset: Math.random() * 5 });
    });
  }

  // ==========================================
  // 多人同殿連線分身系統 (Multiplayer Peers Sync)
  // ==========================================

  initMultiplayerPeers() {
    // 背景分頁不繪圖時仍維持真人連線。
    // 背景分頁暫停繪圖時，固定每 2 秒強制送心跳（非強制會因「距上次不足 1.8 秒」被跳過，間隔可能拉長到近 4 秒）
    setInterval(() => { if (document.hidden) this.broadcastMyState(true); }, 2000);
    if (this.channel) {
      this.channel.addEventListener("message", (event) => {
        const data = event.data;
        if (!data) return;

        if (data.type === "PEER_AVATAR_UPDATE") {
          if (data.id === this.myPeerId) return;
          this.handlePeerUpdate(data);
        } else if (data.type === "PEER_AVATAR_LEAVE") {
          this.removePeer(data.id);
        } else if (data.type === "PEER_AVATAR_HELLO") {
          if (data.id !== this.myPeerId) {
            this.broadcastMyState(true);
          }
        }
      });

      // 入殿時向全頻道打招呼，請求既有信眾同步
      this.channel.postMessage({ type: "PEER_AVATAR_HELLO", id: this.myPeerId });
    }

    // 關閉頁面會先觸發 visibilitychange 的「背景」心跳，對方會以 120 秒逾時保留分身，必須明確告知離開。
    window.addEventListener("pagehide", () => this.announceLeave());
    window.addEventListener("pageshow", (e) => {
      if (!e.persisted) return;
      this.hasLeft = false;
      this.broadcastMyState(true);
    });

    // 有即時伺服器時才用 SSE 跨裝置同步（偵測結果見 live-wall.js 的 window.templeServer）
    const serverReady = window.templeServer ? window.templeServer.ready : Promise.resolve(false);
    serverReady.then(ok => {
      if (!ok) return;
      try {
        const evtSource = new EventSource("/api/events");
        evtSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data) return;
            if (data.type === "PEER_AVATAR_UPDATE" && data.id !== this.myPeerId) {
              this.handlePeerUpdate(data);
            } else if (data.type === "PEER_AVATAR_LEAVE") {
              this.removePeer(data.id);
            }
          } catch (e) {}
        };
      } catch (err) {}
    });
  }

  // 告知同行本機已離開：同瀏覽器走 BroadcastChannel，跨裝置走伺服器；sendBeacon 在頁面關閉時仍送得出去
  announceLeave() {
    this.hasLeft = true;
    const msg = { type: "PEER_AVATAR_LEAVE", id: this.myPeerId };
    if (this.channel) this.channel.postMessage(msg);
    if (window.templeServer && window.templeServer.available && navigator.sendBeacon) {
      navigator.sendBeacon("/api/broadcast", new Blob([JSON.stringify(msg)], { type: "application/json" }));
    }
  }

  // 廣播本機角色狀態
  broadcastMyState(force = false) {
    // 離開後不再送心跳，否則晚到的心跳會讓對方把分身建回來
    if (this.hasLeft) return;
    const now = performance.now();
    const posDist = this.position.distanceTo(this.lastBroadcastPos);

    // 平滑節流：非強迫更新時，每 120ms 且位移大於 0.04m 或每 1.8 秒送心跳
    if (!force) {
      if (now - this.lastBroadcastTime < 120) return;
      if (posDist < 0.04 && (now - this.lastBroadcastTime < 1800)) return;
    }

    this.lastBroadcastTime = now;
    this.lastBroadcastPos.copy(this.position);

    const payload = {
      type: "PEER_AVATAR_UPDATE",
      id: this.myPeerId,
      config: this.config,
      pos: [
        parseFloat(this.position.x.toFixed(3)),
        parseFloat(this.position.y.toFixed(3)),
        parseFloat(this.position.z.toFixed(3))
      ],
      rot: parseFloat(this.playerGroup.rotation.y.toFixed(3)),
      action: this.currentAction,
      ritual: { carry: this.ritualCarry || "", items: this.ritualItems || [], motion: this.ritualMotion || null },
      emote: this.emote,
      speech: this.speech,
      hidden: document.hidden,
      timestamp: Date.now()
    };

    if (this.channel) {
      this.channel.postMessage(payload);
    }

    // 有即時伺服器時，向後端發送廣播 (供不同電腦/手機同頻)
    if (window.templeServer && window.templeServer.available) {
      fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }
  }

  // 處理收到的同行分身狀態
  handlePeerUpdate(data) {
    let peer = this.peers.get(data.id);
    if (!peer) {
      peer = this.createPeerAvatarMesh(data.config || {}, data.id);
      this.peers.set(data.id, peer);

      if (window.templeAudio) {
        window.templeAudio.playBell(720);
      }
      const title = (data.config && data.config.title) ? data.config.title : "善信";
      if (document.getElementById("dockStatusBar")) {
        document.getElementById("dockStatusBar").innerText = `✨ 善信【${title}】已踏入大殿，同頻共修！`;
      }
    }

    // 對方換了造型：重建分身（保留位置與朝向）
    const cfgKey = JSON.stringify(data.config || {});
    if (peer.configKey !== undefined && peer.configKey !== cfgKey) {
      const keep = { pos: peer.group.position.clone(), rot: peer.group.rotation.y, emote: peer.lastEmoteT };
      clearSpeechBubble(peer, peer.group);
      if (typeof disposeRitualProps === "function") disposeRitualProps(peer);
      this.scene.remove(peer.group);
      const rebuilt = this.createPeerAvatarMesh(data.config || {}, data.id);
      rebuilt.group.position.copy(keep.pos);
      rebuilt.group.rotation.y = keep.rot;
      rebuilt.lastEmoteT = keep.emote;
      this.peers.set(data.id, rebuilt);
      peer = rebuilt;
    }
    peer.configKey = cfgKey;

    peer.targetPos.set(data.pos[0], data.pos[1], data.pos[2]);
    peer.targetRot = data.rot;
    peer.action = data.action || "idle";
    if (typeof normalizeRitualState === "function") {
      const ritual = normalizeRitualState(data.ritual); peer.ritualCarry = ritual.carry; peer.ritualItems = ritual.items; peer.ritualMotion = ritual.motion;
    }
    peer.lastSeen = performance.now();
    peer.hidden = data.hidden === true;
    if (data.speech && typeof data.speech.id === "string" && data.speech.id !== peer.lastSpeechId) {
      peer.lastSpeechId = data.speech.id;
      showSpeechBubble(peer, peer.group, data.speech, data.config?.title);
    }
    if (data.emote && AVATAR_EMOTES[data.emote.id] && data.emote.t !== peer.lastEmoteT) {
      peer.lastEmoteT = data.emote.t;
      if (Date.now() - data.emote.t < EMOTE_SECONDS * 1000) showEmoteBubble(peer, peer.group, data.emote.id);
    }
  }

  // 構建連線信眾 3D 模型
  createPeerAvatarMesh(cfg, id) {
    const peerGroup = new THREE.Group();
    peerGroup.name = `peer_${id}`;

    const robeColor = cfg.robeColor || "#3a7bd5";
    const skinMat = new THREE.MeshStandardMaterial({ color: avatarSkinColor(cfg), roughness: 0.6 });
    const robeMat = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7 });

    // 軀幹
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.55, 16), robeMat);
    torso.position.y = 0.52;
    torso.castShadow = true;
    peerGroup.add(torso);

    // 腰帶
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.08, 16), goldMat);
    belt.position.y = 0.52;
    peerGroup.add(belt);

    // 頭部
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), skinMat);
    head.position.y = 0.96;
    head.castShadow = true;
    peerGroup.add(head);

    // 臉部
    head.add(createAvatarFaceMesh(this.createFaceTexture(cfg)));

    // 髮型（對方的捏臉設定）與頭飾 (布條或道冠)
    buildAvatarHair(head, cfg);
    if (cfg.hatType === "headband") {
      const hb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.245, 0.245, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4 })
      );
      hb.position.y = 1.0;
      peerGroup.add(hb);
    } else if (cfg.hatType === "bun") {
      const bun = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x221111 })
      );
      bun.position.set(0, 1.22, -0.06);
      peerGroup.add(bun);
    }

    // 雙臂與雙腿
    const limbMat = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.5 });
    const armGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.42, 12);
    const legGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.45, 12);

    const armL = new THREE.Mesh(armGeo, limbMat);
    armL.position.set(-0.31, 0.52, 0);
    peerGroup.add(armL);

    const armR = new THREE.Mesh(armGeo, limbMat);
    armR.position.set(0.31, 0.52, 0);
    peerGroup.add(armR);

    const legL = new THREE.Mesh(legGeo, limbMat);
    legL.position.set(-0.13, 0.22, 0);
    peerGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, limbMat);
    legR.position.set(0.13, 0.22, 0);
    peerGroup.add(legR);
    dressAvatar(peerGroup, { head, legs: [{ obj: legL, mesh: legL, footY: -0.22 }, { obj: legR, mesh: legR, footY: -0.22 }] }, cfg);

    // 手持物（參拜道具顯示時可暫時隱藏，不改原本的換裝設定）
    const normalHeldGroup = new THREE.Group(); peerGroup.add(normalHeldGroup);
    if (cfg.holdingItem === "incense") {
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.35, 6),
        new THREE.MeshBasicMaterial({ color: 0x7a3015 })
      );
      stick.position.set(0, 0.72, 0.28);
      stick.rotation.x = -Math.PI / 6;
      normalHeldGroup.add(stick);

      const ember = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xff3300 })
      );
      ember.position.set(0, 0.88, 0.37);
      normalHeldGroup.add(ember);
    }

    // 浮動頭銜標籤 (綠色在線同頻標誌)
    buildChestAmulet(torso, cfg.amuletType);
    const titleSprite = this.createPeerTitleSprite(cfg.title || "善信");
    titleSprite.position.set(0, 1.48, 0);
    peerGroup.add(titleSprite);

    this.scene.add(peerGroup);

    return {
      group: peerGroup,
      limbs: { torso, head, armL, armR, legL, legR, heldObject: normalHeldGroup },
      targetPos: new THREE.Vector3(0, 0, 4.0),
      targetRot: 0,
      action: "idle",
      actionProgress: 0,
      lastSeen: performance.now(),
      config: cfg
    };
  }

  // 繪製連線同道善信頭頂標籤 (帶在線光點)
  createPeerTitleSprite(titleText) {
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");

    // 半透明背景
    ctx.fillStyle = "rgba(10, 16, 26, 0.75)";
    ctx.roundRect(16, 16, 352, 64, 20);
    ctx.fill();

    ctx.strokeStyle = "rgba(76, 175, 80, 0.7)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 綠色在線同頻指示光點
    ctx.fillStyle = "#4caf50";
    ctx.beginPath();
    ctx.arc(42, 48, 7, 0, Math.PI * 2);
    ctx.fill();

    // 標題文字
    ctx.font = "bold 26px 'Noto Serif TC', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText(`${titleText}`, 62, 57);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.2, 0.3, 1);
    return sprite;
  }

  // 移除斷線分身
  removePeer(id) {
    const peer = this.peers.get(id);
    if (peer) {
      if (typeof disposeRitualProps === "function") disposeRitualProps(peer);
      clearSpeechBubble(peer, peer.group);
      this.scene.remove(peer.group);
      this.peers.delete(id);
    }
  }

  // 更新所有同行分身位移與動作動畫
  updatePeers(time, dt) {
    const now = performance.now();

    this.peers.forEach((peer, id) => {
      // 超過 10 秒未收心跳則淡出移除
      if (now - peer.lastSeen > (peer.hidden ? 120000 : 10000)) {
        this.removePeer(id);
        return;
      }

      // 平滑位移插值 (Lerp)
      peer.group.position.lerp(peer.targetPos, 0.22);

      // 平滑旋轉插值
      let curRot = peer.group.rotation.y;
      let diffRot = peer.targetRot - curRot;
      while (diffRot < -Math.PI) diffRot += Math.PI * 2;
      while (diffRot > Math.PI) diffRot -= Math.PI * 2;
      peer.group.rotation.y += diffRot * 0.22;

      // 肢體動畫驅動
      // 與自己的分身一樣，先算姿勢起伏，再疊回墊面／橋面的高度。
      peer.group.position.y = 0;
      this.animatePeerLimbs(peer, time, dt);
      peer.group.position.y += peer.targetPos.y;
    });
  }

  // 動態更新同頻分身肢體動畫
  animatePeerLimbs(peer, time, dt) {
    const limbs = peer.limbs;
    if (!limbs || !limbs.armL) return;
    if (typeof resetRitualPoseFor === "function") resetRitualPoseFor(peer, limbs);
    updateEmoteBubble(peer, peer.group);
    updateSpeechBubble(peer, peer.group);

    if (peer.action !== peer.lastPoseAction) {
      resetAvatarPose(limbs, peer.group);
      peer.lastPoseAction = peer.action;
    }

    if (animateExpressiveAction(limbs, peer.group, peer.action, time)) {
      // 對方正在做表情動作
    } else if (peer.action === "walk") {
      const walkCycle = time * 8;
      limbs.legL.rotation.x = Math.sin(walkCycle) * 0.55;
      limbs.legR.rotation.x = -Math.sin(walkCycle) * 0.55;
      limbs.armL.rotation.x = -Math.sin(walkCycle) * 0.45;
      limbs.armR.rotation.x = Math.sin(walkCycle) * 0.45;
      peer.group.position.y = Math.abs(Math.sin(walkCycle)) * 0.04;
      limbs.torso.rotation.x = 0.08;
    } else if (peer.action === "bow") {
      peer.actionProgress += dt * 2.5;
      const bowAngle = Math.sin(peer.actionProgress * Math.PI) * 0.55;
      limbs.torso.rotation.x = bowAngle;
      limbs.head.rotation.x = bowAngle * 0.5;
      if (peer.actionProgress >= 1) peer.action = "idle";
    } else if (peer.action === "kneel") {
      peer.actionProgress += dt * 1.8;
      const kneelPhase = Math.sin(peer.actionProgress * Math.PI);
      peer.group.position.y = -kneelPhase * 0.35;
      limbs.torso.rotation.x = kneelPhase * 0.8;
      limbs.head.rotation.x = kneelPhase * 0.5;
      if (peer.actionProgress >= 1) peer.action = "idle";
    } else if (peer.action === "pray") {
      limbs.armL.rotation.set(-1.1, 0.7, 0);
      limbs.armR.rotation.set(-1.1, -0.7, 0);
      limbs.torso.rotation.x = 0.12;
    } else if (peer.action === "meditate") {
      peer.group.position.y = -0.32;
      limbs.armL.rotation.set(-0.5, 0.5, 0);
      limbs.armR.rotation.set(-0.5, -0.5, 0);
      limbs.torso.rotation.x = 0;
    } else {
      // idle 自然呼吸
      limbs.legL.rotation.x = 0;
      limbs.legR.rotation.x = 0;
      limbs.armL.rotation.set(0, 0, Math.sin(time * 2) * 0.03);
      limbs.armR.rotation.set(0, 0, -Math.sin(time * 2) * 0.03);
      limbs.torso.rotation.x = 0;
    }
    if (typeof animateRitualPropsFor === "function") animateRitualPropsFor(peer, limbs, peer.group, peer.action, time, !!window.templeMotion?.reduced);
    if (typeof animateRainGearFor === "function") animateRainGearFor(peer, limbs, peer.group, peer.action, peer.config, time, !!window.templeMotion?.reduced);
  }
}

installAvatarMixin(AvatarCompanionsMixin);

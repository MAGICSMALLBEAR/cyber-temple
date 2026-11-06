// 使用真實 Three.js 向量與攝影機運算，不建立 WebGL 或開啟瀏覽器。
const fs = require("fs");
const path = require("path");
const vm = require("vm");

module.exports = {
  name: "鏡頭相對移動（無 3D 繪圖）",
  async run({ check }) {
    const THREE = await import("three");
    const windowEvents = new Map(), documentEvents = new Map();
    const add = (map, name, fn) => { if (!map.has(name)) map.set(name, []); map.get(name).push(fn); };
    const document = { hidden: false, addEventListener: (n, fn) => add(documentEvents, n, fn), querySelectorAll: () => [] };
    const context = vm.createContext({ THREE, performance, document,
      window: { addEventListener: (n, fn) => add(windowEvents, n, fn) },
      updateEmoteBubble() {}, updateSpeechBubble() {} });
    for (const file of ["avatar/core.js", "scene/core.js", "joystick.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context, { filename: file });
    const Avatar = context.window.TempleAvatarSystem, Scene = context.window.Temple3DScene;
    const make = (cameraAt = [0, 3, 8]) => {
      const a = Object.create(Avatar.prototype);
      a.camera = new THREE.PerspectiveCamera(); a.camera.position.set(...cameraAt); a.camera.lookAt(0, 0, 0);
      a.position = new THREE.Vector3(0, 0, 10); a.playerGroup = new THREE.Group(); a.scene = {};
      a.keys = { forward: false, backward: false, left: false, right: false, shift: false };
      a.baseSpeed = 3.2; a.sprintSpeed = 6.2; a.isSprinting = false;
      a.currentAction = "idle"; a.limbs = {}; a.npcs = []; a.lotusDecals = [];
      a.targetMarker = { material: { opacity: 0 }, scale: new THREE.Vector3() };
      a.broadcastMyState = a.updatePet = a.animateLimbs = a.updatePeers = () => {};
      return a;
    };
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    const poses = [
      ["從南向北看", [0, 3, 8], new THREE.Vector3(0, 0, -1)],
      ["鏡頭轉到北側", [0, 3, -8], new THREE.Vector3(0, 0, 1)],
      ["鏡頭轉到東側", [8, 3, 0], new THREE.Vector3(-1, 0, 0)],
      ["鏡頭轉到西側", [-8, 3, 0], new THREE.Vector3(1, 0, 0)],
      ["斜向俯視", [8, 9, 8], new THREE.Vector3(-1, 0, -1).normalize()]
    ];
    for (const [name, at, forward] of poses) {
      const a = make(at); a.keys.forward = true;
      check(`${name}：前進朝畫面裡`, a.getManualMoveDirection().normalize().dot(forward) > 0.999);
      a.keys.forward = false; a.keys.backward = true;
      check(`${name}：後退方向相反`, a.getManualMoveDirection().normalize().dot(forward) < -0.999);
      a.keys.backward = false; a.keys.right = true;
      check(`${name}：右移朝畫面右側`, a.getManualMoveDirection().normalize().dot(forward.clone().cross(new THREE.Vector3(0, 1, 0))) > 0.999);
    }
    const top = make([0, 10, 0]); top.keys.forward = true;
    check("垂直鳥瞰仍可移動", near(top.getManualMoveDirection().length(), 1));
    const first = make(); first.camera.position.set(0, 1.05, 0); first.camera.lookAt(8, 1.05, 0); first.keys.forward = true;
    check("第一人稱依視線前進", first.getManualMoveDirection().x > 0.999);

    const diagonal = make(); diagonal.keys.forward = diagonal.keys.right = true; diagonal.update(0.1);
    check("斜走不會比直走快", near(diagonal.position.distanceTo(new THREE.Vector3(0, 0, 10)), 0.32));
    const opposite = make(); opposite.keys.forward = opposite.keys.backward = true; opposite.update(0.1);
    check("同時前進後退會停下", near(opposite.position.z, 10) && !opposite.isMoving);
    const rotate = make(); rotate.playerGroup.rotation.y = Math.PI - 0.01; rotate.keys.forward = true; rotate.update(1 / 60);
    check("跨過正負 180 度時沿最短方向轉身", Math.abs(rotate.playerGroup.rotation.y - (Math.PI - 0.01)) < 0.02);
    const arrive = make([8, 3, 0]); arrive.isSprinting = true; arrive.targetPos = new THREE.Vector3(0, 0, 10.15); arrive.update(0.1);
    check("低幀率疾行不會跨過目的地", near(arrive.position.z, 10.15));
    arrive.update(0.1);
    check("抵達目的地後停止，沒有前後抖動", arrive.targetPos === null && !arrive.isMoving);
    const blocked = make(); blocked.keys.forward = true; blocked.isBlockedAt = (x, z) => z < 9.9; blocked.update(0.1);
    check("鏡頭相對移動仍遵守碰撞", near(blocked.position.z, 10));

    const input = make(); input.bindInputEvents();
    const emitKey = (code, target = { tagName: "BODY" }) => {
      const e = { code, target, preventDefault() { this.prevented = true; } };
      windowEvents.get("keydown").forEach(fn => fn(e)); return e;
    };
    emitKey("KeyW"); emitKey("ShiftLeft");
    check("按鍵可啟動前進與疾行", input.keys.forward && input.keys.shift);
    windowEvents.get("blur").forEach(fn => fn()); input.update(0.1);
    check("離開視窗會放開按鍵，回來不會自行走動", !Object.values(input.keys).some(Boolean) && !input.isMoving);
    emitKey("KeyS"); document.hidden = true; documentEvents.get("visibilitychange").forEach(fn => fn());
    check("隱藏分頁也會清除移動輸入", !input.keys.backward);
    emitKey("KeyW", { tagName: "SELECT" }); emitKey("KeyW", { tagName: "DIV", isContentEditable: true });
    check("操作選單或編輯文字不會移動角色", !input.keys.forward);
    check("方向鍵不會捲動整個頁面", emitKey("ArrowUp").prevented === true);

    const touch = make([8, 3, 0]); context.window.temple3d = { avatar: touch };
    const joystick = context.window.mobileJoystick; joystick.knob = { style: {} };
    joystick.updateKnob(0, -45);
    check("搖桿向上也依鏡頭方向前進", touch.getManualMoveDirection().x < -0.999);
    joystick.updateKnob(0, 45);
    check("搖桿向下與前進相反", touch.getManualMoveDirection().x > 0.999);
    joystick.reset();
    check("放開搖桿會停止移動", touch.getManualMoveDirection().lengthSq() === 0);

    for (const [name, at] of poses) {
      const a = make(at), t = Object.create(Scene.prototype);
      t.avatar = a; t.camera = a.camera; t.controls = { target: new THREE.Vector3() };
      a.keys.forward = true; const wanted = a.getManualMoveDirection().clone();
      t.resumeCameraFollow();
      a.camera.position.copy(t.targetCameraPos); a.camera.lookAt(t.targetLookAt);
      check(`${name}：遠景切回隨行不會反轉前進方向`, a.getManualMoveDirection().normalize().dot(wanted.normalize()) > 0.999);
    }
  }
};

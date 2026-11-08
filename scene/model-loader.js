// scene/model-loader.js - 依 models/manifest.json 載入 .glb 模型
// 場景建好後才在背景載入，不拖慢開場；任何一筆失敗都保留原本的程式模型，遊戲照常運作。
// 使用方式見 models/README.md。

const MODEL_MANIFEST_URL = "models/manifest.json";
const MODEL_FILE_PATTERN = /^[A-Za-z0-9][\w.-]*\.glb$/;   // 只接受 models/ 底下的檔名，不接受路徑或網址
const MODEL_TRIANGLE_WARNING = 100000;

class TempleModelMixin {
  async loadTempleModels() {
    this.templeModels = [];
    this.deityModelMap = new Map();
    if (!THREE.GLTFLoader) return;
    let entries;
    try {
      const res = await fetch(MODEL_MANIFEST_URL, { cache: "no-cache" });
      if (!res.ok) return;
      entries = (await res.json())?.models;
    } catch (e) {
      console.warn("模型清單讀取失敗，使用原本的程式模型：", e.message);
      return;
    }
    if (!Array.isArray(entries) || !entries.length) return;

    const loader = this.templeModelLoader = new THREE.GLTFLoader();
    // 神像只在供奉那尊時才下載：先把神像清單記下來，物件模型照常依序載入
    this.deityModelEntries = new Map();
    this.deityModelLoads = new Map();
    const records = entries.map(entry => {
      const record = { file: entry?.file, status: "pending", error: "" };
      this.templeModels.push(record);
      if (entry?.deity && typeof entry.deity === "string") {
        if (!MODEL_FILE_PATTERN.test(entry.file || "")) {
          record.status = "failed";
          record.error = "檔名不合法，只能是 models 資料夾裡的 .glb";
          console.warn(`模型 ${entry.file} 未載入：${record.error}`);
        } else if (this.deityModelEntries.has(entry.deity)) {
          record.status = "failed";
          record.error = `神尊 ${entry.deity} 已有模型，同一尊只用第一筆`;
          console.warn(`模型 ${entry.file} 未載入：${record.error}`);
        } else {
          record.status = "deferred";
          this.deityModelEntries.set(entry.deity, { entry, record });
        }
      }
      return { entry, record };
    });
    // 目前供奉的神像最顯眼，排在物件模型之前
    await this.ensureDeityModel(this.deityModel?.userData.deity);

    // 依序載入，避免手機同時解析多個大檔
    for (const { entry, record } of records) {
      if (entry?.deity && typeof entry.deity === "string") continue;
      try {
        const holder = await this.placeTempleModel(loader, entry);
        record.status = "loaded";
        record.object = holder;
      } catch (e) {
        record.status = "failed";
        record.error = e.message;
        console.warn(`模型 ${entry?.file} 未載入，保留原本的程式模型：${e.message}`);
      }
    }
    if (this.templeModels.some(m => m.status === "loaded" && !m.deity)) this.buildCollisionMap?.();
  }

  // 下載指定神尊的模型；同一尊只下載一次，失敗也不重試（保留程式神像）
  ensureDeityModel(id) {
    const item = this.deityModelEntries?.get(id);
    if (!item || !this.templeModelLoader) return Promise.resolve(null);
    if (!this.deityModelLoads.has(id)) {
      const { entry, record } = item;
      record.status = "loading";
      record.deity = id;
      this.deityModelLoads.set(id, this.placeTempleModel(this.templeModelLoader, entry).then(holder => {
        record.status = "loaded";
        record.object = holder;
        return holder;
      }, e => {
        record.status = "failed";
        record.error = e.message;
        console.warn(`神像模型 ${entry.file} 未載入，保留原本的程式神像：${e.message}`);
        return null;
      }));
    }
    return this.deityModelLoads.get(id);
  }

  async placeTempleModel(loader, entry) {
    if (!entry || !MODEL_FILE_PATTERN.test(entry.file || "")) throw new Error("檔名不合法，只能是 models 資料夾裡的 .glb");
    const target = entry.replace ? this.scene.getObjectByName(entry.replace) : null;
    if (entry.replace && !target) throw new Error(`找不到要取代的物件：${entry.replace}`);
    const validPosition = Array.isArray(entry.position) && entry.position.length === 3 && entry.position.every(Number.isFinite);
    if (!target && !entry.deity && !validPosition) throw new Error("需要指定 replace、deity 或 position");

    const gltf = await loader.loadAsync(`models/${entry.file}`);
    const holder = this.fitTempleModel(gltf.scene, entry);
    holder.name = `model-${entry.file}`;

    if (entry.deity) {
      holder.position.y = Number.isFinite(entry.offsetY) ? entry.offsetY : 0;
      holder.traverse(o => { o.userData.noCollision = true; });   // 神案本身已有碰撞
      this.throneGroup.add(holder);
      this.deityModelMap.set(entry.deity, holder);
      this.syncDeityModel();
      return holder;
    }

    if (target) {
      const at = new THREE.Vector3();
      target.getWorldPosition(at);
      holder.position.set(at.x, 0, at.z);
      holder.rotation.y = target.rotation.y;   // 沿用原物件朝向
      target.visible = false;   // 點選感應區不受影響，互動照舊
    } else {
      holder.position.set(...entry.position);
    }
    if (entry.collision === false) holder.traverse(o => { o.userData.noCollision = true; });
    this.scene.add(holder);
    return holder;
  }

  // 依指定高度等比縮放，底部貼地、水平置中，所以模型的原點與比例不必完全正確
  fitTempleModel(model, entry) {
    let triangles = 0;
    model.traverse(obj => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const geo = obj.geometry;
      triangles += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
      // 圖片轉 3D 工具常不附法線，GLTFLoader 會改用平面著色，臉上看得到多邊形；補上平滑法線
      if (!geo.attributes.normal && geo.index) {
        geo.computeVertexNormals();
        for (const mat of [].concat(obj.material)) { mat.flatShading = false; mat.needsUpdate = true; }
      }
      // 專案關閉色彩管理，貼圖一律不做色彩轉換，才會和其他程式材質一致
      for (const mat of [].concat(obj.material)) {
        for (const tex of [mat.map, mat.emissiveMap]) {
          if (tex) { tex.colorSpace = THREE.NoColorSpace; tex.needsUpdate = true; }
        }
      }
    });
    if (triangles > MODEL_TRIANGLE_WARNING) console.warn(`模型 ${entry.file} 有 ${Math.round(triangles)} 個三角面，手機可能會卡，建議減面`);

    const holder = new THREE.Group();
    if (Number.isFinite(entry.rotationY)) model.rotation.y = THREE.MathUtils.degToRad(entry.rotationY);
    holder.add(model);
    holder.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) throw new Error("模型沒有可顯示的內容");
    const size = box.getSize(new THREE.Vector3());
    if (Number.isFinite(entry.height) && entry.height > 0 && size.y > 0) model.scale.multiplyScalar(entry.height / size.y);
    holder.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.y -= box.min.y;
    model.position.z -= center.z;
    return holder;
  }

  // 目前神尊有模型就顯示模型，否則顯示程式模型；還沒下載的先顯示程式模型並開始下載
  syncDeityModel() {
    const id = this.deityModel?.userData.deity, active = this.deityModelMap?.get(id);
    this.deityModelMap?.forEach(holder => { holder.visible = holder === active; });
    if (this.deityModel) this.deityModel.visible = !active;
    if (!active) this.ensureDeityModel?.(id);
  }
}

installTempleMixin(TempleModelMixin);

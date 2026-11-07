// tools/three-entry.js - 把 Three.js（ES 模組）與 OrbitControls 打包成一支傳統 <script>，掛到 window.THREE
// 重新產生：npm install && npm run build:three  →  輸出 libs/three.bundle.min.js
//
// 專案其他腳本都是傳統 <script>、透過全域 THREE 互相使用；新版 Three.js 只提供 ES 模組，
// 所以在這裡打包，並補上與 r128 時代一致的外觀設定，其餘程式不用改。
import * as THREE_NS from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// 1) 色彩：r128 沒有色彩管理，十六進位顏色直接當線性值使用；關掉以維持原本的配色
THREE_NS.ColorManagement.enabled = false;

// 2) 燈光：r165 起只剩物理燈光模式，同樣的數值會比 r128 暗 π 倍，點光源與聚光燈的衰減預設也從 1 變成 2。
//    專案程式只會「寫入」燈光強度（不讀出來運算），所以用存取子：程式寫舊單位，交給渲染器時乘上 π。
const LEGACY_LIGHT_SCALE = Math.PI;

// 3) 點光源／聚光燈的距離衰減：r128 是「照明範圍內線性遞減」，新版是物理的平方反比。
//    大殿主要靠宮燈、燭台照明，用新公式會暗三到四成，所以把著色器裡的衰減函式換回舊式。
//    升級 Three.js 後若這段找不到（函式改名或改寫），會在主控台報錯，需重新檢查。
{
  const chunk = THREE_NS.ShaderChunk.lights_pars_begin;
  const start = chunk.indexOf("float getDistanceAttenuation(");
  const end = start < 0 ? -1 : chunk.indexOf("return distanceFalloff;", start);
  const close = end < 0 ? -1 : chunk.indexOf("}", end);
  if (start < 0 || close < 0) {
    console.error("three-entry：找不到 getDistanceAttenuation，舊式燈光衰減未套用");
  } else {
    THREE_NS.ShaderChunk.lights_pars_begin = chunk.slice(0, start) + `float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
		return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
	}
	return 1.0;
}` + chunk.slice(close + 1);
  }
}

function withLegacyIntensity(Base) {
  class LegacyLight extends Base {
    copy(source, recursive) {
      super.copy(source, recursive);
      // super.copy 會讀到已乘 π 的值再寫回，這裡改回原始數值，避免複製時被乘兩次
      if (source._legacyIntensity !== undefined) this._legacyIntensity = source._legacyIntensity;
      return this;
    }
  }
  Object.defineProperty(LegacyLight.prototype, "intensity", {
    get() { return this._legacyIntensity * LEGACY_LIGHT_SCALE; },
    set(value) { this._legacyIntensity = value; },
    configurable: true
  });
  Object.defineProperty(LegacyLight, "name", { value: Base.name });
  return LegacyLight;
}

const AmbientLight = withLegacyIntensity(THREE_NS.AmbientLight);
const HemisphereLight = withLegacyIntensity(THREE_NS.HemisphereLight);
const DirectionalLight = withLegacyIntensity(THREE_NS.DirectionalLight);

const PointLightBase = withLegacyIntensity(THREE_NS.PointLight);
class PointLight extends PointLightBase {
  constructor(color, intensity, distance = 0, decay = 1) {
    super(color, intensity, distance, decay);
  }
}

const SpotLightBase = withLegacyIntensity(THREE_NS.SpotLight);
class SpotLight extends SpotLightBase {
  constructor(color, intensity, distance = 0, angle = Math.PI / 3, penumbra = 0, decay = 1) {
    super(color, intensity, distance, angle, penumbra, decay);
  }
}

window.THREE = Object.freeze({
  ...THREE_NS,
  AmbientLight,
  HemisphereLight,
  DirectionalLight,
  PointLight,
  SpotLight,
  OrbitControls,
  GLTFLoader,
  LEGACY_LIGHT_SCALE
});

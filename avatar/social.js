// 真人同行的短句泡泡：保留原訊息時間，心跳與換裝不會重播。
const SPEECH_MS = 6000;
const TEMPLE_PHRASES = ["大家平安 🙏", "一起參拜吧", "謝謝你", "祝你心願成真", "我要去請香", "一起看布袋戲", "先告辭了，平安"];

function clearSpeechBubble(holder, group) {
  if (!holder.speechSprite) return;
  group.remove(holder.speechSprite);
  holder.speechSprite.material.map.dispose();
  holder.speechSprite.material.dispose();
  holder.speechSprite = null;
}

function showSpeechBubble(holder, group, speech, name) {
  if (!speech || typeof speech.text !== "string" || !Number.isFinite(speech.t)) return;
  if (Date.now() - speech.t >= SPEECH_MS || speech.t > Date.now() + 2000) return;
  clearSpeechBubble(holder, group);
  const chars = Array.from(speech.text.replace(/[\x00-\x1f\x7f]/g, " ").trim()).slice(0, 32);
  if (!chars.length) return;
  const canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 240;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255,249,232,0.97)";
  ctx.strokeStyle = "#d4a034"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(5, 5, 630, 205, 28); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(295, 207); ctx.lineTo(320, 238); ctx.lineTo(345, 207); ctx.fill();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#966228"; ctx.font = "24px 'Microsoft JhengHei', sans-serif";
  ctx.fillText(Array.from(name || "善信").slice(0, 16).join(""), 320, 38);
  ctx.fillStyle = "#382014"; ctx.font = "bold 34px 'Microsoft JhengHei', sans-serif";
  // 以量測寬度換行，中文與英文字母皆不會超出泡泡。
  const lines = [""];
  chars.forEach(c => {
    if (ctx.measureText(lines[lines.length - 1] + c).width > 570) lines.push("");
    lines[lines.length - 1] += c;
  });
  lines.slice(0, 3).forEach((line, i) => ctx.fillText(line, 320, 90 + i * 42));
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }));
  sprite.scale.set(1.9, 0.72, 1);
  sprite.position.set(0, 2.5, 0);
  sprite.userData.noCollision = true; sprite.renderOrder = 11;
  group.add(sprite); holder.speechSprite = sprite; holder.speechExpires = speech.t + SPEECH_MS;
}

function updateSpeechBubble(holder, group) {
  if (!holder.speechSprite) return;
  const remaining = holder.speechExpires - Date.now();
  if (remaining <= 0) clearSpeechBubble(holder, group);
  else holder.speechSprite.material.opacity = Math.min(1, remaining / 500);
}

class AvatarSocialMixin {
  speak(text) {
    const clean = Array.from(String(text).replace(/[\x00-\x1f\x7f]/g, " ").trim()).slice(0, 32).join("");
    if (!clean) return false;
    if (this.lastSpeechAt && Date.now() - this.lastSpeechAt < 2000) {
      window.setDockStatus?.("💬 請稍候兩秒再說下一句。");
      return false;
    }
    this.lastSpeechAt = Date.now();
    this.speech = { id: `${this.myPeerId}_${this.lastSpeechAt}`, text: clean, t: this.lastSpeechAt };
    showSpeechBubble(this, this.playerGroup, this.speech, this.config.title);
    this.broadcastMyState(true);
    window.setDockStatus?.(`💬 你說：${clean}`);
    return true;
  }
}
installAvatarMixin(AvatarSocialMixin);

window.templeChat = {
  init() {
    const grid = document.getElementById("quickSpeechGrid");
    TEMPLE_PHRASES.forEach(text => {
      const button = document.createElement("button"); button.className = "btn-custom-pill";
      button.textContent = text;
      button.addEventListener("click", () => window.temple3d?.avatar.speak(text)); grid.appendChild(button);
    });
    const form = document.getElementById("speechForm"), input = document.getElementById("speechInput");
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (window.temple3d?.avatar.speak(input.value)) input.value = "";
    });
  }
};

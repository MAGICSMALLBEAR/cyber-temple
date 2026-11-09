// audio.js - Web Audio API 物理聲學合成引擎 (擴充 3D 空間定位、投幣水花、燒金紙、念珠與神明語音)
// 純原生合成：零外鏈依賴、隨開隨響、完全離線可用

class TempleAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    // 三軌音量（0–1）：背景音（禪音、禪修混音、雨聲）、科儀音效、語音開示
    this.volumes = { music: 0.8, sfx: 1, voice: 1 };
    try {
      Object.assign(this.volumes, JSON.parse(localStorage.getItem("temple_audio_volumes") || "{}"));
    } catch (e) {}
    this.bgmOscs = [];
    this.isBgmPlaying = false;
    this.listenerPos = { x: 0, y: 0, z: 0 };
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.connect(this.ctx.destination);
      this.sfxBus.connect(this.ctx.destination);
      this.applyBusVolumes(0);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 靜音時兩條匯流排都歸零（連已在播的背景音也停），並中止語音
  applyBusVolumes(rampSeconds = 0.15) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [[this.musicBus, this.volumes.music], [this.sfxBus, this.volumes.sfx]].forEach(([bus, vol]) => {
      const target = this.isMuted ? 0 : vol;
      bus.gain.cancelScheduledValues(now);
      if (rampSeconds > 0) {
        bus.gain.setValueAtTime(bus.gain.value, now);
        bus.gain.linearRampToValueAtTime(target, now + rampSeconds);
      } else {
        bus.gain.setValueAtTime(target, now);
      }
    });
  }

  setVolume(track, value) {
    if (!(track in this.volumes)) return;
    this.volumes[track] = Math.max(0, Math.min(1, Number(value)));
    localStorage.setItem("temple_audio_volumes", JSON.stringify(this.volumes));
    this.applyBusVolumes();
  }

  setMuted(muted) {
    this.isMuted = !!muted;
    this.applyBusVolumes();
    if (this.isMuted) this.stopSpeaking();
  }

  // 設定聽者位置 (供 3D 空間定位音效衰減計算)
  updateListenerPosition(x, y, z) {
    this.listenerPos = { x, y, z };
  }

  // 計算 3D 距離音量衰減 (1.0 到 0.05)
  getSpatialGain(sourceX, sourceY, sourceZ, maxDist = 12) {
    const dx = this.listenerPos.x - sourceX;
    const dy = this.listenerPos.y - sourceY;
    const dz = this.listenerPos.z - sourceZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return Math.max(0.08, 1 - Math.min(dist / maxDist, 0.92));
  }

  // 木魚敲擊音效 (支援空間位置音量衰減)
  playWoodblock(sourcePos = null) {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const spatialGain = sourcePos ? this.getSpatialGain(sourcePos.x, sourcePos.y, sourcePos.z) : 1;

    // 1. 木頭主振頻率 (580Hz 快速衰減到 340Hz)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.08);

    gain.gain.setValueAtTime(0.9 * spatialGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 0.13);

    // 2. 敲擊瞬間短爆發雜音
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.02);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, now);
    filter.Q.setValueAtTime(2.5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5 * spatialGain, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxBus);

    noise.start(now);
  }

  // 宮廟大鐘 / 銅磬音效
  playBell(freq = 440, sourcePos = null) {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const spatialGain = sourcePos ? this.getSpatialGain(sourcePos.x, sourcePos.y, sourcePos.z, 16) : 1;
    const duration = 3.6;

    const partials = [
      { ratio: 1.0, gain: 0.6 },
      { ratio: 1.48, gain: 0.3 },
      { ratio: 2.05, gain: 0.2 },
      { ratio: 2.82, gain: 0.15 },
      { ratio: 3.65, gain: 0.08 }
    ];

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * p.ratio, now);

      gain.gain.setValueAtTime(p.gain * spatialGain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.sfxBus);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // 清脆銅磬 / 小頌缽：比大鐘輕短，兩個微失諧正弦產生自然拍音
  playBowl(freq = 880, sourcePos = null) {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const spatialGain = sourcePos ? this.getSpatialGain(sourcePos.x, sourcePos.y, sourcePos.z, 12) : 1;
    const duration = 2.2;

    [{ ratio: 1.0, gain: 0.32 }, { ratio: 1.004, gain: 0.22 }, { ratio: 2.76, gain: 0.07 }].forEach(p => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * p.ratio, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(p.gain * spatialGain, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // 舊呼叫名稱，等同木魚聲
  playMuyuSound(sourcePos = null) {
    this.playWoodblock(sourcePos);
  }

  // 擲筊落地撞擊聲
  playBwaBweiSound() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    this._playTap(now, 720, 0.4);
    this._playTap(now + 0.07, 650, 0.35);
    this._playTap(now + 0.16, 790, 0.15);
  }

  _playTap(time, pitch, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.6, time + 0.04);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  // 點火打火機聲
  playLighter() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.8;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2500, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    noise.start(now);
  }

  // 搖籤筒聲
  playShakeChiam() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const delay = i * 0.06;
      this._playTap(now + delay, 900 + Math.random() * 300, 0.12);
    }
  }

  // 撥動 108 念珠之溫潤木珠撞擊聲
  playBeadClick() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const pitch = 720 + (Math.random() - 0.5) * 80;
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.7, now + 0.035);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  // 許願池金幣落水清脆聲與水花 (Coin Clink & Splash)
  playCoinWaterSplash() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // 1. 金屬清脆叮聲 (Coin ping)
    const coinOsc = this.ctx.createOscillator();
    const coinGain = this.ctx.createGain();
    coinOsc.type = 'sine';
    coinOsc.frequency.setValueAtTime(2400, now);
    coinOsc.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
    coinGain.gain.setValueAtTime(0.35, now);
    coinGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    coinOsc.connect(coinGain);
    coinGain.connect(this.sfxBus);
    coinOsc.start(now);
    coinOsc.stop(now + 0.19);

    // 2. 水花撲通一聲 (Water splash noise)
    const splashTime = now + 0.08;
    const bufLen = Math.floor(this.ctx.sampleRate * 0.25);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.25));
    }
    const sNoise = this.ctx.createBufferSource();
    sNoise.buffer = buf;

    const sFilter = this.ctx.createBiquadFilter();
    sFilter.type = 'lowpass';
    sFilter.frequency.setValueAtTime(800, splashTime);
    sFilter.frequency.exponentialRampToValueAtTime(200, splashTime + 0.2);

    const sGain = this.ctx.createGain();
    sGain.gain.setValueAtTime(0.4, splashTime);
    sGain.gain.exponentialRampToValueAtTime(0.001, splashTime + 0.24);

    sNoise.connect(sFilter);
    sFilter.connect(sGain);
    sGain.connect(this.sfxBus);
    sNoise.start(splashTime);
  }

  // 焚燒金紙之熊熊烈火呼嘯聲 (Fire Whoosh & Crackle)
  playJossPaperFlame() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    const dur = 0.8;
    const bufLen = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      // 隨機火花劈啪
      const crackle = Math.random() < 0.03 ? 1.5 : 1;
      d[i] = (Math.random() * 2 - 1) * crackle * Math.sin((i / bufLen) * Math.PI);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    noise.start(now);
  }

  // 神明慈悲法音語音朗讀 (Web Speech API Text-to-Speech)
  speakDivineMessage(text, onEnd) {
    if (this.isMuted) return;
    if (!("speechSynthesis" in window)) {
      console.warn("當前瀏覽器不支援 SpeechSynthesis 語音合成。");
      return;
    }

    window.speechSynthesis.cancel(); // 停止先前的朗讀

    // 清理 Markdown 符號與特殊字元
    const cleanText = text
      .replace(/[#*`>\[\]_]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n+/g, '，');

    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.rate = 0.88;   // 緩慢悠遠
    utter.pitch = 0.95;  // 沉穩祥和
    utter.volume = this.volumes.voice;
    if (utter.volume <= 0) return;

    // 尋求繁體中文語音庫
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.includes("zh-TW") || v.lang.includes("zh-HK")) || voices.find(v => v.lang.includes("zh"));
    if (zhVoice) utter.voice = zhVoice;

    if (onEnd) utter.onend = onEnd;

    window.speechSynthesis.speak(utter);
  }

  stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  // 懸掛木牌清脆風鈴與木牌碰撞聲 (Plaque Hang Sound)
  playPlaqueHang() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // 木牌碰觸
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.13);

    // 清脆小銅鈴
    setTimeout(() => {
      this.playBowl(1320);
    }, 60);
  }

  // 靈符過爐開光加持音效 (Consecration Ritual Harmonics)
  playConsecrationChime() {
    if (this.isMuted) return;
    this.init();
    const freqs = [528, 660, 880, 1056];
    freqs.forEach((f, idx) => {
      setTimeout(() => {
        this.playBowl(f);
      }, idx * 160);
    });
    setTimeout(() => {
      this.playBell(264);
    }, 680);
  }

  // 時辰切換專屬儀式音效
  playShichenChime(shichenKey) {
    if (this.isMuted) return;
    this.init();

    if (shichenKey === "dawn") {
      // 卯時：清脆雙銅磬鳥鳴感
      this.playBowl(880);
      setTimeout(() => this.playBowl(1174), 220);
    } else if (shichenKey === "noon") {
      // 午時：洪亮宮廟金鐘
      this.playBell(523);
      setTimeout(() => this.playBell(659), 300);
    } else if (shichenKey === "dusk") {
      // 酉時：深沉暮鼓低迴
      this.playTwilightDrum();
    } else if (shichenKey === "midnight") {
      // 子時：空靈幽遠深鐘
      this.playBell(330);
      setTimeout(() => this.playBowl(440), 400);
    }
  }

  // 暮鼓低頻聲 (Twilight Drum)
  playTwilightDrum() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 0.75);
  }

  // 叩撞東鐘樓大梵金鐘 (Grand Bronze Temple Bell Strike - 108Hz Harmonics)
  playTempleBellStrike() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const dur = 7.0;

    // 多重金屬泛音 (鐘體金屬諧波)
    const partials = [
      { f: 108, g: 0.8 },
      { f: 216.5, g: 0.5 },
      { f: 324.2, g: 0.35 },
      { f: 432, g: 0.28 },
      { f: 648.7, g: 0.18 },
      { f: 864, g: 0.12 },
      { f: 1296, g: 0.08 }
    ];

    partials.forEach(({ f, g }) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      // 微弱顫音 vibrato
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(3.2, now);
      lfoGain.gain.setValueAtTime(1.5, now);
      lfo.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + dur);

      gain.gain.setValueAtTime(g * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      gain.connect(this.sfxBus);

      osc.start(now);
      osc.stop(now + dur);
    });

    // 撞木木質衝擊瞬態
    const strikeOsc = this.ctx.createOscillator();
    const strikeGain = this.ctx.createGain();
    strikeOsc.type = 'triangle';
    strikeOsc.frequency.setValueAtTime(180, now);
    strikeOsc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
    strikeGain.gain.setValueAtTime(0.5, now);
    strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    strikeOsc.connect(strikeGain);
    strikeGain.connect(this.sfxBus);
    strikeOsc.start(now);
    strikeOsc.stop(now + 0.1);
  }

  // 擊響西鼓樓雷音大天鼓 (Grand Thunderous Temple Drum Strike)
  playTempleDrumStrike() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const dur = 2.2;

    // 低頻皮膜下潛
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(42, now + dur);

    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + dur);

    // 鼓槌擊打清脆「通」聲
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(320, now);
    snapOsc.frequency.exponentialRampToValueAtTime(110, now + 0.06);
    snapGain.gain.setValueAtTime(0.4, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    snapOsc.connect(snapGain);
    snapGain.connect(this.sfxBus);
    snapOsc.start(now);
    snapOsc.stop(now + 0.08);
  }

  // 遶境排炮連環爆竹 (Firecrackers Cascade)
  playFirecrackers() {
    if (this.isMuted) return;
    this.init();
    const totalPops = 22;
    for (let i = 0; i < totalPops; i++) {
      const delay = Math.pow(i / totalPops, 1.2) * 2.2 + Math.random() * 0.08;
      setTimeout(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
          data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.25));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800 + Math.random() * 1200, now);

        const popGain = this.ctx.createGain();
        popGain.gain.setValueAtTime(0.35 + Math.random() * 0.25, now);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        noise.connect(filter);
        filter.connect(popGain);
        popGain.connect(this.sfxBus);
        noise.start(now);
      }, delay * 1000);
    }
  }

  // 迎神遶境慶典鑼鼓與嗩吶吉祥旋律 (Festival Parade Music)
  playParadeMusic() {
    if (this.isMuted) return;
    this.init();
    this.playFirecrackers();

    // 歡慶五聲音階嗩吶 (G4, A4, C5, D5, E5, G5)
    const notes = [
      { f: 392.00, d: 0.22, delay: 0.1 },  // G4
      { f: 440.00, d: 0.22, delay: 0.35 }, // A4
      { f: 523.25, d: 0.40, delay: 0.6 },  // C5
      { f: 587.33, d: 0.25, delay: 1.05 }, // D5
      { f: 659.25, d: 0.30, delay: 1.35 }, // E5
      { f: 783.99, d: 0.55, delay: 1.7 },  // G5
      { f: 659.25, d: 0.30, delay: 2.3 },  // E5
      { f: 523.25, d: 0.60, delay: 2.65 }  // C5
    ];

    notes.forEach(({ f, d, delay }) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);

        // 嗩吶特有滑音 (Portamento)
        osc.frequency.exponentialRampToValueAtTime(f * 1.02, now + d * 0.5);
        osc.frequency.exponentialRampToValueAtTime(f, now + d);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(f * 1.8, now);
        filter.Q.setValueAtTime(4.0, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + d);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + d + 0.05);

        // 大鑼伴奏
        if (delay === 0.1 || delay === 1.7 || delay === 2.65) {
          this.playBell(260);
        }
      }, delay * 1000);
    });
  }

  // 道教收驚法鈴（三清帝鐘）清心除煞音效 (Shoujing Handbell & Purifying Chime)
  playShoujingChime() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // 三清鈴連續輕搖法音 (1480Hz, 1850Hz, 2220Hz)
    const bellTones = [1480, 1850, 1480, 2220, 1850];
    bellTones.forEach((f, i) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(t);
        osc.stop(t + 0.2);
      }, i * 90);
    });

    // 索爾菲吉奧 396Hz 破除恐懼、消除噩夢安魂重音
    setTimeout(() => {
      this.playBell(396);
    }, 550);
  }

  // 梵天微雨環境雨聲 (Brahma Rain Ambient Sound)
  // volume：小雨 0.08、雷雨 0.15；已在下雨時只調整音量
  startRainSound(volume = 0.08) {
    if (this.isRainPlaying) { this.setRainLevel(volume); return; }
    this.init();
    this.isRainPlaying = true;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = buffer;
    this.rainSource.loop = true;

    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = 'lowpass';
    this.rainFilter.frequency.setValueAtTime(850, this.ctx.currentTime);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.rainGain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), this.ctx.currentTime + 1.5);

    this.rainSource.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.musicBus);
    this.rainSource.start();
  }

  stopRainSound() {
    if (!this.isRainPlaying || !this.rainGain) return;
    // 只停這一次的音源；一秒內又開始下雨時，新的雨聲不會被誤停
    const source = this.rainSource, gain = this.rainGain;
    try {
      gain.gain.cancelScheduledValues(this.ctx.currentTime);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.0);
      setTimeout(() => { try { source?.stop(); source?.disconnect(); } catch (e) {} }, 1100);
    } catch (e) {}
    if (this.rainSource === source) this.rainSource = null;
    this.isRainPlaying = false;
  }

  setRainLevel(volume) {
    if (!this.isRainPlaying || !this.rainGain) return;
    const g = this.rainGain.gain, now = this.ctx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.001, g.value), now);
    g.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 3);
  }

  // 遠雷：低頻噪音慢慢滾過；delay 秒後才響（閃電先到、雷聲後到）
  playThunder(delay = 1) {
    this.init();
    if (!this.ctx) return;
    const start = this.ctx.currentTime + Math.max(0, delay), length = 3.2;
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * length), this.ctx.sampleRate), data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; data[i] = last * 6; }
    const source = this.ctx.createBufferSource(); source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter(); filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, start); filter.frequency.exponentialRampToValueAtTime(90, start + length);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(filter); filter.connect(gain); gain.connect(this.sfxBus);
    source.start(start); source.stop(start + length);
  }

  // 拍立得快門喀嚓聲 (Camera Shutter Click)
  playCameraShutter() {
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.045);

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.2;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    noise.connect(noiseGain);
    noiseGain.connect(this.sfxBus);
    noise.start(now + 0.02);
  }

  // 節奏法會音效 (Rhythm Chanting Hit Sound)
  playRhythmHit(type = 'muyu', accuracy = 'perfect') {
    this.init();
    const now = this.ctx.currentTime;
    const pitchMul = accuracy === 'perfect' ? 1.05 : 1.0;

    if (type === 'muyu') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(460 * pitchMul, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.085);
    } else if (type === 'bell') {
      const freqs = [880, 1760, 2640];
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f * pitchMul, now);

        const vol = (0.28 / (idx + 1));
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 1.65);
      });
    } else if (type === 'combo') {
      [528, 660, 792, 1056].forEach((f, idx) => {
        const t = now + idx * 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    }
  }

  // 太歲星君安座加持音 (Tai Sui Pacifying Blessing Chime)
  playTaiSuiBlessing() {
    this.init();
    const now = this.ctx.currentTime;

    const gong = this.ctx.createOscillator();
    const gongGain = this.ctx.createGain();
    gong.type = 'triangle';
    gong.frequency.setValueAtTime(144, now);
    gongGain.gain.setValueAtTime(0.4, now);
    gongGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);
    gong.connect(gongGain);
    gongGain.connect(this.sfxBus);
    gong.start(now);
    gong.stop(now + 3.9);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(432, now + 0.1);
    gain.gain.setValueAtTime(0.25, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now + 0.1);
    osc.stop(now + 2.6);
  }

  // 萌寵護法互動音效 (Pet Interaction Audio)
  playPetPurr(type = 'tiger') {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    if (type === 'tiger') {
      // 虎爺咕嚕嚕聲 + 親暱躍動鳴響
      const purrOsc = this.ctx.createOscillator();
      const modOsc = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const purrGain = this.ctx.createGain();

      purrOsc.type = 'triangle';
      purrOsc.frequency.setValueAtTime(75, now);

      modOsc.type = 'sine';
      modOsc.frequency.setValueAtTime(26, now); // 26Hz 顫音咕嚕頻率
      modGain.gain.setValueAtTime(0.6, now);

      modOsc.connect(modGain.gain);

      purrGain.gain.setValueAtTime(0.3, now);
      purrGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      purrOsc.connect(purrGain);
      purrGain.connect(this.sfxBus);

      modOsc.start(now);
      purrOsc.start(now);
      modOsc.stop(now + 0.9);
      purrOsc.stop(now + 0.9);

      // 金幣招財清音 (528Hz -> 1056Hz)
      const coinOsc = this.ctx.createOscillator();
      const coinGain = this.ctx.createGain();
      coinOsc.type = 'sine';
      coinOsc.frequency.setValueAtTime(528, now + 0.15);
      coinOsc.frequency.exponentialRampToValueAtTime(1056, now + 0.35);

      coinGain.gain.setValueAtTime(0.2, now + 0.15);
      coinGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      coinOsc.connect(coinGain);
      coinGain.connect(this.sfxBus);
      coinOsc.start(now + 0.15);
      coinOsc.stop(now + 0.75);
    } else if (type === 'turtle') {
      // 靈龜太極八卦玄音 (216Hz + 432Hz 悠長沉穩)
      [216, 432].forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 1.25);
      });
    } else {
      // 玉兔清脆仙鈴琶音
      [1046, 1318, 1567].forEach((freq, idx) => {
        const t = now + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(t);
        osc.stop(t + 0.48);
      });
    }
  }

  // 天燈點燃升空音效 (Sky Lantern Launch Whoosh & Heart Chakra Resonance)
  playSkyLanternLaunch() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // 1. 熱氣流升騰白噪音呼嘯
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * (i / bufferSize));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(750, now + 1.4);
    filter.Q.setValueAtTime(3.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.6);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxBus);
    noise.start(now);

    // 2. 639Hz 願力感通心輪和聲 (Solfeggio 639Hz Harmonic)
    [639, 1278].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.3);
      gain.gain.setValueAtTime(0.01, now + 0.3);
      gain.gain.linearRampToValueAtTime(0.18 / (idx + 1), now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now + 0.3);
      osc.stop(now + 3.3);
    });
  }

  // 放流水燈音效 (Water Lantern Release)
  playWaterLanternRelease() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // 清柔入水波音
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.28);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.35);

    // 隨後水面微光泛音 (720Hz)
    const bell = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(720, now + 0.15);
    bellGain.gain.setValueAtTime(0.12, now + 0.15);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    bell.connect(bellGain);
    bellGain.connect(this.sfxBus);
    bell.start(now + 0.15);
    bell.stop(now + 1.85);
  }

  // -------------------------------------------------------------
  // 4 軌禪音環境混音器 (Zen Meditation Ambient Soundscape Mixer)
  // 1. 松濤風聲 (Wind) 2. 甘霖夜雨 (Rain) 3. 晨鳥啼鳴 (Birds) 4. 432Hz 頌缽 (Singing Bowl)
  // -------------------------------------------------------------
  initZenSoundscape() {
    if (this.zenMixer) return;
    this.init();
    this.zenMixer = {
      active: true,
      masterGain: this.ctx.createGain(),
      tracks: {
        wind: { gain: this.ctx.createGain(), nodes: [], vol: 0.35 },
        rain: { gain: this.ctx.createGain(), nodes: [], vol: 0.35 },
        birds: { gain: this.ctx.createGain(), timer: null, vol: 0.3 },
        bowl: { gain: this.ctx.createGain(), nodes: [], vol: 0.4 }
      }
    };
    this.zenMixer.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.zenMixer.masterGain.connect(this.musicBus);

    // 連接各軌到 masterGain
    Object.values(this.zenMixer.tracks).forEach(t => {
      t.gain.connect(this.zenMixer.masterGain);
      t.gain.gain.setValueAtTime(t.vol, this.ctx.currentTime);
    });

    // 啟動 1. 松濤風聲 (帶通調制白噪音)
    this.startZenWindTrack();

    // 啟動 2. 甘霖細雨 (溫柔低通粉紅/白噪音)
    this.startZenRainTrack();

    // 啟動 3. 晨鳥啼鳴 (隨機定時器)
    this.startZenBirdsTrack();

    // 啟動 4. 432Hz/434Hz 頌缽雙耳節拍
    this.startZenBowlTrack();
  }

  startZenWindTrack() {
    if (!this.zenMixer) return;
    const now = this.ctx.currentTime;
    const track = this.zenMixer.tracks.wind;

    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.95 * b1 + white * 0.1;
      b2 = 0.85 * b2 + white * 0.15;
      data[i] = (b0 + b1 + b2) * 0.5;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(340, now);
    filter.Q.setValueAtTime(1.8, now);

    // LFO 慢速風動調制 (0.12Hz)
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, now);
    lfoGain.gain.setValueAtTime(160, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(track.gain);

    lfo.start(now);
    noise.start(now);
    track.nodes = [noise, filter, lfo, lfoGain];
  }

  startZenRainTrack() {
    if (!this.zenMixer) return;
    const now = this.ctx.currentTime;
    const track = this.zenMixer.tracks.rain;

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    noise.connect(filter);
    filter.connect(track.gain);
    noise.start(now);
    track.nodes = [noise, filter];
  }

  startZenBirdsTrack() {
    if (!this.zenMixer) return;
    const track = this.zenMixer.tracks.birds;

    const chirp = () => {
      if (!this.zenMixer || !this.zenMixer.active) return;
      if (track.vol > 0.02) {
        const now = this.ctx.currentTime;
        const startFreq = 2200 + Math.random() * 800;
        const endFreq = startFreq + (Math.random() - 0.5) * 600;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1200, endFreq), now + 0.12);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(track.gain);
        osc.start(now);
        osc.stop(now + 0.16);

        // 有機率連鳴第二聲
        if (Math.random() < 0.6) {
          const t2 = now + 0.16;
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(startFreq * 1.12, t2);
          osc2.frequency.exponentialRampToValueAtTime(Math.max(1200, startFreq * 0.9), t2 + 0.14);
          gain2.gain.setValueAtTime(0.1, t2);
          gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.15);
          osc2.connect(gain2);
          gain2.connect(track.gain);
          osc2.start(t2);
          osc2.stop(t2 + 0.18);
        }
      }
      const nextDelay = 2200 + Math.random() * 4500;
      track.timer = setTimeout(chirp, nextDelay);
    };

    track.timer = setTimeout(chirp, 1500);
  }

  startZenBowlTrack() {
    if (!this.zenMixer) return;
    const now = this.ctx.currentTime;
    const track = this.zenMixer.tracks.bowl;

    // 432Hz 主頻與 434Hz 雙耳節拍 (2Hz Theta 波)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const oscHarmonic = this.ctx.createOscillator();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(432, now);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(434, now); // 2Hz 深度放鬆雙耳節拍
    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(864, now);

    const g1 = this.ctx.createGain();
    const g2 = this.ctx.createGain();
    const gH = this.ctx.createGain();

    g1.gain.setValueAtTime(0.15, now);
    g2.gain.setValueAtTime(0.15, now);
    gH.gain.setValueAtTime(0.04, now);

    osc1.connect(g1);
    osc2.connect(g2);
    oscHarmonic.connect(gH);

    g1.connect(track.gain);
    g2.connect(track.gain);
    gH.connect(track.gain);

    osc1.start(now);
    osc2.start(now);
    oscHarmonic.start(now);

    track.nodes = [osc1, osc2, oscHarmonic, g1, g2, gH];
  }

  setZenTrackVolume(name, volume) {
    if (!this.zenMixer || !this.zenMixer.tracks[name]) return;
    const track = this.zenMixer.tracks[name];
    track.vol = Math.max(0, Math.min(1, volume));
    const now = this.ctx.currentTime;
    track.gain.gain.cancelScheduledValues(now);
    track.gain.gain.linearRampToValueAtTime(track.vol, now + 0.1);
  }

  setZenMasterVolume(volume) {
    if (!this.zenMixer) return;
    const now = this.ctx.currentTime;
    this.zenMixer.masterGain.gain.cancelScheduledValues(now);
    this.zenMixer.masterGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume)), now + 0.1);
  }

  stopZenSoundscape() {
    if (!this.zenMixer) return;
    this.zenMixer.active = false;
    const now = this.ctx.currentTime;
    this.zenMixer.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    setTimeout(() => {
      if (this.zenMixer) {
        if (this.zenMixer.tracks.birds && this.zenMixer.tracks.birds.timer) {
          clearTimeout(this.zenMixer.tracks.birds.timer);
        }
        Object.values(this.zenMixer.tracks).forEach(track => {
          if (track.nodes) {
            track.nodes.forEach(node => {
              try {
                if (node.stop) node.stop();
                if (node.disconnect) node.disconnect();
              } catch (e) {}
            });
          }
        });
        this.zenMixer = null;
      }
    }, 700);
  }

  // 禪意背景音開關
  toggleAmbientBGM() {
    this.init();
    if (this.isBgmPlaying) {
      this.stopAmbientBGM();
      return false;
    } else {
      this.startAmbientBGM();
      return true;
    }
  }

  startAmbientBGM() {
    if (this.isBgmPlaying) return;
    const now = this.ctx.currentTime;
    this.isBgmPlaying = true;
    this.bgmOscs = [];

    const notes = [130.81, 196.00, 261.63, 329.63];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.015 / (idx + 1), now);
      osc.connect(gain);
      gain.connect(this.musicBus);
      osc.start(now);
      this.bgmOscs.push({ osc, gain });
    });
  }

  stopAmbientBGM() {
    this.bgmOscs.forEach(({ osc, gain }) => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1);
        setTimeout(() => osc.stop(), 1100);
      } catch (e) {}
    });
    this.bgmOscs = [];
    this.isBgmPlaying = false;
  }

  // 搏杯大賽連續聖筊喜慶音效
  playBwaCompetitionChime(streak = 1) {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    if (streak <= 2) {
      // 1~2 聖筊：清脆甘美銅磬
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.75);
    } else if (streak <= 4) {
      // 3~4 聖筊：大吉三連音琶音 (528Hz -> 660Hz -> 792Hz)
      [528, 660, 792].forEach((f, idx) => {
        const t = now + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(t);
        osc.stop(t + 0.9);
      });
    } else if (streak <= 7) {
      // 5~7 聖筊：金鐘悠遠震鳴 + 宮廷金音
      this.playBell(330);
      [440, 554.37, 659.25, 880].forEach((f, idx) => {
        const t = now + 0.1 + idx * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(t);
        osc.stop(t + 1.25);
      });
    } else {
      // 8+ 聖筊：大梵金鐘長鳴 + 天界韶樂和弦 (天選信徒)
      this.playBell(165);
      [528, 660, 792, 1056, 1320].forEach((f, idx) => {
        const t = now + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.24 / (idx + 1), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(t);
        osc.stop(t + 2.6);
      });
    }
  }

  // 御賜平安齋供品呈獻大典大鐘韶樂
  playFeastOffering() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // 莊嚴大銅鑼 (Gong 110Hz)
    const gong = this.ctx.createOscillator();
    const gongGain = this.ctx.createGain();
    gong.type = 'triangle';
    gong.frequency.setValueAtTime(110, now);
    gongGain.gain.setValueAtTime(0.45, now);
    gongGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
    gong.connect(gongGain);
    gongGain.connect(this.sfxBus);
    gong.start(now);
    gong.stop(now + 3.6);

    // 宮商角徵羽五音韶樂 (F C G D A 432Hz 諧波)
    const notes = [349.23, 523.25, 392.00, 587.33, 440.00];
    notes.forEach((freq, idx) => {
      const t = now + 0.15 + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(t);
      osc.stop(t + 2.3);
    });
  }

  // 抄經毛筆筆墨與清心微音
  playCalligraphyInkSound() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // 筆鋒刷過宣紙極柔微弱沙沙白噪音
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(1.5, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    noise.start(now);
  }
}

window.templeAudio = new TempleAudioEngine();

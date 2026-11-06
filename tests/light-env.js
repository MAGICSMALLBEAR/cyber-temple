// 無瀏覽器的 DOM／存檔替身，用於資料與互動整合檢查；不建立 WebGLRenderer。
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
function makeEnvironment(THREE) {
  const nodes = new Map(), events = new Map(), store = new Map();
  let time = Date.parse("2026-11-05T04:00:00Z");
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [time])); } static now() { return time; } }
  const canvasContext = new Proxy({ measureText: text => ({ width: String(text).length * 16 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) }, { get: (obj, key) => key in obj ? obj[key] : () => {} });
  class Element {
    constructor(tag = "div") {
      this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.style = {}; this.attributes = {}; this.listeners = new Map(); this.value = ""; this.textContent = ""; this.hidden = false; this.disabled = false; this.tabIndex = 0; this.isConnected = true;
      const classes = new Set();
      this.classList = { add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)), contains: n => classes.has(n), toggle: (n, force) => { const on = force ?? !classes.has(n); if (on) classes.add(n); else classes.delete(n); return on; } };
    }
    append(...elements) { elements.forEach(e => { if (e && typeof e === "object") e.parentNode = this; this.children.push(e); }); }
    appendChild(e) { this.append(e); return e; }
    replaceChildren(...elements) { this.children = []; this.append(...elements); }
    setAttribute(name, value) { this.attributes[name] = String(value); if (name === "id") { this.id = String(value); nodes.set(this.id, this); } }
    getAttribute(name) { return this.attributes[name] ?? null; }
    addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, []); this.listeners.get(name).push(fn); }
    click() { if (!this.disabled) (this.listeners.get("click") || []).forEach(fn => fn({ target: this, currentTarget: this, preventDefault() {}, stopPropagation() {} })); }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    getContext() { return canvasContext; }
    getBoundingClientRect() { return { x: 0, y: 700, left: 0, right: 800, top: 700, bottom: 800, width: 800, height: 100 }; }
    getClientRects() { return [{}]; }
    contains(child) { return child === this || this.children.some(c => c?.contains?.(child)); }
    focus() { document.activeElement = this; }
    scrollIntoView() {}
  }
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  for (const match of html.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    const el = new Element(match[1]); el.id = match[3]; nodes.set(el.id, el);
    const classes = match[2].match(/\bclass="([^"]+)"/); classes?.[1].split(/\s+/).forEach(c => el.classList.add(c));
  }
  const document = { hidden: false, documentElement: new Element("html"), body: new Element("body"),
    getElementById: id => nodes.get(id) || null, createElement: tag => new Element(tag), createElementNS: (_, tag) => new Element(tag),
    querySelectorAll: () => [], querySelector: selector => selector.includes("modal-overlay.open") ? [...nodes.values()].find(n => n.classList.contains("modal-overlay") && n.classList.contains("open")) || null : null,
    addEventListener: () => {} };
  document.activeElement = document.body;
  const localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key), key: i => [...store.keys()][i] || null, get length() { return store.size; } };
  const context = { THREE, document, localStorage, Date: ClockDate, Intl, performance, innerHeight: 900, innerWidth: 1280, console,
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
    MutationObserver: class { observe() {} }, ResizeObserver: class { observe() {} },
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {},
    addEventListener(name, fn) { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); },
    dispatchEvent(e) { (events.get(e.type) || []).forEach(fn => fn(e)); }, confirm: () => true,
    setDockStatus(text) { context.lastNotice = text; },
    state: { selectedChiam: null, avatarConfig: { title: "善信" }, meritCount: 0 },
    CHIAM_DATA: Array.from({ length: 60 }, (_, i) => ({ id: i + 1, ganZhi: "甲子", fortune: "平安", guaTou: "典故" })) };
  context.window = context;
  context.emitRitual = (type, detail = {}) => context.dispatchEvent(new context.CustomEvent("temple:ritual", { detail: { type, ...detail } }));
  context.liveTempleWall = { showBroadcastNotice: text => { context.lastNotice = text; } };
  vm.createContext(context);
  return { context, nodes, store, html,
    load(file) { vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), context, { filename: file }); },
    run(source) { return vm.runInContext(source, context); },
    setTime(iso) { time = Date.parse(iso); },
    text(node) { return [node?.textContent || "", ...(node?.children || []).map(c => typeof c === "string" ? c : this.text(c))].join(" "); }
  };
}
module.exports = { makeEnvironment, ROOT };

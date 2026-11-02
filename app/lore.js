// app/lore.js - 宮廟藏經閣

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindLoreEvents() {
  // 2. 宮廟藏經閣事件綁定
  document.getElementById("btnOpenLore")?.addEventListener("click", () => window.openLoreModal());
  document.getElementById("loreModalClose")?.addEventListener("click", () => window.closeLoreModal());
  document.getElementById("tabLoreChiam")?.addEventListener("click", () => switchLoreTab("chiam"));
  document.getElementById("tabLoreDeities")?.addEventListener("click", () => switchLoreTab("deities"));
  document.getElementById("tabLoreTraditions")?.addEventListener("click", () => switchLoreTab("traditions"));
  document.getElementById("loreSearchInput")?.addEventListener("input", (e) => renderLoreList(e.target.value));
  document.getElementById("btnLoreDetailBack")?.addEventListener("click", () => {
    const detailEl = document.getElementById("loreDetailView");
    const containerEl = document.getElementById("loreContentContainer");
    if (detailEl) detailEl.style.display = "none";
    if (containerEl) containerEl.style.display = "grid";
  });
  document.getElementById("btnLoreStudy")?.addEventListener("click", () => {
    addMerit(20);
    if (window.templeAudio) window.templeAudio.playBell(528);
    alert("📖 虔心研讀領悟經義！功德 +20，智慧增長！");
  });

}

// ==========================================================================
// 2. 宮廟藏經閣 • 靈籤寶典與仙真史料館 (Lore Pavilion Logic)
// ==========================================================================
let currentLoreTab = "chiam";

const LORE_DEITIES = [
  {
    id: "mazu",
    title: "天上聖母 • 媽祖林默娘",
    badge: "護國庇民 • 慈悲海神",
    desc: "生於湄洲嶼，自幼通靈顯化，能乘席渡海、預知休咎。歷朝累封天妃、天后、天上聖母，為護佑四海生民航海、闔家安康之主神，座前配祀千里眼、順風耳二大將軍。",
    advice: "常懷慈悲救難之心，遇風浪處心不慌亂，靜守正念自有神助。"
  },
  {
    id: "wenchang",
    title: "文昌帝君 • 梓潼梓帝",
    badge: "文章司命 • 魁星點斗",
    desc: "主宰人間功名、學業、利祿與考運之神仙。七十七次化身人間，濟人之急，救人之難。手持如意與硃砂筆，點選士子及第，座前配侍天聾、地啞，象徵文才守密不漏天機。",
    advice: "行陰騭、廣讀詩書，積德於暗室之中，功名自然水到渠成。"
  },
  {
    id: "caishen",
    title: "五路武財神 • 玄壇真君趙公明",
    badge: "迎祥納福 • 招財進寶",
    desc: "峨眉山得道仙真，跨黑虎、執九節金鞭，統領招寶天尊蕭升、納珍天尊曹寶、招財使者陳九公、利市仙官姚少司，合稱五路財神，管領人間一切財帛庫藏。",
    advice: "取財有道，以義取財，多行布施善舉，正偏財聚寶盆自然滿盈。"
  },
  {
    id: "yuelao",
    title: "月下老人 • 天賜良緣仙長",
    badge: "千里姻緣 • 紅繩和合",
    desc: "道家職司姻緣愛戀之仙翁。手持鴛鴦譜，袋中暗繫紅絲線，凡經其牽合者，縱隔關山千里、冤家世仇，終成眷屬同諧白首。座右配備同心金鎖，鎖定永世真愛。",
    advice: "彼此體諒寬容，真心珍惜眼前緣分，切莫因執著小節錯失佳期。"
  },
  {
    id: "taisui",
    title: "值年太歲星君 • 六十甲子本命神",
    badge: "元辰光彩 • 化煞除災",
    desc: "依六十甲子干支輪值人間禍福，率領太歲神將監察人間善惡。本命年或流年沖煞者，安奉太歲、點元辰長生斗燈，可消災解厄、護佑一歲平安順遂。",
    advice: "遇沖煞之年宜靜不宜躁，凡事謙退，常行孝道，太歲反作福星。"
  },
  {
    id: "guaiguai",
    title: "科技綠乖乖神 • 伺服器護法天神",
    badge: "機房長綠 • 永不宕機",
    desc: "台灣科技工程師獨特民俗崇拜神物。供奉於伺服器機櫃與電腦主機之上，唯認「椰子綠色包裝」，象徵機房運轉燈號常保綠燈，驅散 Bug 陰霾，護佑軟硬體百萬行程式碼安然無恙。",
    advice: "切莫偷吃祭壇乖乖！按時備份資料，保持代碼簡潔，乖乖自會守護神機。"
  }
];

const LORE_TRADITIONS = [
  {
    id: "bwa_rule",
    title: "擲筊聖意科儀古法",
    badge: "陰陽兩儀 • 天人感應",
    desc: "筊杯一正一反象徵太極陰陽調和，為「聖筊」，代表神明允諾大吉；兩平面向上為「笑筊」，代表神意未定或信眾已有定見無需再問；兩凸面向上為「陰筊」，代表神明不允，宜反躬自省。",
    advice: "稟報姓名、生辰、住址與事由務必清楚，心誠則靈。"
  },
  {
    id: "incense_rule",
    title: "敬香三獻禮與天公爐法度",
    badge: "一炷清香 • 通達九天",
    desc: "入廟必先朝外向天公爐行三鞠躬敬奉天公玉皇上帝，再入大殿拜主神。上香時以左手（清淨手）插香，三炷香象徵敬天、敬地、敬人。",
    advice: "香火裊裊，心隨香散，雜念全消。"
  },
  {
    id: "shoujing_lore",
    title: "道家行天宮正統收驚古法",
    badge: "魂魄歸位 • 淨香掃煞",
    desc: "人遇車禍、惡夢或大病，三魂七魄易生震盪遊離。透過淨香、帝鐘、金光神咒三度加持，驅散體外濁煞黑氣，令元神歸位、心平氣和。",
    advice: "收驚後宜靜養安歇，切忌驚躁。"
  },
  {
    id: "beads_lore",
    title: "108 顆菩提念珠斷除煩惱",
    badge: "數息明心 • 圓融大覺",
    desc: "108 顆念珠象徵斷除世間一百零八種無明煩惱（六根各具苦、樂、捨三受，涉過去現在未來三世）。每撥一顆誦一偈，定心寧神。",
    advice: "指尖輕撥，雜念頓消，日行一輪，功德自固。"
  }
];

window.openLoreModal = function() {
  const modal = document.getElementById("loreModal");
  if (!modal) return;
  modal.classList.add("open");
  switchLoreTab("chiam");
  if (window.templeAudio) window.templeAudio.playBell(440);
};

window.closeLoreModal = function() {
  const modal = document.getElementById("loreModal");
  if (modal) modal.classList.remove("open");
};

function switchLoreTab(tab) {
  currentLoreTab = tab;
  document.querySelectorAll(".lore-tab-btn").forEach(b => b.classList.remove("active"));
  if (tab === "chiam") document.getElementById("tabLoreChiam")?.classList.add("active");
  else if (tab === "deities") document.getElementById("tabLoreDeities")?.classList.add("active");
  else if (tab === "traditions") document.getElementById("tabLoreTraditions")?.classList.add("active");

  const detailView = document.getElementById("loreDetailView");
  const container = document.getElementById("loreContentContainer");
  if (detailView) detailView.style.display = "none";
  if (container) container.style.display = "grid";

  renderLoreList();
}

function renderLoreList(filterText = "") {
  const container = document.getElementById("loreContentContainer");
  if (!container) return;
  const kw = filterText.toLowerCase().trim();

  if (currentLoreTab === "chiam") {
    const list = (window.CHIAM_DATA || []).filter(p => {
      if (!kw) return true;
      return p.ganZhi.includes(kw) || p.guaTou.includes(kw) || p.fortune.includes(kw) || p.id.toString() === kw;
    });

    container.innerHTML = list.map(item => `
      <div class="lore-card" onclick="showChiamLoreDetail(${item.id})">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: bold; color: #ffd700;">第 ${item.id} 籤 【${item.ganZhi}】</span>
          <span style="font-size: 0.72rem; color: #4ade80;">${item.fortune.split("•")[0]}</span>
        </div>
        <div style="font-size: 0.78rem; color: #fde047; margin-bottom: 4px;">📜 典故：${item.guaTou.split("/")[0]}</div>
        <div style="font-size: 0.72rem; color: #cbd5e1; line-height: 1.3;">${item.poem[0]}，${item.poem[1]}...</div>
      </div>
    `).join("");
  } else if (currentLoreTab === "deities") {
    const list = LORE_DEITIES.filter(d => !kw || d.title.includes(kw) || d.desc.includes(kw));
    container.innerHTML = list.map(item => `
      <div class="lore-card" onclick="showDeityLoreDetail('${item.id}')">
        <div style="font-weight: bold; color: #ffd700; margin-bottom: 4px;">${item.title}</div>
        <div style="font-size: 0.72rem; color: #fde047; margin-bottom: 4px;">${item.badge}</div>
        <div style="font-size: 0.72rem; color: #cbd5e1; line-height: 1.3;">${item.desc.substring(0, 48)}...</div>
      </div>
    `).join("");
  } else {
    const list = LORE_TRADITIONS.filter(t => !kw || t.title.includes(kw) || t.desc.includes(kw));
    container.innerHTML = list.map(item => `
      <div class="lore-card" onclick="showTraditionLoreDetail('${item.id}')">
        <div style="font-weight: bold; color: #ffd700; margin-bottom: 4px;">${item.title}</div>
        <div style="font-size: 0.72rem; color: #fde047; margin-bottom: 4px;">${item.badge}</div>
        <div style="font-size: 0.72rem; color: #cbd5e1; line-height: 1.3;">${item.desc.substring(0, 48)}...</div>
      </div>
    `).join("");
  }
}

function showChiamLoreDetail(id) {
  const p = (window.CHIAM_DATA || []).find(item => item.id === id);
  if (!p) return;

  const container = document.getElementById("loreContentContainer");
  const detail = document.getElementById("loreDetailView");
  if (container) container.style.display = "none";
  if (detail) detail.style.display = "block";

  document.getElementById("loreDetailTitle").innerText = `第 ${p.id} 籤 • 【${p.ganZhi}】`;
  document.getElementById("loreDetailFortune").innerText = p.fortune;
  document.getElementById("loreDetailGua").innerText = `📜 正統卦頭典故：${p.guaTou}`;
  document.getElementById("loreDetailPoem").innerHTML = p.poem.join("<br>");
  document.getElementById("loreDetailStory").innerHTML = `<b>【白話義理】</b>：${p.meaning}<br><br><b>【五分占斷】</b>：<br>• 事業：${p.details.career}<br>• 感情：${p.details.romance}<br>• 考運：${p.details.exam}<br>• 財運：${p.details.wealth}<br>• 健康：${p.details.health}`;
  document.getElementById("loreDetailAdvice").innerText = p.advice;
}

function showDeityLoreDetail(id) {
  const d = LORE_DEITIES.find(item => item.id === id);
  if (!d) return;

  const container = document.getElementById("loreContentContainer");
  const detail = document.getElementById("loreDetailView");
  if (container) container.style.display = "none";
  if (detail) detail.style.display = "block";

  document.getElementById("loreDetailTitle").innerText = d.title;
  document.getElementById("loreDetailFortune").innerText = d.badge;
  document.getElementById("loreDetailGua").innerText = `🏮 仙真聖號：${d.title}`;
  document.getElementById("loreDetailPoem").innerHTML = `【神尊法相聖蹟】`;
  document.getElementById("loreDetailStory").innerHTML = `<b>【聖德列傳】</b>：<br>${d.desc}`;
  document.getElementById("loreDetailAdvice").innerText = `神明開示：${d.advice}`;
}

function showTraditionLoreDetail(id) {
  const t = LORE_TRADITIONS.find(item => item.id === id);
  if (!t) return;

  const container = document.getElementById("loreContentContainer");
  const detail = document.getElementById("loreDetailView");
  if (container) container.style.display = "none";
  if (detail) detail.style.display = "block";

  document.getElementById("loreDetailTitle").innerText = t.title;
  document.getElementById("loreDetailFortune").innerText = t.badge;
  document.getElementById("loreDetailGua").innerText = `🏮 正統科儀：${t.title}`;
  document.getElementById("loreDetailPoem").innerHTML = `【道門科儀源流】`;
  document.getElementById("loreDetailStory").innerHTML = `<b>【儀軌詳解】</b>：<br>${t.desc}`;
  document.getElementById("loreDetailAdvice").innerText = `民俗叮嚀：${t.advice}`;
}

// ai-divination.js - AI 智慧即時解籤與神明心法推演引擎
// 支援：Google Gemini API 直連 + 本地高階心靈演繹引擎 (免 Key 即開即用)

class AIDivinationEngine {
  constructor() {
    this.apiKey = localStorage.getItem("temple_gemini_key") || "";
    // 可在 localStorage 的 temple_gemini_model 覆寫，模型下架時不必改程式
    this.model = localStorage.getItem("temple_gemini_model") || "gemini-3.8-flash";
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    if (this.apiKey) {
      localStorage.setItem("temple_gemini_key", this.apiKey);
    } else {
      localStorage.removeItem("temple_gemini_key");
    }
  }

  hasApiKey() {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  // 核心解籤調用
  async divine({ deity, chiam, userQuestion, userName, userAddress }) {
    if (this.hasApiKey()) {
      try {
        // 送到 Google 的內容不含分身稱呼與地區（可能是真名），只有神尊、籤詩與玩家自己寫的問題
        return await this._callGeminiAPI({ deity, chiam, userQuestion });
      } catch (err) {
        console.warn("Gemini API 調用失敗，自動切換至神明推演心法模式：", err);
        return this._localSmartDivine({ deity, chiam, userQuestion, userName, userAddress, errorNote: err.message });
      }
    } else {
      // 本地深度心靈演繹
      return this._localSmartDivine({ deity, chiam, userQuestion, userName, userAddress });
    }
  }

  // Google Gemini API 調用
  async _callGeminiAPI({ deity, chiam, userQuestion }) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const prompt = `
你現在是台灣民間信仰中尊貴宏大的神明【${deity.name}】（尊稱：${deity.title}）的神靈化身。
一位信眾今日心懷誠敬，前來神殿向你求示。

信眾陳述的具體煩惱與問題如下：
「${userQuestion || "祈求人生指引、事業與心靈安泰"}」

信眾誠心抽得之靈籤為：
- 籤序：第 ${chiam.id} 籤【${chiam.ganZhi}】
- 吉凶：${chiam.fortune}
- 歷史典故：${chiam.guaTou}
- 籤詩本文：
${chiam.poem.join("\n")}
- 傳統白話總綱：${chiam.meaning}

請以神明慈悲莊嚴、充滿智慧與洞見、循循善誘的語氣，為該信眾進行深度「AI 量身解籤」。請嚴格按照以下四大結構回覆，語言使用繁體中文，行文優美且具備實際行動指導意義：

🔮【神明法音 • 當前局勢之玄機】
（針對信眾提問，以神明視角剖析信眾目前身處的情境，融合籤詩第一、二句與歷史典故，點出天時與因緣。）

🧭【問題根源 • 心靈盲點指引】
（直指信眾內心深處的焦慮、恐懼、猶豫或盲點，讓其看清事物的本質，而非被表面紛擾所惑。）

💡【神機妙策 • 具體破局行動步驟】
（提供信眾 2~3 項具體可執行的現實生活行動方針，包含溝通方式、決策取捨或心態調整，務求切實可行。）

⏳【吉凶時機 • 避坑與行事宜忌】
（明確給予時間點提醒、心態宜忌，並以${deity.name}特有的庇佑法音給予溫暖的祝福。）
`;

    const response = await fetch(endpoint, {
      method: "POST",
      // Key 放 header 而非網址，避免出現在瀏覽紀錄與伺服器日誌
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          // Gemini 3 系列的思考 token 也算在上限內，調低思考並放寬上限以免正文被截斷
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingLevel: "low" }
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API HTTP 錯誤 ${response.status}`);
    }

    const data = await response.json();
    const candidate = (data.candidates?.[0]?.content?.parts || [])
      .filter(p => p.text && !p.thought)
      .map(p => p.text)
      .join("");
    if (!candidate) throw new Error("未能從 Gemini API 取得解籤結果");

    return {
      source: "Gemini API",
      text: candidate
    };
  }

  // 本地智慧演繹引擎 (無需 API Key 也能提供深度解析)
  _localSmartDivine({ deity, chiam, userQuestion, userName, userAddress, errorNote }) {
    const q = (userQuestion || "").toLowerCase();
    const name = userName || "善信";

    // 判斷問題領域
    let domain = "general";
    if (q.includes("工作") || q.includes("離職") || q.includes("換工作") || q.includes("面試") || q.includes("老闆") || q.includes("主管") || q.includes("業績") || q.includes("創業")) {
      domain = "career";
    } else if (q.includes("感情") || q.includes("愛") || q.includes("喜歡") || q.includes("分手") || q.includes("復合") || q.includes("結婚") || q.includes("對象") || q.includes("冷戰") || q.includes("曖昧")) {
      domain = "romance";
    } else if (q.includes("考") || q.includes("證照") || q.includes("學業") || q.includes("研究所") || q.includes("錄取")) {
      domain = "exam";
    } else if (q.includes("錢") || q.includes("投資") || q.includes("股票") || q.includes("發財") || q.includes("財運") || q.includes("買房")) {
      domain = "wealth";
    } else if (q.includes("bug") || q.includes("伺服器") || q.includes("代碼") || q.includes("工程師") || q.includes("上線") || q.includes("crash")) {
      domain = "tech";
    }

    let specificAdvice = "";
    if (domain === "career") {
      specificAdvice = `信眾所問之事業前程，此籤正應在「轉機醞釀，重在人和」。切勿因一時的情緒波動或旁人耳語而倉促離場；此時最宜冷靜盤點個人核心優勢，補足專業短板。若欲尋求突破，近期宜多向值得信賴的長輩或同業前輩請益，貴人正隱於身邊。`;
    } else if (domain === "romance") {
      specificAdvice = `信眾所問之情感糾結，此籤喻示「解鈴還須繫鈴人，心寬則路平」。感情中最忌「猜忌」與「賭氣」。若當前處於冷戰或不確定中，不妨放下強硬的外殼，以同理心傾聽對方的脆弱處。天定之良緣需經風雨琢磨，順應自然、誠實面對心聲方為上策。`;
    } else if (domain === "exam") {
      specificAdvice = `信眾所問之考運功名，籤意顯露「功不唐捐，厚積薄發」。此刻最重要的不是狂做新題，而是穩住陣腳，將基礎架構重新梳理貫通。摒除外在社交雜訊，每日保持定時溫習與充足睡眠，臨場時方能如泉水湧現、從容不迫。`;
    } else if (domain === "wealth") {
      specificAdvice = `信眾所求之財祿資產，籤文告誡「君子愛財，取之有道，穩守待豐」。當前切忌聽信未經核實的小道消息或貪圖暴利槓桿。正財穩固才是聚寶盆之基石，專注於本業技能之精進，財富自會如同春水匯流，綿延不絕。`;
    } else if (domain === "tech") {
      specificAdvice = `信眾所問之代碼運算與系統安泰，專屬綠色神尊庇佑！「細查邊界條件，備份不可偏廢」。複雜問題往往藏於微小設定或舊有依賴。先喝杯茶定心沉思，理清架構邏輯，系統自當綠燈常亮、運行無阻！`;
    } else {
      specificAdvice = `信眾所求之事，萬法由心生。當前所面臨的停滯，實為上天賜予沉澱自我、看清全貌的契機。放下急於求成的執念，按部就班做好當下每一件小事，轉機自會如晨曦破曉般悄然顯現。`;
    }

    const note = errorNote ? `\n> [!NOTE]\n> （已自動啟用本地智慧演繹引擎；可至頂部「AI 設定」綁定 Gemini API Key 解鎖原廠即時對話）\n\n` : "";

    const text = `${note}🔮【${deity.name} • 聖諭啟示】
善信 ${name} 誠心來稟，神靈已知悉你的牽掛與思量。
你所求得之【第 ${chiam.id} 籤 • ${chiam.ganZhi}】，籤詩有云：「${chiam.poem[0]}，${chiam.poem[1]}」，此乃天道運行的象徵，吉凶定性為【${chiam.fortune}】。

🧭【心靈盲點與局勢玄機】
你目前所感受到的膠著或焦慮，多半源於「既想向前突破，又畏懼未知的得失」。典故《${chiam.guaTou}》正是在告誡我們：英雄行路，必經迷霧；風浪未平之時，強行出海只會耗損心神，唯有心定，方能見微知著。

💡【具體行動建議】
${specificAdvice}
1. **靜心觀照**：未來七日內，不對重大變更做衝動決定，多聽、多看、少言。
2. **善待身邊善緣**：對待家人、伴侶與合作夥伴以寬厚為念，利他者必得天助。
3. **持正精進**：每日默念自己的一件感恩之事，讓正向能量在心中定錨。

⏳【神明祝福與時機指引】
時令交接之際（月圓或節氣前後），心中之結自會撥雲見日。${deity.name} 庇佑你闔家安泰、身心清吉、百邪不侵！`;

    return {
      source: "本地智慧演繹引擎",
      text
    };
  }
}

window.aiDivination = new AIDivinationEngine();


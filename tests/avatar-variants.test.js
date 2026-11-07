// 角色擴充（無繪圖）：所有組合都建得起來、動物特徵、舊造型代碼相容、非法選項回預設
const { makeEnvironment } = require("./light-env");

module.exports = {
  name: "角色版本與穿著（無繪圖）",
  async run({ check, note }) {
    const THREE = await import("three"), env = makeEnvironment(THREE), c = env.context;
    env.load("avatar/appearance.js");
    const run = src => env.run(src);
    const opts = run("AVATAR_OPTIONS");

    const makeParts = () => {
      const group = new THREE.Group(), head = new THREE.Group();
      const legs = [0, 1].map(() => { const obj = new THREE.Group(), mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()); obj.add(mesh); group.add(obj); return { obj, mesh, footY: -0.26 }; });
      group.add(head);
      return { group, head, legs };
    };
    c.__make = makeParts;

    let failures = [], total = 0;
    for (const character of Object.keys(opts.character.choices)) for (const body of Object.keys(opts.body.choices))
      for (const pants of Object.keys(opts.pants.choices)) for (const shoes of Object.keys(opts.shoes.choices)) {
        const p = makeParts(); total++;
        try { c.dressAvatar(p.group, { head: p.head, legs: p.legs }, { character, body, pants, shoes }); }
        catch (e) { failures.push(`${character}/${body}/${pants}/${shoes}: ${e.message}`); }
      }
    check(`全部 ${total} 種組合都建得起來`, failures.length === 0, failures.slice(0, 2).join(" | "));

    const human = makeParts(), cat = makeParts();
    c.dressAvatar(human.group, human, {});
    c.dressAvatar(cat.group, cat, { character: "cat" });
    check("動物比人類多了耳朵", cat.head.children.length > human.head.children.length);
    check("預設體型比例不變", human.group.scale.x === 1 && human.group.scale.y === 1);

    const child = makeParts(), plump = makeParts();
    c.dressAvatar(child.group, child, { body: "child" });
    c.dressAvatar(plump.group, plump, { body: "plump" });
    check("小童比較矮、頭比較大", child.group.scale.y < 1 && child.head.scale.x > 1);
    check("圓潤比較寬", plump.group.scale.x > 1);

    const hairHead = new THREE.Group(), animalHead = new THREE.Group();
    c.buildAvatarHair(hairHead, { hair: "spiky" });
    c.buildAvatarHair(animalHead, { hair: "spiky", character: "bear" });
    check("新髮型有模型", hairHead.children.length > 3);
    check("動物不戴頭髮", animalHead.children.length === 0);
    check("動物以毛色取代膚色", c.avatarSkinColor({ character: "bear", skin: "fair" }) !== c.avatarSkinColor({ skin: "fair" }));

    const bad = c.normalizeLook({ character: "<img>", body: "constructor", pants: "__proto__", shoes: 1 });
    check("非法選項回預設", bad.character === "human" && bad.body === "standard" && bad.pants === "long" && bad.shoes === "cloth", JSON.stringify(bad));
    const hostile = makeParts();
    c.dressAvatar(hostile.group, hostile, { character: "x", body: "y", pantsColor: "z", shoesColor: "w" });
    check("同行送來亂資料也建得起來", hostile.group.scale.x === 1);

    const code = c.encodeLookCode({ character: "rabbit", body: "tall", pants: "skirt", pantsColor: "cream", shoes: "boots", shoesColor: "gold", hair: "bob", robeColor: "#112233" });
    const back = c.decodeLookCode(code);
    check("新代碼來回一致", back.character === "rabbit" && back.body === "tall" && back.pants === "skirt" && back.shoes === "boots" && back.shoesColor === "gold" && back.hair === "bob", code);
    const old = c.decodeLookCode("TP-10000010-c24b2b");
    check("舊八碼代碼仍可解", !!old && old.hair === "short" && old.robeColor === "#c24b2b", JSON.stringify(old));
    check("舊代碼的新欄位用預設", old?.character === "human" && old?.body === "standard");
    check("長度不對的代碼拒絕", c.decodeLookCode("TP-1000-c24b2b") === null);
    note("只建立幾何，未建立渲染器或瀏覽器。");
  }
};

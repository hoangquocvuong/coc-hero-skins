const fs = require("fs");

const HERO_MAP = {
  "Barbarian King": "barbarian-king.json",
  "Archer Queen": "archer-queen.json",
  "Grand Warden": "grand-warden.json",
  "Royal Champion": "royal-champion.json",
  "Minion Prince": "minion-prince.json",
  "Dragon Duke": "dragon-duke.json"
};

function safeRead(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function backup(file) {
  if (!fs.existsSync(file)) return;

  const dir = "./backup";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const name = file.replace(".json", "");
  const date = new Date().toISOString().slice(0, 10);

  fs.copyFileSync(file, `${dir}/${name}.${date}.json`);
}

function normalize(s) {
  return {
    name: s.name || "",
    hero: s.hero || "",
    year: s.year || "",
    month: s.month || "",
    rarity: s.rarity || "",
    source: s.source || "",
    set: s.set || "",
    image: s.image || ""
  };
}

function main() {
  console.log("🔄 Validating hero skins...");

  let total = 0;

  for (const hero of Object.keys(HERO_MAP)) {
    const file = HERO_MAP[hero];

    const data = safeRead(file);
    if (!data || !Array.isArray(data.skins)) {
      console.log("❌ Invalid:", hero);
      continue;
    }

    backup(file);

    const skins = data.skins.map(normalize);

    const out = {
      hero,
      updated: new Date().toISOString().slice(0, 10),
      count: skins.length,
      skins
    };

    fs.writeFileSync(file, JSON.stringify(out, null, 2));

    total += skins.length;

    console.log(`✔ ${hero}: ${skins.length}`);
  }

  const index = {
    updated: new Date().toISOString().slice(0, 10),
    total,
    heroes: Object.entries(HERO_MAP).map(([name, file]) => {
      const d = safeRead(file);
      return {
        id: name.toLowerCase().replace(/\s+/g, "_"),
        name,
        file,
        count: d?.count || 0
      };
    })
  };

  fs.writeFileSync("hero-skins.json", JSON.stringify(index, null, 2));

  console.log("TOTAL:", total);
}

main();

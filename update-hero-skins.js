const fs = require("fs");

const HERO_MAP = {
  "Barbarian King": "barbarian-king.json",
  "Archer Queen": "archer-queen.json",
  "Grand Warden": "grand-warden.json",
  "Royal Champion": "royal-champion.json",
  "Minion Prince": "minion-prince.json",
  "Dragon Duke": "dragon-duke.json"
};

// đọc file an toàn
function safeRead(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

// backup trước khi ghi
function backup(file) {
  if (!fs.existsSync(file)) return;

  const dir = "./backup";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const name = file.replace(".json", "");
  const date = new Date().toISOString().slice(0, 10);

  fs.copyFileSync(file, `${dir}/${name}.${date}.json`);
}

// chuẩn hoá skin
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
  const heroes = [];

  for (const [heroName, file] of Object.entries(HERO_MAP)) {
    const data = safeRead(file);

    if (!data || !Array.isArray(data.skins)) {
      console.log("❌ Invalid:", heroName);
      continue;
    }

    backup(file);

    const skins = data.skins.map(normalize);

    // ghi lại file chuẩn hoá
    const out = {
      hero: heroName,
      updated: new Date().toISOString().slice(0, 10),
      count: skins.length,
      skins
    };

    fs.writeFileSync(file, JSON.stringify(out, null, 2));

    total += skins.length;

    heroes.push({
      id: heroName.toLowerCase().replace(/\s+/g, "_"),
      name: heroName,
      file,
      count: skins.length // 🔥 FIX CHUẨN
    });

    console.log(`✔ ${heroName}: ${skins.length}`);
  }

  // index file
  const index = {
    updated: new Date().toISOString().slice(0, 10),
    total,
    heroes
  };

  fs.writeFileSync("hero-skins.json", JSON.stringify(index, null, 2));

  console.log("TOTAL:", total);
}

main();

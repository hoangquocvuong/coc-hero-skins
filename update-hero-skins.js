const fs = require("fs");

const HERO_MAP = {
  "Barbarian King": "barbarian-king.json",
  "Archer Queen": "archer-queen.json",
  "Grand Warden": "grand-warden.json",
  "Royal Champion": "royal-champion.json",
  "Minion Prince": "minion-prince.json",
  "Dragon Duke": "dragon-duke.json"
};

// =========================
// SAFE UTIL
// =========================

function safeRead(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function backup(file) {
  if (!fs.existsSync(file)) return;

  ensureDir("./backup");

  const name = file.replace(".json", "");
  const date = new Date().toISOString().slice(0, 10);

  fs.copyFileSync(
    file,
    `./backup/${name}.${date}.json`
  );
}

function normalize(item) {
  return {
    name: item.name || "",
    hero: item.hero || "",
    year: item.year || "",
    month: item.month || "",
    rarity: item.rarity || "",
    source: item.source || "",
    set: item.set || "",
    image: item.image || ""
  };
}

// =========================
// DATA SOURCE (NO SCRAPE)
// =========================
// 👉 THAY THẾ FILE NÀY BẰNG DATA THẬT CỦA BẠN
// ví dụ export từ manual / API / JSON dump
// =========================

function loadSourceData() {
  const file = "./data/hero-skins-source.json";

  if (!fs.existsSync(file)) {
    console.log("❌ Missing source file:", file);
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// =========================
// MAIN
// =========================

async function main() {
  console.log("🚀 Loading hero skins source...");

  const allSkins = loadSourceData().map(normalize);

  // =========================
  // SAFETY CHECK 1
  // =========================
  if (!allSkins.length) {
    console.log("❌ NO DATA FOUND → STOP (prevent overwrite)");
    process.exit(1);
  }

  const grouped = {};
  for (const hero of Object.keys(HERO_MAP)) {
    grouped[hero] = [];
  }

  for (const skin of allSkins) {
    if (grouped[skin.hero]) {
      grouped[skin.hero].push(skin);
    }
  }

  let total = 0;

  // =========================
  // WRITE HERO FILES
  // =========================

  for (const hero of Object.keys(HERO_MAP)) {
    const file = HERO_MAP[hero];

    backup(file);

    const old = safeRead(file);
    const skins = grouped[hero] || [];

    // =========================
    // SAFETY CHECK 2 (anti data loss)
    // =========================
    if (old?.skins?.length) {
      const ratio = skins.length / old.skins.length;

      if (ratio < 0.6) {
        console.log(
          `⚠️ SKIP ${hero} (too much data drop: ${Math.round(ratio * 100)}%)`
        );
        continue;
      }
    }

    total += skins.length;

    const output = {
      hero,
      updated: new Date().toISOString().slice(0, 10),
      count: skins.length,
      skins
    };

    fs.writeFileSync(
      file,
      JSON.stringify(output, null, 2),
      "utf8"
    );

    console.log(`✅ ${hero}: ${skins.length}`);
  }

  // =========================
  // INDEX FILE
  // =========================

  const index = {
    updated: new Date().toISOString().slice(0, 10),
    total,
    heroes: Object.keys(HERO_MAP).map(hero => {
      const data = safeRead(HERO_MAP[hero]);

      return {
        id: hero.toLowerCase().replace(/\s+/g, "_"),
        name: hero,
        file: HERO_MAP[hero],
        count: data?.count || 0
      };
    })
  };

  fs.writeFileSync(
    "hero-skins.json",
    JSON.stringify(index, null, 2),
    "utf8"
  );

  // =========================
  // SNAPSHOT (ROLLBACK SAFE)
  // =========================

  ensureDir("./backup");

  fs.writeFileSync(
    "./backup/last-good.json",
    JSON.stringify(index, null, 2)
  );

  console.log("================================");
  console.log("TOTAL SKINS:", total);
  console.log("DONE SAFE BUILD");
  console.log("================================");

  // =========================
  // FINAL SAFETY CHECK
  // =========================

  if (total < 100) {
    console.log("❌ WARNING: TOTAL TOO LOW (possible broken data)");
  }
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});

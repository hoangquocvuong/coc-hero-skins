const fs = require("fs");

const URL = "https://www.clashofclansvault.win/wiki/hero-skins";

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

function backupFile(file) {
  if (!fs.existsSync(file)) return;

  const backupDir = "./backup";
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  const name = file.replace(".json", "");
  const time = new Date().toISOString().slice(0, 10);

  fs.copyFileSync(file, `${backupDir}/${name}.${time}.json`);
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

async function scrape() {
  const res = await fetch(URL);
  const html = await res.text();

  // fallback parser cực đơn giản (tránh regex fail = 0)
  const skins = [];

  const matches = [...html.matchAll(/data-skin="([^"]+)"/g)];

  for (const m of matches) {
    try {
      const obj = JSON.parse(m[1]);
      skins.push(normalize(obj));
    } catch {}
  }

  return skins;
}

async function main() {
  console.log("Fetching skins...");

  const allSkins = await scrape();

  const grouped = {};
  for (const hero of Object.keys(HERO_MAP)) {
    grouped[hero] = [];
  }

  for (const s of allSkins) {
    if (grouped[s.hero]) grouped[s.hero].push(s);
  }

  let total = 0;

  // 🛑 SAFETY CHECK 1: nếu scrape fail hoàn toàn
  if (!allSkins.length) {
    console.log("❌ SCRAPE FAILED - NO DATA FOUND (STOP)");
    process.exit(1);
  }

  for (const hero of Object.keys(HERO_MAP)) {
    const file = HERO_MAP[hero];

    // 🛑 BACKUP TRƯỚC KHI GHI
    backupFile(file);

    const old = safeRead(file);

    const skins = grouped[hero].map(normalize);

    // 🛑 SAFETY CHECK 2: không cho giảm dữ liệu nghiêm trọng
    if (old && old.skins && skins.length < old.skins.length * 0.5) {
      console.log(`❌ SKIP ${hero} (data dropped too much: ${skins.length})`);
      continue;
    }

    total += skins.length;

    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          hero,
          updated: new Date().toISOString().slice(0, 10),
          count: skins.length,
          skins
        },
        null,
        2
      )
    );

    console.log(`${hero}: ${skins.length}`);
  }

  // index file
  const index = {
    updated: new Date().toISOString().slice(0, 10),
    total,
    heroes: Object.entries(HERO_MAP).map(([name, file]) => {
      const data = safeRead(file);
      return {
        id: name.toLowerCase().replace(/\s+/g, "_"),
        name,
        file,
        count: data?.count || 0
      };
    })
  };

  fs.writeFileSync("hero-skins.json", JSON.stringify(index, null, 2));

  console.log("TOTAL:", total);

  // 🛑 SAFETY CHECK 3: tổng phải hợp lý
  if (total < 100) {
    console.log("❌ TOTAL TOO LOW - ABORT WARNING");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

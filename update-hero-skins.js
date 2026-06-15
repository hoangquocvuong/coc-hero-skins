const fs = require("fs");

const URL = "https://www.clashofclansvault.win/wiki/hero-skins";

const HERO_MAP = {
  "Barbarian King": "barbarian-king.json",
  "Archer Queen": "archer-queen.json",
  "Grand Warden": "grand-warden.json",
  "Royal Champion": "royal-champion.json",
  "Minion Prince": "minion-prince.json"
};

function cleanText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function heroFolder(hero) {
  return String(hero || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getImageUrl(hero, skinName) {
  return `https://hoangquocvuong.github.io/coc-hero-images/${heroFolder(hero)}/${slugify(skinName)}.png`;
}

function backup(file) {
  if (!fs.existsSync(file)) return;
  const dir = "./backup";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const date = new Date().toISOString().slice(0, 10);
  fs.copyFileSync(file, `${dir}/${file}.${date}.bak.json`);
}

function safeRead(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function normalize(item) {
  return {
    name: cleanText(item.name),
    hero: cleanText(item.hero),
    year: item.year || "",
    month: item.month || "",
    rarity: item.rarity || "Legendary",
    source: item.source || "",
    set: item.set || "",
    image: getImageUrl(item.hero, item.name)
  };
}

/**
 * ====== CRAWLER (FIXED STABILITY) ======
 */
async function fetchAutoSkins() {
  console.log("🔄 Fetching Vault...");

  const res = await fetch(URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 coc-skins-bot"
    }
  });

  if (!res.ok) {
    console.log("❌ Fetch failed:", res.status);
    return [];
  }

  const html = await res.text();

  const text = cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );

  const re =
    /\b(BK|AQ|GW|RC|MP)\s+(.+?)\s+(Barbarian King|Archer Queen|Grand Warden|Royal Champion|Minion Prince)\s+(Legendary|Gold Pass|Standard)\s+(.+?)(?=\s+\b(?:BK|AQ|GW|RC|MP)\b|$)/gi;

  const skins = [];
  let m;

  while ((m = re.exec(text)) !== null) {
    const hero = cleanText(m[3]);
    const name = cleanText(m[2]);

    if (!hero || !name) continue;
    if (!HERO_MAP[hero]) continue;

    skins.push({
      hero,
      name,
      rarity: m[4],
      source: cleanText(m[5]),
      year: "",
      month: ""
    });
  }

  console.log("📦 Parsed skins:", skins.length);

  return skins;
}

/**
 * ====== MERGE SAFE ======
 */
function merge(oldData, newData) {
  const map = new Map();

  const put = (item) => {
    const key = item.hero + "|" + item.name;
    map.set(key, item);
  };

  (oldData || []).forEach(put);
  (newData || []).forEach(put);

  return Array.from(map.values());
}

async function main() {
  console.log("🚀 Hero Skin Crawler Start");

  const autoSkins = await fetchAutoSkins();

  // ❌ SAFE GUARD: nếu crawl fail → KHÔNG ghi đè
  if (!autoSkins.length || autoSkins.length < 150) {
    console.log("❌ Abort update: data suspicious (<150)");
    console.log("🛑 Keep old data");
    return;
  }

  let totalNew = 0;

  for (const hero of Object.keys(HERO_MAP)) {
    const file = HERO_MAP[hero];

    const old = safeRead(file);
    const oldSkins = old?.skins || [];

    const heroNew = autoSkins.filter(s => s.hero === hero);

    const merged = merge(oldSkins, heroNew).map(normalize);

    // ❌ nếu không có thay đổi → skip
    if (merged.length === oldSkins.length) {
      console.log("⏭ No update:", hero);
      continue;
    }

    backup(file);

    const out = {
      hero,
      updated: new Date().toISOString().slice(0, 10),
      count: merged.length,
      skins: merged
    };

    fs.writeFileSync(file, JSON.stringify(out, null, 2));

    console.log("✔ Updated:", hero, merged.length);
    totalNew += merged.length;
  }

  // index file
  const index = {
    updated: new Date().toISOString().slice(0, 10),
    total: totalNew
  };

  fs.writeFileSync("hero-skins.json", JSON.stringify(index, null, 2));

  console.log("✅ DONE TOTAL:", totalNew);
}

main().catch(err => {
  console.error("❌ ERROR:", err);
});

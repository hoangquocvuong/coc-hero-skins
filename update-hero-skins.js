const fs = require("fs");

const URL = "https://www.clashofclansvault.win/wiki/hero-skins";

/**
 * ===== HERO MAP (FIXED + ADD DRAGON DUKE) =====
 */
const HERO_MAP = {
  "Barbarian King": "barbarian-king.json",
  "Archer Queen": "archer-queen.json",
  "Grand Warden": "grand-warden.json",
  "Royal Champion": "royal-champion.json",
  "Minion Prince": "minion-prince.json",
  "Dragon Duke": "dragon-duke.json" // ✅ FIX HERE
};

/**
 * ===== HERO CODES (UPDATED) =====
 */
const HERO_CODES = {
  BK: "Barbarian King",
  AQ: "Archer Queen",
  GW: "Grand Warden",
  RC: "Royal Champion",
  MP: "Minion Prince",
  DD: "Dragon Duke" // ✅ ADD NEW HERO CODE
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

/**
 * ===== CRAWLER FIXED =====
 */
async function fetchAutoSkins() {
  console.log("🔄 Fetching Vault HTML...");

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

  /**
   * ✅ FIX REGEX: thêm DD
   */
  const re =
    /\b(BK|AQ|GW|RC|MP|DD)\s+(.+?)\s+(Barbarian King|Archer Queen|Grand Warden|Royal Champion|Minion Prince|Dragon Duke)\s+(Legendary|Gold Pass|Standard)\s+(.+?)(?=\s+\b(?:BK|AQ|GW|RC|MP|DD)\b|$)/gi;

  const skins = [];
  let m;

  while ((m = re.exec(text)) !== null) {
    const code = m[1];
    const name = cleanText(m[2]);
    const hero = cleanText(m[3]);
    const rarity = m[4];
    const source = cleanText(m[5]);

    if (!HERO_CODES[code]) continue;
    if (!HERO_MAP[hero]) continue;
    if (!name || name.length > 80) continue;

    skins.push({
      name,
      hero,
      rarity,
      source,
      year: "",
      month: "",
      set: "",
      image: getImageUrl(hero, name)
    });
  }

  console.log("📦 Parsed skins:", skins.length);
  return skins;
}

/**
 * ===== SAFE MERGE =====
 */
function merge(oldArr, newArr) {
  const map = new Map();

  const put = (x) => {
    const key = x.hero + "|" + x.name;
    map.set(key, x);
  };

  (oldArr || []).forEach(put);
  (newArr || []).forEach(put);

  return Array.from(map.values());
}

/**
 * ===== MAIN =====
 */
async function main() {
  console.log("🚀 Hero Skin Crawler Start");

  const autoSkins = await fetchAutoSkins();

  // ❌ SAFE GUARD: tránh mất data
  if (!autoSkins.length || autoSkins.length < 150) {
    console.log("❌ Abort update: data suspicious (<150)");
    console.log("🛑 Keep old data");
    return;
  }

  for (const hero of Object.keys(HERO_MAP)) {
    const file = HERO_MAP[hero];

    const oldData = safeRead(file);
    const oldSkins = oldData?.skins || [];

    const newSkins = autoSkins.filter(s => s.hero === hero);

    const merged = merge(oldSkins, newSkins);

    // ❌ nếu không thay đổi thì skip
    if (merged.length === oldSkins.length) {
      console.log("⏭ No change:", hero);
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
  }

  console.log("✅ DONE");
}

main().catch(err => {
  console.error("❌ ERROR:", err);
});

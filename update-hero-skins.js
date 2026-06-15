const fs = require("fs");

const URL = "https://www.clashofclansvault.win/wiki/hero-skins";
const MANUAL_FILE = "manual-skins.json";

const IMAGE_BASE =
  "https://hoangquocvuong.github.io/coc-hero-images/";

const HERO_MAP = {
  "Barbarian King": "barbarian-king.json",
  "Archer Queen": "archer-queen.json",
  "Grand Warden": "grand-warden.json",
  "Royal Champion": "royal-champion.json",
  "Minion Prince": "minion-prince.json"
};

const HERO_CODES = {
  BK: "Barbarian King",
  AQ: "Archer Queen",
  GW: "Grand Warden",
  RC: "Royal Champion",
  MP: "Minion Prince"
};

// ---------------- SAFE READ ----------------
function readExisting(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

// ---------------- CLEAN TEXT ----------------
function cleanText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

// ---------------- IMAGE ----------------
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
  return (
    IMAGE_BASE +
    heroFolder(hero) +
    "/" +
    slugify(skinName) +
    ".png"
  );
}

// ---------------- MONTH PARSE ----------------
function getMonthYear(text, index) {
  const before = text.slice(Math.max(0, index - 200), index);

  const m = before.match(
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(20\d{2})/i
  );

  if (!m) return { month: "", year: "" };

  return { month: m[1], year: m[2] };
}

// ---------------- SET NAME ----------------
function getSetFromName(name) {
  const bad = ["King", "Queen", "Warden", "Champion", "Prince"];

  const parts = String(name || "").split(" ").filter(Boolean);

  const filtered = parts.filter(p => !bad.includes(p));

  return filtered.length ? filtered.join(" ") : "";
}

// ---------------- NORMALIZE ----------------
function normalizeSkin(item) {
  const name = cleanText(item.name);
  const hero = cleanText(item.hero);

  return {
    name,
    hero,
    year: String(item.year || ""),
    month: String(item.month || ""),
    rarity: cleanText(item.rarity || "Legendary"),
    source: cleanText(item.source || ""),
    set: cleanText(item.set || getSetFromName(name)),
    image: getImageUrl(hero, name)
  };
}

// ---------------- MANUAL SKINS ----------------
function loadManualSkins() {
  if (!fs.existsSync(MANUAL_FILE)) return [];

  try {
    const data = JSON.parse(fs.readFileSync(MANUAL_FILE, "utf8"));

    if (!Array.isArray(data)) return [];

    return data
      .map(normalizeSkin)
      .filter(item => item.name && HERO_MAP[item.hero]);

  } catch {
    return [];
  }
}

// ---------------- FETCH ----------------
async function fetchAutoSkins() {
  console.log("Fetching:", URL);

  const res = await fetch(URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 coc-skin-crawler"
    }
  });

  if (!res.ok) {
    throw new Error("Fetch failed: " + res.status);
  }

  const html = await res.text();

  const text = cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );

  const all = [];

  const re =
    /\b(BK|AQ|GW|RC|MP)\s+(.+?)\s+(Barbarian King|Archer Queen|Grand Warden|Royal Champion|Minion Prince)\s+(Legendary|Gold Pass|Standard)\s+(.+?)(?=\s+\b(?:BK|AQ|GW|RC|MP)\b|\s*$)/gi;

  let match;

  while ((match = re.exec(text)) !== null) {
    const skinName = cleanText(match[2]);
    const hero = cleanText(match[3]);
    const rarity = cleanText(match[4]);
    const source = cleanText(match[5]);

    if (!HERO_MAP[hero]) continue;
    if (!skinName || skinName.length > 60) continue;

    const date = getMonthYear(text, match.index);

    all.push({
      name: skinName,
      hero,
      year: date.year,
      month: date.month,
      rarity,
      source,
      set: getSetFromName(skinName),
      image: getImageUrl(hero, skinName)
    });
  }

  return all;
}

// ---------------- MAIN ----------------
async function main() {
  console.log("🚀 Hero Skin Crawler Start");

  const autoSkins = await fetchAutoSkins();
  const manualSkins = loadManualSkins();

  console.log("📦 Parsed skins:", autoSkins.length);

  // ❌ GLOBAL SAFETY (CHẶN WIPE DATA)
  if (autoSkins.length < 200) {
    console.log("🛑 Abort update (<200)");
    console.log("🛑 Keep old data");
    return;
  }

  const merged = new Map();

  for (const s of autoSkins) {
    merged.set(s.hero + "|" + s.name, s);
  }

  for (const s of manualSkins) {
    merged.set(s.hero + "|" + s.name, s);
  }

  const unique = Array.from(merged.values());

  const grouped = {};
  Object.keys(HERO_MAP).forEach(h => (grouped[h] = []));

  unique.forEach(item => {
    if (grouped[item.hero]) {
      grouped[item.hero].push(item);
    }
  });

  const existing = {};
  for (const hero of Object.keys(HERO_MAP)) {
    existing[hero] = readExisting(HERO_MAP[hero]);
  }

  // ---------------- WRITE SAFE ----------------
  for (const hero of Object.keys(grouped)) {
    const newSkins = grouped[hero];
    const oldData = existing[hero];

    // ❌ không có data
    if (!newSkins || newSkins.length === 0) {
      console.log(`🛑 Skip ${hero} (empty → keep old)`);
      continue;
    }

    // ❌ giảm quá mạnh → giữ data cũ
    if (oldData && newSkins.length < oldData.skins.length * 0.5) {
      console.log(`⚠️ ${hero} suspicious drop → keep old`);
      continue;
    }

    newSkins.sort((a, b) => {
      const ay = Number(a.year || 0);
      const by = Number(b.year || 0);
      return by - ay || a.name.localeCompare(b.name);
    });

    const out = {
      hero,
      updated: new Date().toISOString().slice(0, 10),
      count: newSkins.length,
      skins: newSkins
    };

    fs.writeFileSync(
      HERO_MAP[hero],
      JSON.stringify(out, null, 2),
      "utf8"
    );

    console.log(`✔ ${hero}: ${newSkins.length}`);
  }

  const index = {
    updated: new Date().toISOString().slice(0, 10),
    total: unique.length,
    auto: autoSkins.length,
    manual: manualSkins.length,
    heroes: Object.keys(HERO_MAP).map(hero => ({
      id: hero.toLowerCase().replace(/\s+/g, "_"),
      name: hero,
      file: HERO_MAP[hero],
      count: grouped[hero]?.length || 0
    }))
  };

  fs.writeFileSync(
    "hero-skins.json",
    JSON.stringify(index, null, 2),
    "utf8"
  );

  console.log("TOTAL:", unique.length);
  console.log("Auto:", autoSkins.length);
  console.log("Manual:", manualSkins.length);
  console.log("Done.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

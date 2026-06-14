const fs = require("fs");

const URL = "https://www.clashofclansvault.win/wiki/hero-skins";

const IMAGE_BASE =
  "https://hoangquocvuong.github.io/coc-hero-images/";

/* =========================
   HERO CONFIG
========================= */

const HERO_MAP = {
  "Barbarian King": "barbarian-king.json",
  "Archer Queen": "archer-queen.json",
  "Grand Warden": "grand-warden.json",
  "Royal Champion": "royal-champion.json",
  "Minion Prince": "minion-prince.json",
  "Dragon Duke": "dragon-duke.json"
};

const HERO_KEYS = Object.keys(HERO_MAP);

/* =========================
   UTILS
========================= */

function cleanText(s) {
  return String(s || "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function normalizeHero(hero) {
  return cleanText(hero)
    .toLowerCase();
}

function findHero(realHero) {
  const h = normalizeHero(realHero);

  return HERO_KEYS.find(k =>
    k.toLowerCase() === h
  );
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
  return (
    IMAGE_BASE +
    heroFolder(hero) +
    "/" +
    slugify(skinName) +
    ".png"
  );
}

/* =========================
   FETCH
========================= */

async function fetchHTML() {
  const res = await fetch(URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 coc-scraper"
    }
  });

  if (!res.ok) {
    throw new Error("Fetch failed: " + res.status);
  }

  return await res.text();
}

/* =========================
   PARSE SAFE (NO REGEX DEPENDENCY CRITICAL)
========================= */

function extractSkins(text) {
  const results = [];

  const codes = ["BK", "AQ", "GW", "RC", "MP"];

  const re =
    /\b(BK|AQ|GW|RC|MP)\s+(.+?)\s+(Barbarian King|Archer Queen|Grand Warden|Royal Champion|Minion Prince|Dragon Duke)\s+(Legendary|Gold Pass|Standard)\s+(.+?)(?=\b(BK|AQ|GW|RC|MP)\b|$)/gi;

  let m;

  while ((m = re.exec(text)) !== null) {
    const code = m[1];
    const skinName = cleanText(m[2]);
    const heroRaw = cleanText(m[3]);
    const rarity = cleanText(m[4]);
    const source = cleanText(m[5]);

    const hero = findHero(heroRaw);

    if (!hero) continue;
    if (!skinName || skinName.length > 80) continue;

    results.push({
      hero,
      name: skinName,
      rarity,
      source,
      image: getImageUrl(hero, skinName)
    });
  }

  return results;
}

/* =========================
   GROUP SAFE
========================= */

function groupByHero(items) {
  const grouped = {};

  HERO_KEYS.forEach(h => grouped[h] = []);

  for (const item of items) {
    if (!grouped[item.hero]) continue;
    grouped[item.hero].push(item);
  }

  return grouped;
}

/* =========================
   VALIDATION (CRITICAL SAFETY)
========================= */

function validate(grouped) {
  let emptyHeroes = 0;

  for (const hero of HERO_KEYS) {
    if (grouped[hero].length === 0) {
      emptyHeroes++;
      console.warn("⚠️ EMPTY HERO:", hero);
    }
  }

  return emptyHeroes;
}

/* =========================
   WRITE SAFE FILE
========================= */

function writeHeroFiles(grouped) {
  let total = 0;

  for (const hero of HERO_KEYS) {
    const skins = grouped[hero];

    skins.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    total += skins.length;

    const fileData = {
      hero,
      updated: new Date().toISOString().slice(0, 10),
      count: skins.length,
      skins
    };

    fs.writeFileSync(
      HERO_MAP[hero],
      JSON.stringify(fileData, null, 2),
      "utf8"
    );

    console.log(hero + ":", skins.length);
  }

  return total;
}

/* =========================
   INDEX FILE
========================= */

function writeIndex(grouped, total) {
  const index = {
    updated: new Date().toISOString().slice(0, 10),
    total,
    heroes: HERO_KEYS.map(hero => ({
      id: hero.toLowerCase().replace(/\s+/g, "_"),
      name: hero,
      file: HERO_MAP[hero],
      count: grouped[hero].length
    }))
  };

  fs.writeFileSync(
    "hero-skins.json",
    JSON.stringify(index, null, 2),
    "utf8"
  );
}

/* =========================
   MAIN SAFE PIPELINE
========================= */

async function main() {
  console.log("Fetching:", URL);

  const html = await fetchHTML();

  const text = cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );

  const skins = extractSkins(text);

  console.log("Parsed skins:", skins.length);

  const grouped = groupByHero(skins);

  const emptyHeroes = validate(grouped);

  // 🚨 CRITICAL SAFETY: STOP IF BROKEN SCRAPE
  if (emptyHeroes >= 3) {
    console.error("❌ SCRAPER BROKEN - ABORTING");
    process.exit(1);
  }

  const total = writeHeroFiles(grouped);

  writeIndex(grouped, total);

  console.log("Total skins:", total);
  console.log("Done.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

const fs = require("fs");

const URL = "https://www.clashofclansvault.win/wiki/hero-skins";

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

const IMAGE_BASE =
  "https://hoangquocvuong.github.io/coc-hero-images/";

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
  return (
    IMAGE_BASE +
    heroFolder(hero) +
    "/" +
    slugify(skinName) +
    ".png"
  );
}

function getMonthYear(text, index) {
  const before = text.slice(
    Math.max(0, index - 200),
    index
  );

  const m = before.match(
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(20\d{2})/i
  );

  if (!m) return { month: "", year: "" };

  return {
    month: m[1],
    year: m[2]
  };
}

function getSetFromName(name) {
  const bad = [
    "King",
    "Queen",
    "Warden",
    "Champion",
    "Prince"
  ];

  const parts = String(name || "")
    .split(" ")
    .filter(Boolean);

  const filtered = parts.filter(
    p => !bad.includes(p)
  );

  return filtered.length
    ? filtered.join(" ")
    : "";
}

async function main() {
  console.log("Fetching:", URL);

  const res = await fetch(URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 cocbasepro-skin-scraper"
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
    /\b(BK|AQ|GW|RC|MP)\s+(.+?)\s+(Barbarian King|Archer Queen|Grand Warden|Royal Champion|Minion Prince)\s+(Legendary|Gold Pass|Standard)\s+(.+?)(?=\s+\b(?:BK|AQ|GW|RC|MP)\b|\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+20\d{2}|\s*$)/gi;

  let match;

  while ((match = re.exec(text)) !== null) {
    const code = match[1];
    const skinName = cleanText(match[2]);
    const hero = cleanText(match[3]);
    const rarity = cleanText(match[4]);

    const source = cleanText(match[5])
      .replace(/^Image\s*/i, "")
      .replace(/\s*Image$/i, "");

    if (!HERO_CODES[code]) continue;
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

  const unique = [];
  const seen = new Set();

  for (const item of all) {
    const key = `${item.hero}|${item.name}`;

    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(item);
  }

  const grouped = {};

  Object.keys(HERO_MAP).forEach(hero => {
    grouped[hero] = [];
  });

  unique.forEach(item => {
    grouped[item.hero].push(item);
  });

  for (const hero of Object.keys(grouped)) {
    grouped[hero].sort((a, b) => {
      const ay = Number(a.year || 0);
      const by = Number(b.year || 0);

      return (
        by - ay ||
        a.name.localeCompare(b.name)
      );
    });

    const fileData = {
      hero,
      updated:
        new Date().toISOString().slice(0, 10),
      count: grouped[hero].length,
      skins: grouped[hero]
    };

    fs.writeFileSync(
      HERO_MAP[hero],
      JSON.stringify(fileData, null, 2),
      "utf8"
    );

    console.log(
      hero + ":",
      grouped[hero].length,
      "skins"
    );
  }

  const index = {
    updated:
      new Date().toISOString().slice(0, 10),
    total: unique.length,
    heroes: Object.keys(HERO_MAP).map(hero => ({
      id: hero
        .toLowerCase()
        .replace(/\s+/g, "_"),
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

  console.log("Total skins:", unique.length);
  console.log("Done.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
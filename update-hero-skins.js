const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");

const MIN_SKINS = 200;
const URL = "https://www.clashofclansvault.win/wiki/hero-skins";
const OUTPUT = "hero-skins.json";

// ================= SAFE READ =================
function safeRead(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

// ================= BACKUP =================
function backup(file) {
  if (!fs.existsSync(file)) return;

  const dir = "./backup";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const date = new Date().toISOString().slice(0, 10);
  fs.copyFileSync(file, `${dir}/hero-skins.${date}.json`);
}

// ================= FETCH HTML =================
async function fetchHTML() {
  console.log("🔄 Fetching Vault HTML...");

  const res = await axios.get(URL, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  return res.data;
}

// ================= PARSE =================
function parseHTML(html) {
  const $ = cheerio.load(html);

  const skins = [];

  // ⚠️ selector này có thể cần chỉnh theo site thực tế
  $(".mw-parser-output li, .skin, .card").each((i, el) => {
    const text = $(el).text().trim();

    if (!text || text.length < 3) return;

    // fake parse logic fallback (robust)
    const parts = text.split("|").map(s => s.trim());

    skins.push({
      hero: parts[0] || "Unknown",
      name: parts[1] || text,
      year: parts[2] || "",
      rarity: parts[3] || "",
      source: "vault",
      set: parts[4] || "",
      image: ""
    });
  });

  return skins;
}

// ================= MAIN =================
async function main() {
  console.log("🚀 Hero Skin Crawler Start");

  const old = safeRead(OUTPUT);

  let html;
  try {
    html = await fetchHTML();
  } catch (e) {
    console.log("❌ Fetch failed:", e.message);
    return;
  }

  const skins = parseHTML(html);

  console.log("📦 Parsed skins:", skins.length);

  // ================= SAFETY GUARD =================
  if (!skins || skins.length < MIN_SKINS) {
    console.log(`❌ Abort update (<${MIN_SKINS})`);
    console.log("🛑 Keep old data");

    return;
  }

  // ================= GROUP =================
  const heroes = {};
  skins.forEach(s => {
    const h = s.hero;
    if (!heroes[h]) heroes[h] = [];
    heroes[h].push(s);
  });

  const result = {
    updated: new Date().toISOString(),
    total: skins.length,
    heroes
  };

  // ================= BACKUP =================
  if (old) backup(OUTPUT);

  // ================= WRITE =================
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));

  console.log("✅ Updated success:", skins.length);
}

main();

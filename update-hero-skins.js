const fs = require("fs");

const HERO_MAP = {
  "Barbarian King": "barbarian-king.json",
  "Archer Queen": "archer-queen.json",
  "Grand Warden": "grand-warden.json",
  "Royal Champion": "royal-champion.json",
  "Minion Prince": "minion-prince.json",
  "Dragon Duke": "dragon-duke.json"
};

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

function normalizeSkin(hero, skin) {

  return {

    name: String(skin.name || "").trim(),

    hero,

    year: String(skin.year || ""),

    month: String(skin.month || ""),

    rarity: String(skin.rarity || ""),

    source: String(skin.source || ""),

    set: String(skin.set || ""),

    image: String(skin.image || "")

  };

}

function build() {

  console.log("");

  console.log("🚀 HERO SKINS BUILD");

  console.log("");

  let total = 0;

  const heroes = [];

  for (const hero of Object.keys(HERO_MAP)) {

    const file = HERO_MAP[hero];

    const data = readJSON(file);

    const skins = (data.skins || []).map(item =>
      normalizeSkin(hero, item)
    );

    const output = {

      hero,

      updated: new Date()
        .toISOString()
        .slice(0, 10),

      count: skins.length,

      skins

    };

    writeJSON(file, output);

    heroes.push({

      id: hero
        .toLowerCase()
        .replace(/\s+/g, "_"),

      name: hero,

      file,

      count: skins.length

    });

    total += skins.length;

    console.log(
      "✔",
      hero,
      skins.length
    );

  }

  writeJSON("hero-skins.json", {

    updated: new Date()
      .toISOString()
      .slice(0, 10),

    total,

    heroes

  });

  console.log("");

  console.log("TOTAL :", total);

  console.log("DONE");

}

build();

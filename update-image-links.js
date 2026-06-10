const fs = require("fs");

const BASE =
"https://hoangquocvuong.github.io/coc-hero-images/";

const files = [
  "barbarian-king.json",
  "archer-queen.json",
  "grand-warden.json",
  "royal-champion.json",
  "minion-prince.json"
];

function slug(str){
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-|-$/g,"");
}

for(const file of files){

  const data =
    JSON.parse(
      fs.readFileSync(file,"utf8")
    );

  const folder =
    file.replace(".json","");

  data.skins.forEach(s=>{

    s.image =
      BASE +
      folder +
      "/" +
      slug(s.name) +
      ".png";

  });

  fs.writeFileSync(
    file,
    JSON.stringify(data,null,2)
  );

  console.log(
    "Updated:",
    file
  );
}

console.log("DONE");
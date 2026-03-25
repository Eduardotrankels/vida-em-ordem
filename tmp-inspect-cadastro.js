const fs = require("fs");

const source = fs.readFileSync("app/cadastro.tsx", "utf8");
const markers = [
  'googleButton',
  'language.cardTitle',
  'config.regionTitle',
  'config.currencyTitle',
  'styles.heroCard',
];

for (const marker of markers) {
  const index = source.indexOf(marker);
  console.log(`\n--- ${marker} @ ${index} ---\n`);
  console.log(source.slice(Math.max(0, index - 400), index + 1200));
}

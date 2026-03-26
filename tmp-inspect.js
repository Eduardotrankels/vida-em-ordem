const fs = require("fs");

const file = process.argv[2];
const snippets = process.argv.slice(3);
const text = fs.readFileSync(file, "utf8");

for (const snippet of snippets) {
  let index = text.indexOf(snippet);
  if (index === -1) {
    console.log(`\n### ${snippet} @ -1`);
    continue;
  }

  while (index !== -1) {
    console.log(`\n### ${snippet} @ ${index}`);
    console.log(text.slice(index, index + 2200));
    index = text.indexOf(snippet, index + snippet.length);
  }
}

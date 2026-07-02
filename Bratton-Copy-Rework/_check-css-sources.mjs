import * as fs from "fs";

const files = ["css/main.css", "css/home.css", "css/header.css", "css/angular.css"];
const classes = ["conditions-grid", "services-grid", "insurance-logos", "section--accent", "section--alt", "section--dark", "ml-tabs"];

for (const file of files) {
  if (fs.existsSync(file)) {
    const c = fs.readFileSync(file, "utf8");
    console.log(`\n=== ${file} (${(c.length / 1024).toFixed(1)}KB) ===`);
    for (const cl of classes) {
      const escaped = cl.replace(/[-\/\\^$*+?.()|\[\]{}]/g, "\\$&");
      const count = (c.match(new RegExp(escaped, "gi")) || []).length;
      console.log(`  ${count ? "FOUND" : "MISSING"}: ${cl} (${count})`);
    }
  } else {
    console.log(`\n=== ${file} NOT FOUND ===`);
  }
}
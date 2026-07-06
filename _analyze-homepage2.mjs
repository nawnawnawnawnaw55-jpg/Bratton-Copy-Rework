import * as fs from "fs";

const hv = fs.readFileSync("_vercel_homepage.html", "utf8");

// Extract all class values
const allClasses = [];
const re = /class="([^"]+)"/g;
let m;
while ((m = re.exec(hv)) !== null) {
  allClasses.push(m[1]);
}

console.log("All class attributes in vercel homepage:");
allClasses.forEach((c, i) => console.log(`  ${i + 1}: ${c}`));
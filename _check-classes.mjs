import * as fs from "fs";

const home = fs.readFileSync("_vercel_homepage.html", "utf8");
const classes = new Set();
const m = home.matchAll(/class="([^"]+)"/g);
for (const c of m) {
  c[1].split(/\s+/).forEach(cl => classes.add(cl));
}

const pc = fs.readFileSync("preview.css", "utf8");
let missing = [];
classes.forEach(c => {
  if (!pc.includes("." + c + "{") && !pc.includes("." + c + " ") &&
      !pc.includes("." + c + ",") && !pc.includes("." + c + ":")) {
    missing.push(c);
  }
});

console.log("Classes in live HTML but MISSING from preview.css:");
let printed = 0;
for (const cls of missing) {
  // Skip utility classes, empty, etc.
  if (!cls || cls === "revealed" || cls.startsWith("at-")) continue;
  console.log(cls);
  printed++;
}
console.log("\nTotal missing/homepage classes:", printed);
console.log("Total unique classes in live HTML:", classes.size);
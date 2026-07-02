import { readFileSync } from 'fs';

const sections = JSON.parse(readFileSync('_sections/homepage.json', 'utf8'));

// Find hero snippet
const heroKeys = Object.keys(sections.snippets);
console.log('Total snippets:', heroKeys.length);

for (const [id, snippet] of Object.entries(sections.snippets)) {
  if (snippet.previewContext && snippet.previewContext.includes('hero')) {
    console.log(`\n=== HERO SNIPPET ${id} ===`);
    console.log('tagName:', snippet.tagName);
    console.log('selector:', snippet.locations?.[0]?.selector);
    console.log('originalHtml:', snippet.originalHtml?.slice(0, 500));
    console.log('previewContext:', snippet.previewContext?.slice(0, 500));
    break;
  }
}

// Check if there's a snippet for the hero section wrapper itself
console.log('\n=== ALL SNIPPETS WITH "hero" IN PREVIEW ===');
for (const [id, snippet] of Object.entries(sections.snippets)) {
  if (snippet.previewContext && snippet.previewContext.toLowerCase().includes('hero')) {
    console.log(`ID ${id}: tag=${snippet.tagName}, selector=${snippet.locations?.[0]?.selector}`);
  }
}
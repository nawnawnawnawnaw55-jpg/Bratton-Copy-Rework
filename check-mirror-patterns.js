// Check patterns in mirror library pages
const fs = require('fs');
const path = require('path');

// Check a content page
const contentFile = 'bratton-pt-mirror-main/library_shoulder_26/index.html';
const c = fs.readFileSync(contentFile, 'utf8');

console.log('=== library_shoulder_26 (content page) ===');
console.log('Has articleArea id?', /id=["']articleArea["']/i.test(c));
console.log('Has ml-article id?', /id=["']ml-article["']/i.test(c));
console.log('Has med-lib-body?', /id=["']med-lib-body["']/i.test(c));
console.log('Has Other Choices?', /Other Choices/.test(c));
console.log('Has ml_body_links_seo?', /ml_body_links_seo/.test(c));
console.log('Has disclaimer?', /disclaimer/i.test(c));
console.log('Has meta description?', /<meta\s+name=["']description["']/i.test(c));
console.log('Has title?', /<title>/i.test(c));

// Check a parent page 
const parentFile = 'bratton-pt-mirror-main/library_shoulder/index.html';
if (fs.existsSync(parentFile)) {
  const p = fs.readFileSync(parentFile, 'utf8');
  console.log('\n=== library_shoulder (parent page) ===');
  console.log('Has articleArea id?', /id=["']articleArea["']/i.test(p));
  console.log('Has ml-article id?', /id=["']ml-article["']/i.test(p));
  console.log('Has med-lib-body?', /id=["']med-lib-body["']/i.test(p));
  console.log('Has Other Choices?', /Other Choices/.test(p));
  console.log('Has ml_body_links_seo?', /ml_body_links_seo/.test(p));
  console.log('Has disclaimer?', /disclaimer/i.test(p));
}

// Check a 403 page
const forbiddenFile = 'bratton-pt-mirror-main/library_knee_16/index.html';
if (fs.existsSync(forbiddenFile)) {
  const f = fs.readFileSync(forbiddenFile, 'utf8');
  console.log('\n=== library_knee_16 (403 page) ===');
  console.log('Has 403 Forbidden?', /403 Forbidden/.test(f));
}

// Check a treatments content page
const treatFile = 'bratton-pt-mirror-main/library_treatments_40/index.html';
if (fs.existsSync(treatFile)) {
  const t = fs.readFileSync(treatFile, 'utf8');
  console.log('\n=== library_treatments_40 (should be content) ===');
  console.log('Has articleArea id?', /id=["']articleArea["']/i.test(t));
  console.log('Has ml-article id?', /id=["']ml-article["']/i.test(t));
  console.log('Has med-lib-body?', /id=["']med-lib-body["']/i.test(t));
  console.log('Has Other Choices?', /Other Choices/.test(t));
  const articleMatch = t.match(/id=["']articleArea["'][^>]*>([\s\S]*?)<\/div>/i);
  if (articleMatch) {
    console.log('Article content length:', articleMatch[1].length);
  }
}
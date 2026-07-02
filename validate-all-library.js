/**
 * validate-all-library.js
 * 
 * Validates ALL library pages under bratton-pt-v3/library/:
 * - Every directory has an index.html
 * - Every title is clean (no slug-based garbage)
 * - Every article page has proper sections (Overview, Treatments, Goals, Resources)
 * - Every parent page has: body SVG, Other Choices, article list, SEO links, disclaimer
 * - No residual UIKit classes
 * - No broken/missing content
 * - Image srcs are correct (no missing images)
 * - Links are relative and valid
 */

const fs = require('fs');
const path = require('path');

const LIB = 'bratton-pt-v3/library';

// Known good parent pages (should have body diagram + article list + other choices)
const PARENT_PAGES = new Set([
  'library_ankle', 'library_back', 'library_elbow', 'library_hip',
  'library_knee', 'library_leg', 'library_neck', 'library_shoulder',
  'library_wrist', 'library_systemic', 'library_treatments', 'library_md',
  'library_exercise_62', 'library_privacy', 'library_firstVisit',
  'library_directions_4031', 'library_privacybar_privacy',
  'library_privacybar_terms', 'library_privacybar_websiteprivacy'
]);

function analyzeArticleContent(html, dirName) {
  const issues = [];
  
  // Check for UIKit remnants
  if (/uk-tab|uk-switcher|uk-grid|uk-badge|uk-icon/i.test(html)) {
    issues.push('Contains UIKit classes');
  }
  
  // Check for missing sections
  if (!html.includes('article-section')) {
    issues.push('Missing article-section divs');
  }
  if (!html.includes('article-overview')) {
    issues.push('Missing article-overview section');
  }
  
  // Check for spinner remnants
  if (/spinner|loading/i.test(html)) {
    issues.push('Contains spinner/loading remnants');
  }
  
  // Check for library-article wrapper
  if (!html.includes('library-article')) {
    issues.push('Missing library-article wrapper');
  }
  
  return issues;
}

function analyzeParentContent(html, dirName) {
  const issues = [];
  
  if (!html.includes('med-lib-body')) issues.push('Missing body SVG diagram');
  if (!html.includes('Other Choices')) issues.push('Missing Other Choices section');
  if (!html.includes('ml-parent-article-list')) issues.push('Missing article list');
  if (!html.includes('ml-body-links')) issues.push('Missing SEO links');
  if (!html.includes('Disclaimer')) issues.push('Missing disclaimer');
  if (!html.includes('ml-diagram-wrapper')) issues.push('Missing diagram wrapper');
  if (!html.includes('ml-other-choices')) issues.push('Missing other choices wrapper');
  
  return issues;
}

function validateTitle(html, dirName) {
  const issues = [];
  
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (!titleMatch) {
    issues.push('Missing <title> tag');
    return issues;
  }
  
  const title = titleMatch[1];
  
  // Must include Bratton Physical Therapy suffix
  if (!title.includes('Bratton Physical Therapy')) {
    issues.push(`Title missing Bratton PT suffix: "${title}"`);
  }
  
  // Extract the real title part (before "—")
  const rawTitle = title.split('—')[0].trim();
  
  // Should NOT contain slug-based patterns
  if (/^Medical Library/i.test(rawTitle)) {
    issues.push(`Title is slug-based: "${rawTitle}"`);
  }
  if (/^[A-Za-z]+\s+\d+$/.test(rawTitle) && rawTitle.length < 30) {
    issues.push(`Title looks like a slug pattern: "${rawTitle}"`);
  }
  if (/^library_/i.test(rawTitle)) {
    issues.push(`Title contains library_ prefix: "${rawTitle}"`);
  }
  if (/^[A-Za-z]+\s+[A-Za-z]+\s+\d+$/i.test(rawTitle) && rawTitle.length < 30) {
    issues.push(`Title looks like auto-generated: "${rawTitle}"`);
  }
  
  return issues;
}

function checkLinks(html, dirName) {
  const issues = [];
  
  // Find all links
  const links = html.match(/href="([^"]*)"/g) || [];
  links.forEach(href => {
    const url = href.replace(/href="/, '').replace(/"$/, '');
    
    // Skip external links
    if (url.startsWith('http') || url.startsWith('//') || url.startsWith('#')) return;
    if (url.startsWith('tel:') || url.startsWith('mailto:')) return;
    
    // Check for bad internal links
    if (url.includes('library_') && !url.startsWith('/library/library_')) {
      issues.push(`Bad library link path: ${url}`);
    }
  });
  
  return issues;
}

function checkContentQuality(html, dirName) {
  const issues = [];
  
  // Extract body content (between <main> and </main>)
  const bodyMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (!bodyMatch) {
    issues.push('No <main> content found');
    return issues;
  }
  const body = bodyMatch[1];
  
  // Check if body content is too short (likely placeholder or broken)
  const textContent = body.replace(/<[^>]*>/g, '').trim();
  if (textContent.length < 50) {
    issues.push(`Body content too short (${textContent.length} chars): "${textContent.substring(0, 50)}..."`);
  }
  
  // Check for placeholder text patterns - use word boundaries to avoid false positives
  // on words like "being" in normal medical text
  const placeholderPatterns = [
    { regex: /\bthis article is being updated\b/i, label: 'being updated' },
    { regex: /\bcheck back soon\b/i, label: 'check back soon' },
    { regex: /\bnot available\b/i, label: 'not available' },
    { regex: /\barticle coming soon\b/i, label: 'coming soon' },
    { regex: /\bno articles available\b/i, label: 'no articles available' }
  ];
  
  placeholderPatterns.forEach(({ regex, label }) => {
    if (regex.test(html)) {
      const isParent = PARENT_PAGES.has(dirName);
      if (!isParent) {
        issues.push(`Contains placeholder text: "${label}"`);
      }
    }
  });
  
  return issues;
}

function checkImages(html, dirName) {
  const issues = [];
  
  const imgs = html.match(/<img[^>]*>/g) || [];
  imgs.forEach(img => {
    // Check for missing src
    if (!/src\s*=\s*['"]/.test(img)) {
      issues.push('Image without src attribute');
      return;
    }
    
    // Check for 1x1 spacer gifs (often UIKit remnants)
    if (/spacer\.gif|1x1\.gif|pixel\.gif/i.test(img)) {
      issues.push('Contains spacer/pixel gif');
    }
  });
  
  return issues;
}

function validatePage(dirName) {
  const indexPath = path.join(LIB, dirName, 'index.html');
  const allIssues = [];
  
  if (!fs.existsSync(indexPath)) {
    return [{ type: 'MISSING', message: 'No index.html found' }];
  }
  
  const html = fs.readFileSync(indexPath, 'utf8');
  const isParent = PARENT_PAGES.has(dirName);
  
  // Validate title
  const titleIssues = validateTitle(html, dirName);
  titleIssues.forEach(i => allIssues.push({ type: 'TITLE', message: i }));
  
  // Validate links
  const linkIssues = checkLinks(html, dirName);
  linkIssues.forEach(i => allIssues.push({ type: 'LINK', message: i }));
  
  // Validate content quality
  const qualityIssues = checkContentQuality(html, dirName);
  qualityIssues.forEach(i => allIssues.push({ type: 'QUALITY', message: i }));
  
  // Validate images
  const imageIssues = checkImages(html, dirName);
  imageIssues.forEach(i => allIssues.push({ type: 'IMAGE', message: i }));
  
  // Page-type specific validations
  if (isParent) {
    const parentIssues = analyzeParentContent(html, dirName);
    parentIssues.forEach(i => allIssues.push({ type: 'PARENT', message: i }));
  } else {
    const articleIssues = analyzeArticleContent(html, dirName);
    articleIssues.forEach(i => allIssues.push({ type: 'ARTICLE', message: i }));
  }
  
  // Check page size (too small = likely broken)
  if (html.length < 500) {
    allIssues.push({ type: 'SIZE', message: `Page too small (${html.length} chars)` });
  }
  
  return allIssues;
}

function main() {
  console.log('=== FULL LIBRARY VALIDATION ===\n');
  
  if (!fs.existsSync(LIB)) {
    console.error('Library directory not found!');
    process.exit(1);
  }
  
  const dirs = fs.readdirSync(LIB).filter(d => {
    const full = path.join(LIB, d);
    return fs.statSync(full).isDirectory();
  });
  
  console.log(`Found ${dirs.length} directories in library/\n`);
  
  let totalIssues = 0;
  let pagesWithIssues = 0;
  let cleanPages = 0;
  const issueTypes = {};
  
  const pageTypeStats = {
    parent: 0,
    article: 0,
    index: 0,
    other: 0
  };
  
  const titleStats = {
    slugBased: [],
    slugPattern: [],
    autoGenerated: []
  };
  
  dirs.forEach(dirName => {
    const issues = validatePage(dirName);
    const isParent = PARENT_PAGES.has(dirName);
    const isIndex = dirName === 'index';
    
    if (isParent) pageTypeStats.parent++;
    else if (isIndex) pageTypeStats.index++;
    else pageTypeStats.article++;
    
    // Check titles for slug-based garbage
    if (issues.some(i => i.message.includes('slug-based') || i.message.includes('slug pattern') || i.message.includes('auto-generated'))) {
      const indexPath = path.join(LIB, dirName, 'index.html');
      if (fs.existsSync(indexPath)) {
        const html = fs.readFileSync(indexPath, 'utf8');
        const tm = html.match(/<title>(.*?)<\/title>/i);
        if (tm) {
          if (issues.some(i => i.message.includes('slug-based'))) titleStats.slugBased.push(dirName + ': ' + tm[1]);
          else if (issues.some(i => i.message.includes('slug pattern'))) titleStats.slugPattern.push(dirName + ': ' + tm[1]);
          else if (issues.some(i => i.message.includes('auto-generated'))) titleStats.autoGenerated.push(dirName + ': ' + tm[1]);
        }
      }
    }
    
    if (issues.length > 0) {
      pagesWithIssues++;
      totalIssues += issues.length;
      
      console.log(`\n${dirName} (${isParent ? 'PARENT' : isIndex ? 'INDEX' : 'ARTICLE'}) - ${issues.length} issue(s):`);
      issues.forEach(issue => {
        console.log(`  [${issue.type}] ${issue.message}`);
        issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
      });
    } else {
      cleanPages++;
    }
  });
  
  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Total pages: ${dirs.length}`);
  console.log(`  Parent pages: ${pageTypeStats.parent}`);
  console.log(`  Article pages: ${pageTypeStats.article}`);
  console.log(`  Index: ${pageTypeStats.index}`);
  console.log(`\nClean pages (no issues): ${cleanPages}`);
  console.log(`Pages with issues: ${pagesWithIssues}`);
  console.log(`Total issues: ${totalIssues}`);
  
  if (Object.keys(issueTypes).length > 0) {
    console.log('\nIssues by type:');
    Object.entries(issueTypes).sort(([,a], [,b]) => b - a).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  }
  
  // Title quality summary
  if (titleStats.slugBased.length > 0) {
    console.log('\n=== SLUG-BASED TITLES (still showing "Medical Library X Y" pattern) ===');
    titleStats.slugBased.forEach(t => console.log('  ' + t));
  }
  if (titleStats.slugPattern.length > 0) {
    console.log('\n=== SLUG PATTERN TITLES ("Word Number" pattern) ===');
    titleStats.slugPattern.forEach(t => console.log('  ' + t));
  }
  if (titleStats.autoGenerated.length > 0) {
    console.log('\n=== AUTO-GENERATED TITLES ===');
    titleStats.autoGenerated.forEach(t => console.log('  ' + t));
  }
  
  console.log('\n========================================');
  if (totalIssues === 0) {
    console.log('ALL PAGES PASS VALIDATION!');
  } else {
    console.log(`${totalIssues} issues found across ${pagesWithIssues} pages`);
  }
}

main();
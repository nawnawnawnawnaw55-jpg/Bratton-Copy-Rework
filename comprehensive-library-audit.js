// Comprehensive Library Audit - v2 source vs v3 target
// Scans all v3 library pages and maps issues to v2 source content
const fs = require('fs');
const path = require('path');

const V3_LIB_DIR = 'bratton-pt-v3/library';
const V2_LIB_DIR = 'bratton-pt-v2';

// Known v2 directory name mapping
const v2DirMap = {
  'library_ankle_12': true, 'library_ankle_23': true, 'library_ankle_32': true,
  'library_ankle_43': true, 'library_ankle_47': true, 'library_ankle_48': true,
  'library_back_1': true, 'library_back_52': true, 'library_back_53': true, 'library_back_71': true,
  'library_directions_4031': true,
  'library_elbow_2': true, 'library_elbow_3': true, 'library_elbow_4': true,
  'library_elbow_5': true, 'library_elbow_6': true, 'library_elbow_49': true, 'library_elbow_50': true,
  'library_exercise_58': true, 'library_exercise_60': true, 'library_exercise_61': true, 'library_exercise_62': true,
  'library_firstVisit': true,
  'library_hip_7': true, 'library_hip_8': true, 'library_hip_9': true, 'library_hip_10': true,
  'library_hip_11': true, 'library_hip_13': true, 'library_hip_14': true, 'library_hip_15': true,
  'library_hip_55': true, 'library_hip_56': true,
  'library_knee_7': true, 'library_knee_16': true, 'library_knee_17': true, 'library_knee_18': true,
  'library_knee_19': true, 'library_knee_20': true, 'library_knee_21': true, 'library_knee_22': true,
  'library_knee_24': true, 'library_knee_54': true, 'library_knee_75': true, 'library_knee_76': true,
  'library_leg_23': true, 'library_leg_47': true, 'library_leg_74': true,
  'library_md_70': true, 'library_md_72': true,
  'library_neck_25': true, 'library_neck_63': true, 'library_neck_64': true, 'library_neck_73': true,
  'library_privacy': true,
  'library_privacybar_privacy': true, 'library_privacybar_terms': true, 'library_privacybar_websiteprivacy': true,
  'library_shoulder_26': true, 'library_shoulder_27': true, 'library_shoulder_28': true,
  'library_shoulder_29': true, 'library_shoulder_30': true, 'library_shoulder_31': true,
  'library_shoulder_33': true, 'library_shoulder_34': true, 'library_shoulder_35': true,
  'library_systemic_51': true, 'library_systemic_57': true, 'library_systemic_65': true,
  'library_systemic_66': true, 'library_systemic_67': true, 'library_systemic_68': true,
  'library_systemic_69': true, 'library_systemic_73': true,
  'library_treatments_2': true, 'library_treatments_32': true, 'library_treatments_33': true,
  'library_treatments_34': true, 'library_treatments_35': true, 'library_treatments_36': true,
  'library_treatments_37': true, 'library_treatments_38': true, 'library_treatments_40': true,
  'library_treatments_41': true, 'library_treatments_42': true, 'library_treatments_43': true,
  'library_treatments_44': true, 'library_treatments_45': true, 'library_treatments_46': true,
  'library_treatments_47': true, 'library_treatments_48': true, 'library_treatments_49': true,
  'library_treatments_50': true, 'library_treatments_51': true, 'library_treatments_52': true,
  'library_treatments_53': true, 'library_treatments_54': true, 'library_treatments_55': true,
  'library_treatments_56': true, 'library_treatments_57': true, 'library_treatments_58': true,
  'library_treatments_59': true, 'library_treatments_60': true, 'library_treatments_61': true,
  'library_treatments_62': true, 'library_treatments_63': true, 'library_treatments_64': true,
  'library_treatments_65': true, 'library_treatments_66': true, 'library_treatments_67': true,
  'library_treatments_68': true, 'library_treatments_69': true, 'library_treatments_70': true,
  'library_treatments_71': true, 'library_treatments_72': true, 'library_treatments_73': true,
  'library_treatments_74': true, 'library_treatments_75': true, 'library_treatments_76': true,
  'library_treatments_77': true, 'library_treatments_78': true, 'library_treatments_79': true,
  'library_treatments_80': true, 'library_treatments_81': true, 'library_treatments_85': true,
  'library_treatments_86': true, 'library_treatments_87': true, 'library_treatments_88': true,
  'library_treatments_89': true, 'library_treatments_90': true, 'library_treatments_93': true,
  'library_treatments_94': true, 'library_treatments_95': true
};

// Category pages in v2 that exist as just the directory name (e.g., library_ankle, library_back, etc.)
const categoryV2Dirs = new Set([
  'library_ankle', 'library_back', 'library_elbow', 'library_hip',
  'library_knee', 'library_leg', 'library_neck', 'library_shoulder',
  'library_systemic', 'library_treatments', 'library_md', 'library_privacy',
  'library_privacybar_privacy', 'library_privacybar_terms', 'library_privacybar_websiteprivacy',
  'library_firstVisit', 'library_directions_4031', 'library_exercise_58',
  'library_exercise_60', 'library_exercise_61', 'library_exercise_62', 'library_privacy'
]);

function getV3Pages() {
  const items = fs.readdirSync(V3_LIB_DIR, { withFileTypes: true });
  const pages = [];
  for (const item of items) {
    if (item.isDirectory()) {
      const indexPath = path.join(V3_LIB_DIR, item.name, 'index.html');
      if (fs.existsSync(indexPath)) {
        pages.push({ dir: item.name, path: indexPath });
      }
    }
  }
  return pages;
}

function getV2Source(v3DirName) {
  // v3 dir names like 'library_ankle_12' should map to v2 'library_ankle_12'
  const v2Path = path.join(V2_LIB_DIR, v3DirName, 'index.html');
  if (fs.existsSync(v2Path)) {
    return v2Path;
  }
  // Try looking in v2 directory listing
  const v2Items = fs.readdirSync(V2_LIB_DIR, { withFileTypes: true });
  for (const item of v2Items) {
    if (item.isDirectory() && item.name === v3DirName) {
      const p = path.join(V2_LIB_DIR, item.name, 'index.html');
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function extractV2ArticleContent(html) {
  // Extract the articleArea div content
  const articleMatch = html.match(/<div\s+id=['"]articleArea['"]\s*>([\s\S]*?)<div\s+class=['"]ml_body_links_seo/);
  if (!articleMatch) return null;
  
  let content = articleMatch[1];
  
  // Extract the UKIT tabs content
  const tabContent = content.match(/<ul[^>]*id=['"]article-tab['"][\s\S]*?<\/ul>/);
  
  return content;
}

function extractV2Tabs(html) {
  // Extract individual tab panels from v2 uikit tabs
  const tabMatch = html.match(/<ul[^>]*id=['"]article-tab['"][\s\S]*?<\/ul>/);
  if (!tabMatch) return null;
  
  const tabsHtml = tabMatch[0];
  const panels = [];
  
  // Split by <li> tags that are direct children
  const liRegex = /<li>([\s\S]*?)<\/li>/g;
  let match;
  while ((match = liRegex.exec(tabsHtml)) !== null) {
    panels.push(match[1].trim());
  }
  
  return panels; // [overview, treatments, goals, resources]
}

function extractV2SeoLinks(html) {
  const seoMatch = html.match(/<div\s+class=['"]ml_body_links_seo[^>]*>([\s\S]*?)<\/div>/);
  if (!seoMatch) return null;
  return seoMatch[0];
}

function extractV2Disclaimer(html) {
  const discMatch = html.match(/<h5>Disclaimer<\/h5>([\s\S]*?)<script/);
  if (!discMatch) return null;
  return '<h5>Disclaimer</h5>' + discMatch[1].replace(/<script[\s\S]*$/, '').trim();
}

function analyzeV3Page(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check if the page has article content or is empty
  const hasArticleTitle = /<h4 class=['"]article-h4['"]>/.test(html) || /<h4[^>]*>/.test(html.match(/<div class=['"]article-body['"][\s\S]*?<h4/)?.[0] || '');
  
  // Check for tab panels
  const tabPanels = html.match(/<div class=['"]ml-tab-panel['"][\s\S]*?<\/div>\s*(?=<div class=['"]ml-tab-panel|<\/div>\s*<\/div>\s*<div class=['"]ml-body-links)/g) || [];
  
  // Check for empty tab panels
  let emptyTabPanels = 0;
  for (const panel of tabPanels) {
    const innerContent = panel.replace(/<[^>]+>/g, '').trim();
    if (innerContent.length < 20) emptyTabPanels++;
  }
  
  // Check for video badges (v3 format uses <span class="video-badge">)
  const hasVideoBadges = /<span class=['"]video-badge['"]>/.test(html);
  const hasOldVideoBadges = /uk-badge/.test(html);
  
  // Check for SEO links (v3 format uses <div class="ml-body-links">)
  const hasSeoLinks = /<div class=['"]ml-body-links['"]>/.test(html);
  
  // Check for CTA button
  const hasCta = /Questions\? Call Us/.test(html) || /btn--accent/.test(html);
  
  // Check for disclaimer
  const hasDisclaimer = /Disclaimer/.test(html);
  
  // Check for article body content (overview text)
  const articleBodyMatch = html.match(/<div class=['"]article-body['"][\s\S]*?<\/div>\s*(?=<div class=['"]ml-body-links|<\/div>\s*<\/div>\s*<\/section)/);
  const hasArticleBody = !!articleBodyMatch;
  const articleBodyContent = articleBodyMatch ? articleBodyMatch[0].replace(/<[^>]+>/g, '').trim().length : 0;
  
  return {
    hasArticleTitle,
    tabPanelsCount: tabPanels.length,
    emptyTabPanels,
    hasVideoBadges,
    hasOldVideoBadges,
    hasSeoLinks,
    hasCta,
    hasDisclaimer,
    hasArticleBody,
    articleBodyContentLength: articleBodyContent,
    issues
  };
}

function determinePageType(v3DirName, analysis) {
  // Determine if this is a treatment page, condition page, category page, etc.
  if (v3DirName.includes('_treatments_')) return 'treatment';
  if (v3DirName.includes('_ankle_') || v3DirName.includes('_back_') || 
      v3DirName.includes('_elbow_') || v3DirName.includes('_hip_') ||
      v3DirName.includes('_knee_') || v3DirName.includes('_leg_') ||
      v3DirName.includes('_neck_') || v3DirName.includes('_shoulder_') ||
      v3DirName.includes('_systemic_') || v3DirName.includes('_md_') ||
      v3DirName.includes('_exercise_')) return 'condition';
  if (categoryV2Dirs.has(v3DirName)) return 'category';
  return 'other';
}

function main() {
  console.log('=== COMPREHENSIVE LIBRARY AUDIT ===\n');
  
  const v3Pages = getV3Pages();
  console.log(`Total v3 library pages found: ${v3Pages.length}\n`);
  
  const results = {
    total: v3Pages.length,
    withV2Source: 0,
    withoutV2Source: 0,
    emptyPages: 0,
    pagesNeedingFixes: [],
    fixedPages: [],
    byType: {}
  };
  
  for (const page of v3Pages) {
    const v2Source = getV2Source(page.dir);
    const analysis = analyzeV3Page(page.path);
    const pageType = determinePageType(page.dir, analysis);
    
    if (!results.byType[pageType]) results.byType[pageType] = { total: 0, needFix: 0, fixed: 0 };
    results.byType[pageType].total++;
    
    const needsFix = analysis.emptyTabPanels > 0 || !analysis.hasSeoLinks || 
                     !analysis.hasCta || analysis.hasOldVideoBadges ||
                     analysis.articleBodyContentLength < 100;
    
    if (v2Source) results.withV2Source++;
    else results.withoutV2Source++;
    
    if (analysis.articleBodyContentLength < 100 && analysis.emptyTabPanels >= 3) {
      results.emptyPages++;
    }
    
    const pageInfo = {
      dir: page.dir,
      type: pageType,
      hasV2Source: !!v2Source,
      v2SourcePath: v2Source,
      analysis,
      needsFix,
      specificIssues: []
    };
    
    if (analysis.emptyTabPanels > 0) pageInfo.specificIssues.push(`${analysis.emptyTabPanels} empty tab panels`);
    if (!analysis.hasSeoLinks) pageInfo.specificIssues.push('Missing SEO links');
    if (!analysis.hasCta) pageInfo.specificIssues.push('Missing CTA button');
    if (analysis.hasOldVideoBadges) pageInfo.specificIssues.push('Using old UKIT video badges');
    if (!analysis.hasVideoBadges && analysis.hasOldVideoBadges) pageInfo.specificIssues.push('Needs new video badges');
    if (analysis.articleBodyContentLength < 100) pageInfo.specificIssues.push('Insufficient article body content');
    
    if (needsFix) {
      results.pagesNeedingFixes.push(pageInfo);
      results.byType[pageType].needFix++;
    } else {
      results.fixedPages.push(pageInfo);
      results.byType[pageType].fixed++;
    }
  }
  
  // Print results
  console.log('=== SUMMARY ===');
  console.log(`Total pages: ${results.total}`);
  console.log(`Pages with v2 source available: ${results.withV2Source}`);
  console.log(`Pages without v2 source: ${results.withoutV2Source}`);
  console.log(`Empty/placeholder pages (need full content): ${results.emptyPages}`);
  console.log(`Pages needing fixes: ${results.pagesNeedingFixes.length}`);
  console.log(`Pages already fixed: ${results.fixedPages.length}`);
  
  console.log('\n=== BY TYPE ===');
  for (const [type, counts] of Object.entries(results.byType)) {
    console.log(`  ${type}: ${counts.total} total, ${counts.needFix} need fix, ${counts.fixed} fixed`);
  }
  
  console.log('\n=== PAGES NEEDING FIXES ===');
  for (const page of results.pagesNeedingFixes) {
    console.log(`\n  ${page.dir} (${page.type})`);
    console.log(`    V2 Source: ${page.hasV2Source ? page.v2SourcePath : 'NOT FOUND'}`);
    console.log(`    Issues: ${page.specificIssues.join(', ')}`);
  }
  
  // Save results
  fs.writeFileSync('library-audit-results.json', JSON.stringify(results, null, 2));
  console.log('\n\nResults saved to library-audit-results.json');
}

main();
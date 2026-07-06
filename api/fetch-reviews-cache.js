/**
 * Nightly reviews cache refresh script.
 * Run via Windows Task Scheduler daily at 12:03 AM:
 *   node api/fetch-reviews-cache.js
 *
 * Reads GOOGLE_API_KEY from a .env file in the project root (or environment variable).
 * Fetches ALL reviews from Google Places API and writes to api/reviews-cache.json.
 * Each run completely replaces the previous cache file.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLACE_ID = 'ChIJicdBse3mnYgRyU49RjVmRs0';
const OUTPUT_FILE = path.join(__dirname, 'reviews-cache.json');

// Load GOOGLE_API_KEY from .env file if present
let API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/GOOGLE_API_KEY=([^\r\n]+)/);
      if (match) API_KEY = match[1].trim();
    }
  } catch (e) {
    // .env file not found or unreadable — will try environment variable
  }
}

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function fetchGoogleReviews() {
  return new Promise((resolve, reject) => {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews,rating,user_ratings_total&key=${API_KEY}&language=en`;
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('Failed to parse Google API response: ' + e.message));
        }
      });
    }).on('error', (e) => {
      reject(new Error('HTTP request failed: ' + e.message));
    });
  });
}

function sanitizeText(t) {
  return (t || '').replace(/[^\x20-\x7E\xA0-\xFF\u2010-\u2122]/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
  log('Starting reviews cache refresh...');

  if (!API_KEY) {
    log('ERROR: No GOOGLE_API_KEY found. Set it in a .env file in the project root or as an environment variable.');
    process.exit(1);
  }

  try {
    log('Fetching reviews from Google Places API...');
    const data = await fetchGoogleReviews();

    if (data.error_message) {
      log('Google API error: ' + data.error_message);
      process.exit(1);
    }

    if (!data.result || !data.result.reviews) {
      log('No reviews found in API response.');
      process.exit(1);
    }

    const rawReviews = data.result.reviews;

    // Process reviews (same sanitization as api/reviews.js)
    const reviews = rawReviews.map(r => ({
      name: r.author_name,
      text: sanitizeText(r.text),
      time: r.relative_time_description,
      rating: r.rating,
      photo: r.profile_photo_url || null
    }));

    // Sort by time (newest first) — relative times require manual ordering since
    // Google returns them in their own order already (they come sorted by relevance
    // by default, not chronologically). We preserve the order from Google.
    const cacheData = {
      reviews: reviews,
      overall_rating: data.result.rating || 5.0,
      total_reviews: data.result.user_ratings_total || reviews.length,
      cached_at: new Date().toISOString()
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
    log(`SUCCESS: Wrote ${reviews.length} reviews to ${OUTPUT_FILE}`);
    log(`Overall rating: ${cacheData.overall_rating} | Total reviews: ${cacheData.total_reviews}`);

    // Auto-commit and push to trigger Vercel redeploy
    const projectRoot = path.join(__dirname, '..');
    const dateStr = new Date().toISOString().split('T')[0];
    try {
      log('Committing updated cache to git...');
      execSync('git add api/reviews-cache.json', { cwd: projectRoot, stdio: 'pipe' });
      execSync(`git commit -m "Nightly reviews cache refresh - ${dateStr}"`, { cwd: projectRoot, stdio: 'pipe' });
      execSync('git push', { cwd: projectRoot, stdio: 'pipe' });
      log('Pushed to git — Vercel will redeploy with fresh cache.');
    } catch (gitErr) {
      log('WARNING: git push failed: ' + (gitErr.stderr ? gitErr.stderr.toString().trim() : gitErr.message));
      log('Cache file was written locally but not pushed. Vercel will keep serving previous cache.');
    }
    process.exit(0);
  } catch (e) {
    log('ERROR: ' + e.message);
    process.exit(1);
  }
}

main();
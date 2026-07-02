// Bratton PT Reviews API — static-cache-first with Google API + hardcoded fallback
// Deployed as a Vercel serverless function at /api/reviews
//
// Query params:
//   ?newest=N  → N most recent reviews, any rating (for the /reviews page)
//   ?all=1     → all reviews, any rating (for popup / full listing)
//   (none)     → top 5 five-star reviews (for homepage carousel)
//
// Architecture:
//   1. Read api/reviews-cache.json (deployed alongside — refreshed nightly)
//   2. If cache has reviews → serve subset according to query params
//   3. If cache empty/missing → call Google Places API live
//   4. If Google API fails → serve hardcoded FALLBACK reviews

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_PATH = path.join(__dirname, 'reviews-cache.json');

const PLACE_ID = 'ChIJicdBse3mnYgRyU49RjVmRs0';

// ── Hardcoded fallback (16 reviews) ──────────────────────────────────
// Used only when both the static cache AND Google API are unavailable.
const FALLBACK = [
  { name: "Gary L.", text: "Just want to thank Jena and staff for a great job in rehabbing my right rotator cuff. I had two complete tears out of the four muscles of the cuff. Jena and staff rehabbed my shoulder without a need for surgery...", time: "8 months ago", rating: 5 },
  { name: "John C.", text: "The experience has been outstanding! When I first came to Bratton Physical Therapy I had sore ankles, couldn't walk more than 50 feet, getting up from sitting was painful. Now I can easily walk 100's of yards (likely more), I have no pain...", time: "1 year ago", rating: 5 },
  { name: "Barbara K.", text: "My journey at Bratton PT began after I spent 3 days, about 6 hours a day working on a ladder moving shelving over my head remodeling my master closet. I developed pain in my neck and upper back. I chose Bratton PT because I used them in the past...", time: "1 year ago", rating: 5 },
  { name: "Nina S.", text: "Before coming I struggled picking up my son, sitting comfortably, and sleeping due to severe shoulder pain and limited neck mobility. Jena knew what the issue was immediately. She created a plan that quickly diminished my pain...", time: "2 years ago", rating: 5 },
  { name: "Stephen D.", text: "After major rotator cuff surgery, I was unable to move my arm away from my side. I was also experiencing considerable pain related to the surgery. For my physical therapy treatment, my Surgeon recommended Jena Bratton, PT...", time: "3 years ago", rating: 5 },
  { name: "James S.", text: "My journey has been one of great pain and great rewards. Many years ago my knees began failing and I was not successful with gym workouts helping the problem. It took quite a while in obtaining surgical approval to have my knees replaced...", time: "3 years ago", rating: 5 },
  { name: "Paul R.", text: "Undergoing PT for total hip replacement. The treatment is awesome. I get a custom PT plan focused on my needs and progress. I am so happy I came to Bratton.", time: "9 months ago", rating: 5 },
  { name: "Jeannie R.", text: "You cannot go wrong having your pains disappear at Bratton PT! Individual attention, explanation of each procedure before it is executed! They make it fun!", time: "10 months ago", rating: 5 },
  { name: "Nathan W.", text: "I came to seek relief from my Achilles tendon pain and very quickly they worked with me to make a targeted plan to reduce pain long term. Excellent experience.", time: "7 months ago", rating: 5 },
  { name: "Susan B.", text: "I had trouble with my right knee. It felt stiff, sore and achy. I tried Bratton Therapy Centre and it was the best decision ever. They came up with a special exercise program just for me.", time: "6 months ago", rating: 5 },
  { name: "Don N.", text: "When I came to Bratton for a very weak right shoulder, I was becoming one arm person. After 6 weeks of physical therapy I now have full extension and much less pain. My sleep at night has improved as well.", time: "6 months ago", rating: 5 },
  { name: "Alfred J.", text: "The staff is very professional. All guide your routine with caution and care. I began recovery after my first visit. I know my recovery is in good hands. Give them a call!", time: "5 months ago", rating: 5 },
  { name: "Duran H.", text: "Extremely friendly staff. They know what they are doing here. I would recommend this place to anyone. Already feeling results after a couple of weeks.", time: "4 months ago", rating: 5 },
  { name: "Nicholas B.", text: "My back pain was making day-to-day life absolutely miserable, but coming to see Ms. Jena and her amazing staff has been a total game-changer. I have significantly less pain and more flexibility.", time: "3 months ago", rating: 5 },
  { name: "Paul Rieder", text: "Undergoing PT for total hip replacement. The treatment is awesome. I get a custom PT plan focused on my needs and progress. I am so happy that I came to Bratton.", time: "2 months ago", rating: 5 },
  { name: "Jeannie Rivers", text: "You cannot go wrong by having your pains disappear when going to Bratton Physical Therapy! Individual attention, explanation of each procedure before it is executed! They make it fun!", time: "1 month ago", rating: 5 }
];

// ── Helpers ──────────────────────────────────────────────────────────

function sanitizeText(t) {
  return (t || '').replace(/[^\x20-\x7E\xA0-\xFF\u2010-\u2122]/g, '').replace(/\s+/g, ' ').trim();
}

function parseTimeDays(t) {
  // Convert relative time strings to approximate days for sorting
  if (!t) return 0;
  const match = t.match(/(\d+)\s+(year|month|week|day)s?/i);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === 'day') return num;
  if (unit === 'week') return num * 7;
  if (unit === 'month') return num * 30;
  if (unit === 'year') return num * 365;
  return 0;
}

function sortReviewsNewest(reviews) {
  return [...reviews].sort((a, b) => parseTimeDays(a.time) - parseTimeDays(b.time));
}

// ── Read cache from filesystem ───────────────────────────────────────

function readCache() {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const raw = fs.readFileSync(CACHE_PATH, 'utf8');
    const data = JSON.parse(raw);
    // Validate structure
    if (!data || typeof data !== 'object') return null;
    if (!data.reviews || !Array.isArray(data.reviews) || data.reviews.length === 0) return null;
    // Validate each review has required fields
    const valid = data.reviews.every(r => r && typeof r === 'object' && typeof r.text === 'string' && r.text.length > 0);
    if (!valid) {
      console.warn('Cache contains malformed reviews — skipping');
      return null;
    }
    // Check cache freshness (5 days max)
    if (data.cached_at) {
      const age = Date.now() - new Date(data.cached_at).getTime();
      const maxAge = 5 * 24 * 60 * 60 * 1000; // 5 days
      if (age > maxAge) {
        console.warn('Cache is over 5 days old — will try live API');
        return null; // Force refresh from live API
      }
    }
    return {
      reviews: data.reviews,
      overall_rating: data.overall_rating || 5.0,
      total_reviews: data.total_reviews || data.reviews.length,
      cached_at: data.cached_at || null
    };
  } catch (e) {
    console.warn('Cache read error — will try live API:', e.message);
    return null;
  }
}

// ── Select subset from full review list ──────────────────────────────

function selectReviews(allReviews, { newest, showAll }) {
  const sorted = sortReviewsNewest(allReviews);
  if (newest && newest > 0) {
    return sorted.slice(0, newest);
  }
  if (showAll) {
    return sorted;
  }
  // Default: top 5 five-star reviews
  return sorted.filter(r => r.rating === 5).slice(0, 5);
}

// ── Safe JSON responder (avoids reliance on Vercel res.json helper) ──

function sendJSON(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// ── Serve from hardcoded fallback ────────────────────────────────────

function serveFallback({ newest, showAll }, res) {
  const reviews = selectReviews(FALLBACK, { newest, showAll });
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  sendJSON(res, 200, {
    reviews,
    overall_rating: 5.0,
    total_reviews: FALLBACK.length,
    _fallback: true
  });
}

// ── Call Google Places API live ──────────────────────────────────────

async function fetchGoogleReviews(apiKey, { newest, showAll }, res) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews,rating,user_ratings_total&key=${apiKey}&language=en`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error_message || !data.result || !data.result.reviews) {
      throw new Error(data.error_message || 'No reviews in API response');
    }

    const allReviews = data.result.reviews.map(r => ({
      name: r.author_name,
      text: sanitizeText(r.text),
      time: r.relative_time_description,
      rating: r.rating,
      photo: r.profile_photo_url || null
    }));

    const reviews = selectReviews(allReviews, { newest, showAll });
    const overallRating = data.result.rating || 5.0;
    const totalReviews = data.result.user_ratings_total || allReviews.length;

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    sendJSON(res, 200, { reviews, overall_rating: overallRating, total_reviews: totalReviews, _live: true });
  } catch (e) {
    serveFallback({ newest, showAll }, res);
  }
}

// ── Main handler ─────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Always set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const API_KEY = process.env.GOOGLE_API_KEY;
  const showAll = req.query && req.query.all === '1';
  const newest = req.query && req.query.newest ? parseInt(req.query.newest, 10) : 0;

  try {
    // 1. Try static cache first
    const cache = readCache();
    if (cache) {
      const reviews = selectReviews(cache.reviews, { newest, showAll });
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
      sendJSON(res, 200, {
        reviews,
        overall_rating: cache.overall_rating,
        total_reviews: cache.total_reviews,
        _from_cache: true
      });
      return;
    }

    // 2. Cache empty — try Google API live
    if (API_KEY) {
      return fetchGoogleReviews(API_KEY, { newest, showAll }, res);
    }

    // 3. No API key — use fallback
    serveFallback({ newest, showAll }, res);
  } catch (e) {
    console.error('reviews API error:', e);
    serveFallback({ newest, showAll }, res);
  }
}

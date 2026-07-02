export default async function handler(req, res) {
  const PLACE_ID = 'ChIJicdBse3mnYgRyU49RjVmRs0';
  const API_KEY = process.env.GOOGLE_API_KEY;
  
  if (!API_KEY) {
    return res.json({ reviews: [], error: 'API key not configured' });
  }
  
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews&key=${API_KEY}&language=en`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error_message) {
      return res.json({ reviews: [], error: data.error_message });
    }
    
    if (!data.result || !data.result.reviews) {
      return res.json({ reviews: [] });
    }
    
    const fiveStar = data.result.reviews
      .filter(r => r.rating === 5)
      .sort((a, b) => b.time - a.time)
      .slice(0, 5)
      .map(r => ({
        name: r.author_name,
        text: (function(t) {
        // Fix garbled unicode and truncate
        t = (t || '').replace(/[-￿]/g, '').replace(/\s+/g, ' ').trim();
        return t.length > 180 ? t.substring(0, 180) + '...' : t;
      })(r.text),
        time: r.relative_time_description,
        rating: r.rating,
        photo: r.profile_photo_url || null
      }));
    
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.json({ reviews: fiveStar });
  } catch (e) {
    res.json({ reviews: [], error: e.message });
  }
}

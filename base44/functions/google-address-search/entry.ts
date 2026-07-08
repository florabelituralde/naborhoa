import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Address autocomplete using OpenStreetMap Nominatim (free, no API key).
// Returns suggestions with clean, properly-formatted US addresses built from
// structured address components (not Nominatim's verbose display_name which
// includes counties, planning regions, and business names). Filters out
// non-residential POIs (shops, amenities, tourism) so only real addresses show.
const US_STATE_ABBR = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL',
  Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA',
  Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN',
  Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
};

// OSM categories that represent real addressable places vs businesses/POIs.
const POI_CATEGORIES = ['amenity', 'shop', 'tourism', 'office', 'leisure', 'healthcare', 'education', 'craft'];

function buildCleanAddress(a) {
  const street = [a.house_number, a.road].filter(Boolean).join(' ').trim();
  const city = a.city || a.town || a.village || a.hamlet || a.municipality || '';
  const stateAbbr = US_STATE_ABBR[a.state] || a.state || '';
  const zip = a.postcode || '';
  const line1 = street || a.name || '';
  const line2 = [city, stateAbbr, zip].filter(Boolean).join(', ');
  return [line1, line2].filter(Boolean).join(', ');
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const query = (body.query || '').trim();
    if (!query || query.length < 3) return Response.json({ suggestions: [] });

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&addressdetails=1&limit=10&accept-language=en&countrycodes=us`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Nabor-HOA-App/1.0', 'Accept-Language': 'en' } });
    if (!r.ok) return Response.json({ error: 'Address lookup failed' }, { status: 502 });
    const data = await r.json();

    const seen = new Set();
    const suggestions = [];
    for (const item of data || []) {
      // Skip business/POI results — we only want real addresses.
      if (POI_CATEGORIES.includes(item.category)) continue;
      const a = item.address || {};
      // Require a real street/road — filters out states, counties, townships,
      // and cities that have no street-level detail.
      if (!a.road) continue;
      const formatted = buildCleanAddress(a);
      if (!formatted) continue;
      // Dedupe by the clean formatted address.
      if (seen.has(formatted.toLowerCase())) continue;
      seen.add(formatted.toLowerCase());
      suggestions.push({
        place_id: String(item.place_id),
        description: formatted,
        formatted_address: formatted,
        street: [a.house_number, a.road].filter(Boolean).join(' ').trim(),
        city: a.city || a.town || a.village || a.hamlet || '',
        state: a.state || '',
        zip: a.postcode || '',
      });
      if (suggestions.length >= 6) break;
    }
    return Response.json({ suggestions });
  } catch (error) {
    console.error('address-search error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Address autocomplete using two free data sources in parallel:
//
// 1. Photon (komoot.io) — OSM data, purpose-built for type-ahead autocomplete.
//    Handles partial street names via token/prefix matching. May miss newer
//    developments not yet mapped in OpenStreetMap.
//
// 2. US Census Geocoder — USPS TIGER/Line data covering ALL US deliverable
//    addresses, including brand-new subdivisions OSM doesn't have yet. Does
//    fuzzy full-address matching (returns nothing for short partial queries,
//    so it doesn't add noise to early typing).
//
// Results are merged and deduplicated — the user sees OSM suggestions first,
// then any USPS-only matches appended.

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

const POI_KEYS = ['amenity', 'shop', 'tourism', 'office', 'leisure', 'healthcare', 'education', 'craft', 'historic', 'aeroway', 'railway'];

function titleCase(s) {
  return (s || '').split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ').trim();
}

function buildAddress(housenumber, street, city, state, zip, name) {
  const line1 = [housenumber, street].filter(Boolean).join(' ').trim() || name || '';
  const stateAbbr = US_STATE_ABBR[state] || state || '';
  const line2 = [city, stateAbbr, zip].filter(Boolean).join(', ');
  return [line1, line2].filter(Boolean).join(', ');
}

function isUSCountry(country) {
  if (!country) return true; // include if missing (Photon omits it sometimes)
  const c = country.toLowerCase();
  return c === 'usa' || c === 'united states' || c === 'us' || c === 'united states of america';
}

function makeSuggestion(placeId, formatted, street, city, state, zip) {
  return { place_id: String(placeId), description: formatted, formatted_address: formatted, street, city, state, zip };
}

// --- Photon (OSM autocomplete) -------------------------------------------

function parsePhoton(data) {
  const seen = new Set();
  const suggestions = [];
  for (const feature of (data.features || [])) {
    const p = feature.properties || {};
    if (!isUSCountry(p.country)) continue;
    if (POI_KEYS.includes(p.osm_key)) continue;
    if (!p.street || !p.housenumber) continue;
    const city = p.city || p.town || p.village || p.hamlet || '';
    const formatted = buildAddress(p.housenumber, p.street, city, p.state, p.postcode, p.name);
    if (!formatted || seen.has(formatted.toLowerCase())) continue;
    seen.add(formatted.toLowerCase());
    suggestions.push(makeSuggestion(p.osm_id || '', formatted, [p.housenumber, p.street].filter(Boolean).join(' ').trim(), city, p.state || '', p.postcode || ''));
    if (suggestions.length >= 6) break;
  }
  return suggestions;
}

async function fetchPhoton(query) {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=15&lang=en`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Nabor-HOA-App/1.0' } });
    if (!r.ok) return [];
    return parsePhoton(await r.json());
  } catch (e) {
    console.error('photon error:', e);
    return [];
  }
}

// --- Census Geocoder (USPS TIGER/Line) ------------------------------------

function parseCensus(data) {
  const matches = data?.result?.addressMatches || [];
  const seen = new Set();
  const suggestions = [];
  for (const match of matches) {
    const c = match.addressComponents || {};
    const matchedAddr = (match.matchedAddress || '').trim();
    const houseNum = matchedAddr.split(/\s+/)[0] || '';
    if (!houseNum || !/^\d/.test(houseNum)) continue; // require a house number
    const street = [
      houseNum,
      (c.preDirection || '').toUpperCase(),
      titleCase(c.streetName || ''),
      titleCase(c.suffixType || ''),
      (c.suffixDirection || '').toUpperCase(),
    ].filter(Boolean).join(' ').trim();
    const city = titleCase(c.city || '');
    const state = (c.state || '').toUpperCase();
    const zip = c.zip || '';
    const formatted = [street, [city, state, zip].filter(Boolean).join(', ')].filter(Boolean).join(', ');
    if (!formatted || seen.has(formatted.toLowerCase())) continue;
    seen.add(formatted.toLowerCase());
    suggestions.push(makeSuggestion(match.tigerLine?.tigerLineId || '', formatted, street, city, state, zip));
    if (suggestions.length >= 4) break;
  }
  return suggestions;
}

async function fetchCensus(query) {
  // Census fuzzy-matches best with 3+ tokens (house number + street name +
  // at least one more word). Shorter queries return nothing, which is fine.
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return [];
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&format=json`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Nabor-HOA-App/1.0' } });
    if (!r.ok) return [];
    return parseCensus(await r.json());
  } catch (e) {
    console.error('census error:', e);
    return [];
  }
}

// -------------------------------------------------------------------------

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const query = (body.query || '').trim();
    if (!query || query.length < 3) return Response.json({ suggestions: [] });

    // Run both sources in parallel for speed, then merge (Photon first, Census
    // appended, deduplicated by formatted address).
    const [photonResults, censusResults] = await Promise.all([
      fetchPhoton(query),
      fetchCensus(query),
    ]);

    const seen = new Set();
    const suggestions = [];
    for (const s of [...photonResults, ...censusResults]) {
      const key = s.formatted_address.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push(s);
      if (suggestions.length >= 8) break;
    }

    return Response.json({ suggestions });
  } catch (error) {
    console.error('address-search error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
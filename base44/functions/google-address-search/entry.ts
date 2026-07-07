import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Address autocomplete using OpenStreetMap Nominatim (free, no API key).
// Returns suggestions that already include the resolved address components
// (street, city, state, zip) so the client doesn't need a second round-trip.
Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const query = (body.query || '').trim();
    if (!query || query.length < 3) return Response.json({ suggestions: [] });

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&addressdetails=1&limit=6`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Nabor-HOA-App/1.0' } });
    if (!r.ok) return Response.json({ error: 'Address lookup failed' }, { status: 502 });
    const data = await r.json();

    const suggestions = (data || []).map((item) => {
      const a = item.address || {};
      const city = a.city || a.town || a.village || a.hamlet || '';
      const street = [a.house_number, a.road].filter(Boolean).join(' ');
      return {
        place_id: String(item.place_id),
        description: item.display_name,
        formatted_address: item.display_name,
        street,
        city,
        state: a.state || '',
        zip: a.postcode || '',
      };
    });
    return Response.json({ suggestions });
  } catch (error) {
    console.error('address-search error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
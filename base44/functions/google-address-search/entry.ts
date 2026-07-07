import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Server-side proxy to Google Places API so the API key never reaches the
// client. Two actions:
//   - search:  { action: "search", query }  -> { suggestions: [{ place_id, description }] }
//   - details: { action: "details", place_id } -> { formatted_address, street, city, state, zip }
Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'search';
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    if (!apiKey) {
      return Response.json(
        { error: 'Address lookup is not configured. Add the Google Maps API key.' },
        { status: 503 }
      );
    }

    if (action === 'details') {
      const placeId = body.place_id;
      if (!placeId) return Response.json({ error: 'place_id required' }, { status: 400 });

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,address_components&key=${apiKey}`;
      const r = await fetch(url);
      const data = await r.json();
      if (data.status !== 'OK') {
        return Response.json({ error: data.error_message || 'Place lookup failed' }, { status: 502 });
      }

      const comps = {};
      for (const c of data.result.address_components || []) {
        for (const t of c.types) {
          if (t === 'street_number') comps.street_number = c.long_name;
          if (t === 'route') comps.route = c.long_name;
          if (t === 'locality' || t === 'postal_town') comps.city = comps.city || c.long_name;
          if (t === 'administrative_area_level_1') comps.state = c.short_name;
          if (t === 'postal_code') comps.zip = c.long_name;
        }
      }
      const street = [comps.street_number, comps.route].filter(Boolean).join(' ');

      return Response.json({
        formatted_address: data.result.formatted_address,
        street,
        city: comps.city || '',
        state: comps.state || '',
        zip: comps.zip || '',
      });
    }

    // default: autocomplete search
    const query = (body.query || '').trim();
    if (!query) return Response.json({ suggestions: [] });

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&key=${apiKey}`;
    const r = await fetch(url);
    const data = await r.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return Response.json({ error: data.error_message || 'Autocomplete failed' }, { status: 502 });
    }
    const suggestions = (data.predictions || []).map((p) => ({
      place_id: p.place_id,
      description: p.description,
    }));
    return Response.json({ suggestions });
  } catch (error) {
    console.error('google-address-search error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
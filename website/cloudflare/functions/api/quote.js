// Cloudflare Pages Function: /api/quote?symbol=AAPL
//
// Purpose:
// - Avoid browser CORS issues when calling Yahoo Finance directly.
// - Returns a tiny JSON payload: { symbol, price, marketCap, peRatio, source }
//
// Notes:
// - Yahoo's public endpoints can rate-limit. This function adds short caching.
// - No API key required for the public quote endpoint used below.

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const symbol = (url.searchParams.get('symbol') || '').trim().toUpperCase();

  if (!symbol) {
    return json({ error: 'Missing symbol. Use /api/quote?symbol=AAPL' }, 400);
  }

  // Yahoo Finance quote endpoint (server-side; avoids browser CORS)
  const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;

  try {
    const resp = await fetch(yahooUrl, {
      headers: {
        // A basic UA can help with some edge cases
        'User-Agent': 'Mozilla/5.0 (compatible; CloudflarePagesFunction/1.0)'
      },
      cf: {
        // Cache for 5 minutes at the edge
        cacheTtl: 300,
        cacheEverything: true
      }
    });

    if (!resp.ok) {
      return json({ error: `Yahoo request failed`, status: resp.status }, 502);
    }

    const data = await resp.json();
    const result = data?.quoteResponse?.result?.[0];

    if (!result) {
      return json({ error: `No quote data found for ${symbol}` }, 404);
    }

    return json({
      symbol,
      price: result.regularMarketPrice ?? null,
      marketCap: result.marketCap ?? null,
      peRatio: result.trailingPE ?? null,
      source: 'yahoo'
    }, 200, {
      // Cache in the browser too (you can lower if you want)
      'Cache-Control': 'public, max-age=60'
    });
  } catch (err) {
    return json({ error: 'Unexpected error', message: String(err?.message || err) }, 500);
  }
}

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Allow your static pages JS to call this
      'access-control-allow-origin': '*',
      ...extraHeaders
    }
  });
}

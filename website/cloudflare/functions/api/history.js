// Cloudflare Pages Function: /api/history?symbol=AAPL
// Returns 6 months of daily stock price data

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const symbol = (url.searchParams.get('symbol') || '').trim().toUpperCase();

  console.log(`[API DEBUG] History request for symbol: ${symbol}`);

  if (!symbol) {
    console.log(`[API DEBUG] Missing symbol parameter`);
    return json({ error: 'Missing symbol. Use /api/history?symbol=AAPL' }, 400);
  }

  // Calculate date range (6 months ago to today)
  const endDate = Math.floor(Date.now() / 1000);
  const startDate = endDate - (6 * 30 * 24 * 60 * 60); // 6 months ago
  
  console.log(`[API DEBUG] Date range: ${new Date(startDate * 1000).toISOString()} to ${new Date(endDate * 1000).toISOString()}`);

  const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/chart/${encodeURIComponent(symbol)}?period1=${startDate}&period2=${endDate}&interval=1d`;
  console.log(`[API DEBUG] Yahoo URL: ${yahooUrl}`);

  try {
    const resp = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CloudflarePagesFunction/1.0)'
      },
      cf: {
        cacheTtl: 3600, // Cache for 1 hour
        cacheEverything: true
      }
    });

    console.log(`[API DEBUG] Yahoo response status: ${resp.status}`);

    if (!resp.ok) {
      console.log(`[API DEBUG] Yahoo request failed with status ${resp.status}`);
      return json({ error: `Yahoo request failed`, status: resp.status }, 502);
    }

    const data = await resp.json();
    console.log(`[API DEBUG] Yahoo response structure:`, Object.keys(data));
    
    const result = data?.chart?.result?.[0];
    console.log(`[API DEBUG] Chart result exists:`, !!result);

    if (!result) {
      console.log(`[API DEBUG] No chart result found`);
      return json({ error: `No historical data found for ${symbol}` }, 404);
    }

    const timestamps = result.timestamp || [];
    const prices = result.indicators?.quote?.[0]?.close || [];
    
    console.log(`[API DEBUG] Raw data - timestamps: ${timestamps.length}, prices: ${prices.length}`);

    // Format data for Chart.js
    const chartData = timestamps.map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      price: prices[index]
    })).filter(item => item.price != null);
    
    console.log(`[API DEBUG] Formatted data points: ${chartData.length}`);
    console.log(`[API DEBUG] Sample data:`, chartData.slice(0, 3));

    return json({
      symbol,
      data: chartData,
      source: 'yahoo'
    }, 200, {
      'Cache-Control': 'public, max-age=3600'
    });
  } catch (err) {
    console.log(`[API DEBUG] Unexpected error:`, err.message);
    return json({ error: 'Unexpected error', message: String(err?.message || err) }, 500);
  }
}

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      ...extraHeaders
    }
  });
}
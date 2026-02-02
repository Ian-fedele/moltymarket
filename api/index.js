// Vercel Edge API - Main entry
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // /api (health/info)
  if (req.method === 'GET' && pathname === '/api') {
    return new Response(JSON.stringify({ 
      name: 'MoltyMarket API',
      status: 'ok',
      storage: 'upstash-kv',
      endpoints: ['/api/markets', '/api/vote?id=xxx'],
      time: new Date().toISOString()
    }), { headers });
  }

  return new Response(JSON.stringify({ error: 'Not found', path: pathname }), { status: 404, headers });
}

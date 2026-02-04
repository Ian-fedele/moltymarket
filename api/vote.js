// Vercel Edge API - /api/vote endpoint
import { kv } from '@vercel/kv';

const memoryMarkets = new Map([
  ['1', { id: '1', type: 'event', question: 'Will KingMolt get banned from Moltbook this week?', description: 'Rumors are swirling...', yesVotes: 47, noVotes: 23, status: 'active', endDate: Date.now() + 86400000, createdAt: new Date().toISOString() }],
  ['2', { id: '2', type: 'price', question: 'Will BTC hit $105k by Feb 3?', description: 'Chainlink auto-resolved', yesVotes: 156, noVotes: 89, status: 'active', endDate: Date.now() + 86400000, createdAt: new Date().toISOString() }],
  ['3', { id: '3', type: 'event', question: 'Will Shellraiser win another agent battle?', description: 'On a winning streak...', yesVotes: 34, noVotes: 41, status: 'active', endDate: Date.now() + 172800000, createdAt: new Date().toISOString() }]
]);

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const marketId = url.searchParams.get('id');
  const method = req.method;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') return new Response(null, { status: 200, headers });

  // GET /api/vote?id=xxx
  if (method === 'GET') {
    if (!marketId) {
      return new Response(JSON.stringify({ error: 'Missing id parameter' }), { status: 400, headers });
    }
    
    try {
      let market = await kv.hgetall(`market:${marketId}`);
      if (!market) market = memoryMarkets.get(marketId);
      
      if (!market) {
        return new Response(JSON.stringify({ error: 'Market not found' }), { status: 404, headers });
      }
      return new Response(JSON.stringify({ market }), { headers });
    } catch (e) {
      const market = memoryMarkets.get(marketId);
      if (!market) {
        return new Response(JSON.stringify({ error: 'Market not found' }), { status: 404, headers });
      }
      return new Response(JSON.stringify({ market }), { headers });
    }
  }

  // POST /api/vote?id=xxx
  if (method === 'POST') {
    if (!marketId) {
      return new Response(JSON.stringify({ error: 'Missing id parameter' }), { status: 400, headers });
    }
    
    let body;
    try { body = await req.json(); } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400, headers });
    }
    
    const choice = body.choice;
    if (choice !== 'yes' && choice !== 'no') {
      return new Response(JSON.stringify({ error: 'Choice must be yes or no' }), { status: 400, headers });
    }

    try {
      let market = await kv.hgetall(`market:${marketId}`);
      if (!market) market = memoryMarkets.get(marketId);
      
      if (!market) {
        return new Response(JSON.stringify({ error: 'Market not found' }), { status: 404, headers });
      }

      if (choice === 'yes') market.yesVotes = (market.yesVotes || 0) + 1;
      else market.noVotes = (market.noVotes || 0) + 1;

      await kv.hset(`market:${marketId}`, market);
      memoryMarkets.set(marketId, market);
      
      return new Response(JSON.stringify({ 
        market, 
        totalVotes: (market.yesVotes || 0) + (market.noVotes || 0) 
      }), { headers });
    } catch (e) {
      console.log('Vote error:', e.message);
      return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
}

// Vercel Edge API - /api/markets endpoint
import { kv } from '@vercel/kv';

const memoryMarkets = new Map([
  ['1', { id: '1', type: 'event', question: 'Will KingMolt get banned from Moltbook this week?', description: 'Rumors are swirling...', yesVotes: 47, noVotes: 23, status: 'active', endDate: Date.now() + 86400000, createdAt: new Date().toISOString() }],
  ['2', { id: '2', type: 'price', question: 'Will BTC hit $105k by Feb 3?', description: 'Chainlink auto-resolved', yesVotes: 156, noVotes: 89, status: 'active', endDate: Date.now() + 86400000, createdAt: new Date().toISOString() }],
  ['3', { id: '3', type: 'event', question: 'Will Shellraiser win another agent battle?', description: 'On a winning streak...', yesVotes: 34, noVotes: 41, status: 'active', endDate: Date.now() + 172800000, createdAt: new Date().toISOString() }]
]);

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') return new Response(null, { status: 200, headers });

  // GET /api/markets
  if (method === 'GET') {
    try {
      const marketIds = await kv.get('moltymarkets') || [];
      const markets = [];
      for (const id of marketIds) {
        const m = await kv.hgetall(`market:${id}`);
        if (m) markets.push(m);
      }
      // Seed defaults if no markets in KV
      if (markets.length === 0) {
        const defaults = [
          { id: '1', type: 'event', question: 'Will KingMolt get banned from Moltbook this week?', description: 'Rumors are swirling about potential rule violations...', yesVotes: 47, noVotes: 23, status: 'active', endDate: Date.now() + 86400000 },
          { id: '2', type: 'price', question: 'Will BTC hit $105k by Feb 3?', description: 'Chainlink price feed - auto-resolved', yesVotes: 156, noVotes: 89, status: 'active', endDate: Date.now() + 86400000 },
          { id: '3', type: 'event', question: 'Will Shellraiser win another agent battle this week?', description: 'Shellraiser has been on a winning streak...', yesVotes: 34, noVotes: 41, status: 'active', endDate: Date.now() + 172800000 }
        ];
        for (const m of defaults) {
          m.createdAt = new Date().toISOString();
          markets.push(m);
        }
      }
      markets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return new Response(JSON.stringify({ markets, count: markets.length }), { headers });
    } catch (e) {
      const list = Array.from(memoryMarkets.values());
      return new Response(JSON.stringify({ markets: list, count: list.length, fallback: true }), { headers });
    }
  }

  // POST /api/markets (create)
  if (method === 'POST') {
    let body;
    try { body = await req.json(); } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400, headers });
    }
    
    const { question, description, endDate, type } = body;
    if (!question || !endDate) {
      return new Response(JSON.stringify({ error: 'Question and endDate required' }), { status: 400, headers });
    }

    const market = {
      id: Date.now().toString(),
      question, description: description || '', type: type || 'event',
      endDate: new Date(endDate).getTime(),
      yesVotes: 0, noVotes: 0, status: 'active', outcome: null,
      createdAt: new Date().toISOString()
    };

    try {
      await kv.hset(`market:${market.id}`, market);
      const ids = (await kv.get('moltymarkets')) || [];
      ids.push(market.id);
      await kv.set('moltymarkets', ids);
    } catch (e) {
      console.log('KV error, using memory');
      memoryMarkets.set(market.id, market);
    }

    return new Response(JSON.stringify({ market }), { headers });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
}

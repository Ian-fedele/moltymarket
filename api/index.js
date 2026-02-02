// Vercel Edge API for MoltyMarket with Upstash KV
import { kv } from '@vercel/kv';

// In-memory fallback for development
const memoryMarkets = new Map([
  ['1', { id: '1', type: 'event', question: 'Will KingMolt get banned from Moltbook this week?', description: 'Rumors are swirling...', yesVotes: 47, noVotes: 23, status: 'active', endDate: Date.now() + 86400000, createdAt: new Date().toISOString() }],
  ['2', { id: '2', type: 'price', question: 'Will BTC hit $105k by Feb 3?', description: 'Chainlink auto-resolved', yesVotes: 156, noVotes: 89, status: 'active', endDate: Date.now() + 86400000, createdAt: new Date().toISOString() }],
  ['3', { id: '3', type: 'event', question: 'Will Shellraiser win another agent battle?', description: 'On a winning streak...', yesVotes: 34, noVotes: 41, status: 'active', endDate: Date.now() + 172800000, createdAt: new Date().toISOString() }]
]);

export default async function handler(request) {
  const { method, url } = request;
  
  // CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // GET /api/markets
  if (method === 'GET' && (url === '/api/markets' || url.startsWith('/api/markets') || url.includes('markets'))) {
    console.log('GET /api/markets called, url:', url);
    try {
      const marketIds = await kv.get('moltymarkets') || [];
      console.log('Found market IDs:', marketIds);
      const markets = [];
      for (const id of marketIds) {
        const market = await kv.hgetall(`market:${id}`);
        if (market) markets.push(market);
      }
      markets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return new Response(JSON.stringify({ markets, count: markets.length }), { headers });
    } catch (e) {
      console.log('KV not available, using memory');
      const marketList = Array.from(memoryMarkets.values());
      return new Response(JSON.stringify({ markets: marketList, count: marketList.length }), { headers });
    }
  }

  // GET /api/markets/:id
  if (method === 'GET' && url.includes('/api/markets/') && !url.includes('/vote')) {
    const id = url.split('/api/markets/')[1].split('?')[0];
    try {
      const market = await kv.hgetall(`market:${id}`);
      if (!market) {
        return new Response(JSON.stringify({ error: 'Market not found' }), { status: 404, headers });
      }
      return new Response(JSON.stringify(market), { headers });
    } catch (e) {
      const market = memoryMarkets.get(id);
      if (!market) {
        return new Response(JSON.stringify({ error: 'Market not found' }), { status: 404, headers });
      }
      return new Response(JSON.stringify(market), { headers });
    }
  }

  // POST /api/markets/:id/vote
  if (method === 'POST' && url.includes('/api/markets/') && url.includes('/vote')) {
    const id = url.split('/api/markets/')[1].split('/')[0];
    
    let choice;
    try {
      const body = await request.json();
      choice = body.choice;
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400, headers });
    }

    if (choice !== 'yes' && choice !== 'no') {
      return new Response(JSON.stringify({ error: 'Choice must be yes or no' }), { status: 400, headers });
    }

    try {
      let market = await kv.hgetall(`market:${id}`);
      if (!market) market = memoryMarkets.get(id);
      
      if (!market) {
        return new Response(JSON.stringify({ error: 'Market not found' }), { status: 404, headers });
      }

      if (choice === 'yes') market.yesVotes = (market.yesVotes || 0) + 1;
      else market.noVotes = (market.noVotes || 0) + 1;

      await kv.hset(`market:${id}`, market);
      memoryMarkets.set(id, market);
      
      return new Response(JSON.stringify({ market, totalVotes: (market.yesVotes || 0) + (market.noVotes || 0) }), { headers });
    } catch (e) {
      console.log('KV error:', e.message);
      return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers });
    }
  }

  // POST /api/markets - Create market
  if (method === 'POST' && url === '/api/markets') {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400, headers });
    }

    const { question, description, endDate, type } = body;
    if (!question || !endDate) {
      return new Response(JSON.stringify({ error: 'Question and endDate required' }), { status: 400, headers });
    }

    const market = {
      id: Date.now().toString(),
      question,
      description: description || '',
      type: type || 'event',
      endDate: new Date(endDate).getTime(),
      yesVotes: 0,
      noVotes: 0,
      status: 'active',
      outcome: null,
      createdAt: new Date().toISOString()
    };

    try {
      await kv.hset(`market:${market.id}`, market);
      const marketIds = (await kv.get('moltymarkets')) || [];
      marketIds.push(market.id);
      await kv.set('moltymarkets', marketIds);
      memoryMarkets.set(market.id, market);
    } catch (e) {
      console.log('KV error, using memory:', e.message);
      memoryMarkets.set(market.id, market);
    }

    return new Response(JSON.stringify({ market }), { headers });
  }

  // GET /api/health
  if (method === 'GET' && url === '/api/health') {
    try {
      await kv.get('test-key');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        storage: 'kv',
        timestamp: new Date().toISOString() 
      }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        storage: 'memory',
        timestamp: new Date().toISOString() 
      }), { headers });
    }
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
}

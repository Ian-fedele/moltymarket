import { kv } from '@vercel/kv';

// In-memory fallback for development
const memoryMarkets = new Map();

export default async function handler(request, response) {
  const { method } = request;

  // CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    // GET /api/markets - Fetch all markets
    if (method === 'GET' && (request.url === '/api/markets' || request.url.includes('/api/markets?'))) {
      let markets;
      try {
        markets = await kv.get('moltymarkets');
        if (!markets) markets = [];
      } catch (e) {
        // Fallback to memory if KV not connected
        markets = Array.from(memoryMarkets.values());
      }
      
      // Sort by created date
      markets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return response.json({ markets, count: markets.length });
    }

    // GET /api/markets/:id - Fetch single market
    if (method === 'GET' && request.url.includes('/api/markets/')) {
      const id = request.url.split('/api/markets/')[1].split('?')[0];
      let market;
      try {
        market = await kv.hgetall(`market:${id}`);
      } catch (e) {
        market = memoryMarkets.get(id);
      }
      
      if (!market) {
        return response.status(404).json({ error: 'Market not found' });
      }
      return response.json(market);
    }

    // POST /api/markets - Create new market
    if (method === 'POST' && request.url === '/api/markets') {
      const { question, description, endDate, type } = request.body;
      
      if (!question || !endDate) {
        return response.status(400).json({ error: 'Question and endDate required' });
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
        const markets = await kv.get('moltymarkets') || [];
        markets.push(market.id);
        await kv.set('moltymarkets', markets);
      } catch (e) {
        memoryMarkets.set(market.id, market);
      }

      return response.json({ market });
    }

    // POST /api/markets/:id/vote - Vote on a market
    if (method === 'POST' && request.url.includes('/api/markets/') && request.url.includes('/vote')) {
      const id = request.url.split('/api/markets/')[1].split('/')[0];
      const { choice } = request.body;

      if (choice !== 'yes' && choice !== 'no') {
        return response.status(400).json({ error: 'Choice must be yes or no' });
      }

      let market;
      try {
        market = await kv.hgetall(`market:${id}`);
      } catch (e) {
        market = memoryMarkets.get(id);
      }

      if (!market) {
        return response.status(404).json({ error: 'Market not found' });
      }

      if (choice === 'yes') market.yesVotes = (market.yesVotes || 0) + 1;
      else market.noVotes = (market.noVotes || 0) + 1;

      try {
        await kv.hset(`market:${id}`, market);
      } catch (e) {
        memoryMarkets.set(id, market);
      }

      return response.json({ 
        market,
        totalVotes: (market.yesVotes || 0) + (market.noVotes || 0)
      });
    }

    // GET /api/health - Health check
    if (method === 'GET' && request.url === '/api/health') {
      return response.json({ 
        status: 'ok', 
        storage: 'kv',
        timestamp: new Date().toISOString() 
      });
    }

    return response.status(404).json({ error: 'Not found' });

  } catch (error) {
    console.error('API Error:', error);
    return response.status(500).json({ error: error.message });
  }
}

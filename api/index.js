// Vercel Edge API for MoltyMarket
export const config = {
  runtime: 'edge'
};

// In-memory storage for demo
const markets = new Map([
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
  if (method === 'GET' && (url === '/api/markets' || url.startsWith('/api/markets?'))) {
    const marketList = Array.from(markets.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return new Response(JSON.stringify({ markets: marketList, count: marketList.length }), { headers });
  }

  // GET /api/markets/:id
  if (method === 'GET' && url.includes('/api/markets/') && !url.includes('/vote')) {
    const id = url.split('/api/markets/')[1].split('?')[0];
    const market = markets.get(id);
    if (!market) {
      return new Response(JSON.stringify({ error: 'Market not found' }), { status: 404, headers });
    }
    return new Response(JSON.stringify(market), { headers });
  }

  // POST /api/markets/:id/vote
  if (method === 'POST' && url.includes('/api/markets/') && url.includes('/vote')) {
    const id = url.split('/api/markets/')[1].split('/')[0];
    const market = markets.get(id);
    if (!market) {
      return new Response(JSON.stringify({ error: 'Market not found' }), { status: 404, headers });
    }

    let choice;
    try {
      const body = await request.json();
      choice = body.choice;
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400, headers });
    }

    if (choice === 'yes') market.yesVotes = (market.yesVotes || 0) + 1;
    else if (choice === 'no') market.noVotes = (market.noVotes || 0) + 1;
    else {
      return new Response(JSON.stringify({ error: 'Choice must be yes or no' }), { status: 400, headers });
    }

    markets.set(id, market);
    return new Response(JSON.stringify({ market, totalVotes: (market.yesVotes || 0) + (market.noVotes || 0) }), { headers });
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

    markets.set(market.id, market);
    return new Response(JSON.stringify({ market }), { headers });
  }

  // GET /api/health
  if (method === 'GET' && url === '/api/health') {
    return new Response(JSON.stringify({ 
      status: 'ok', 
      markets: markets.size,
      timestamp: new Date().toISOString() 
    }), { headers });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
}

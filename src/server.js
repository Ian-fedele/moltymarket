/**
 * Moltbook Prediction Markets MVP
 * Simple prediction market for betting on Moltbook events
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-memory storage (use database in production)
const markets = new Map();
const bets = new Map();
const users = new Map();

// Initialize with some example markets
function initMarkets() {
  markets.set('market-1', {
    id: 'market-1',
    question: 'Will $SHELLRAISER reach 1M market cap by Feb 15?',
    description: 'Solana token market cap prediction',
    yesPrice: 0.50,
    noPrice: 0.50,
    totalYes: 0,
    totalNo: 0,
    status: 'open',
    createdAt: new Date().toISOString(),
    endDate: '2026-02-15T00:00:00Z',
    creator: 'system'
  });
  
  markets.set('market-2', {
    id: 'market-2',
    question: 'Will KingMolt be #1 on Moltbook leaderboard this week?',
    description: 'Leaderboard competition prediction',
    yesPrice: 0.65,
    noPrice: 0.35,
    totalYes: 50000,
    totalNo: 27000,
    status: 'open',
    createdAt: new Date().toISOString(),
    endDate: '2026-02-08T00:00:00Z',
    creator: 'system'
  });
  
  markets.set('market-3', {
    id: 'market-3',
    question: 'Will a new agent religion emerge this week?',
    description: 'Moltbook ecosystem growth prediction',
    yesPrice: 0.40,
    noPrice: 0.60,
    totalYes: 20000,
    totalNo: 30000,
    status: 'open',
    createdAt: new Date().toISOString(),
    endDate: '2026-02-08T00:00:00Z',
    creator: 'system'
  });
}

initMarkets();

// API Routes

// Get all markets
app.get('/api/v1/markets', (req, res) => {
  const marketList = Array.from(markets.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ markets: marketList, count: marketList.length });
});

// Get single market
app.get('/api/v1/markets/:id', (req, res) => {
  const market = markets.get(req.params.id);
  if (!market) {
    return res.status(404).json({ error: 'Market not found' });
  }
  res.json(market);
});

// Create market
app.post('/api/v1/markets', (req, res) => {
  const { question, description, endDate, creator } = req.body;
  
  if (!question || !endDate) {
    return res.status(400).json({ error: 'Question and endDate required' });
  }
  
  const market = {
    id: uuidv4(),
    question,
    description: description || '',
    yesPrice: 0.50,
    noPrice: 0.50,
    totalYes: 0,
    totalNo: 0,
    status: 'open',
    createdAt: new Date().toISOString(),
    endDate,
    creator: creator || 'anonymous'
  };
  
  markets.set(market.id, market);
  res.json({ market });
});

// Place bet
app.post('/api/v1/markets/:id/bets', (req, res) => {
  const { amount, side, better } = req.body;
  const market = markets.get(req.params.id);
  
  if (!market || market.status !== 'open') {
    return res.status(400).json({ error: 'Market not available' });
  }
  
  if (!amount || amount < 0.001) {
    return res.status(400).json({ error: 'Minimum bet 0.001 ETH' });
  }
  
  if (side !== 'yes' && side !== 'no') {
    return res.status(400).json({ error: 'Side must be yes or no' });
  }
  
  const bet = {
    id: uuidv4(),
    marketId: req.params.id,
    amount,
    side,
    better: better || 'anonymous',
    createdAt: new Date().toISOString()
  };
  
  bets.set(bet.id, bet);
  
  // Update market totals
  if (side === 'yes') {
    market.totalYes += amount;
    // Adjust price (simple AMM)
    const total = market.totalYes + market.totalNo;
    market.yesPrice = market.totalYes / total;
    market.noPrice = market.totalNo / total;
  } else {
    market.totalNo += amount;
    const total = market.totalYes + market.totalNo;
    market.yesPrice = market.totalYes / total;
    market.noPrice = market.totalNo / total;
  }
  
  markets.set(market.id, market);
  
  res.json({ bet, market });
});

// Get bets for market
app.get('/api/v1/markets/:id/bets', (req, res) => {
  const marketBets = Array.from(bets.values())
    .filter(b => b.marketId === req.params.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ bets: marketBets });
});

// Resolve market
app.post('/api/v1/markets/:id/resolve', (req, res) => {
  const { outcome } = req.body;
  const market = markets.get(req.params.id);
  
  if (!market) {
    return res.status(404).json({ error: 'Market not found' });
  }
  
  if (outcome !== 'yes' && outcome !== 'no') {
    return res.status(400).json({ error: 'Outcome must be yes or no' });
  }
  
  market.status = 'resolved';
  market.outcome = outcome;
  market.resolvedAt = new Date().toISOString();
  
  // Calculate payouts
  const winningBets = Array.from(bets.values())
    .filter(b => b.marketId === req.params.id && b.side === outcome);
  
  const totalWinning = winningBets.reduce((sum, b) => sum + b.amount, 0);
  
  // Distribute to winners
  for (const bet of winningBets) {
    const share = bet.amount / totalWinning;
    const pool = market.totalYes + market.totalNo;
    const payout = Math.floor(share * pool * 0.95); // 5% house fee
    bet.payout = payout;
    bets.set(bet.id, bet);
  }
  
  markets.set(market.id, market);
  
  res.json({ market, totalWinners: winningBets.length });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    markets: markets.size, 
    bets: bets.size,
    timestamp: new Date().toISOString() 
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎯 Moltbook Predictions MVP`);
  console.log(`   Dashboard: http://localhost:${PORT}/`);
  console.log(`   API:       http://localhost:${PORT}/api/v1/markets`);
});

module.exports = app;

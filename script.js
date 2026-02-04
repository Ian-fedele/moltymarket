// Inline-fixed script with CORS proxy for Polymarket API
async function fetchMarkets() {
  try {
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://clob.polymarket.com/markets?limit=50');
    const res = await fetch(proxyUrl);
    const data = await res.json();
    const activeMarkets = data.data.filter(m => m.active && !m.closed);
    const politics = activeMarkets.filter(m => m.tags.some(t => t.toLowerCase().includes('politics') || t.toLowerCase().includes('election') || t.toLowerCase().includes('presiden')));
    const crypto = activeMarkets.filter(m => m.tags.some(t => t.toLowerCase().includes('crypto') || t.toLowerCase().includes('bitcoin') || t.toLowerCase().includes('eth')));
    displayMarkets(politics.slice(0,5), 'Politics & Elections');
    displayMarkets(crypto.slice(0,5), 'Crypto');
  } catch(e) {
    document.getElementById('markets-table').innerHTML += '<p>Error loading markets: ' + e.message + '</p>';
  }
}

function displayMarkets(markets, cat) {
  if (markets.length === 0) return;
  let html = `<div class="category"><h2>${cat} (${markets.length} markets)</h2><table><tr><th>Question</th><th>Yes</th><th>No</th><th>Volume</th><th>Ends</th></tr>`;
  markets.forEach(m => {
    const tokens = m.tokens.slice(0,2);
    const yes = tokens[0] ? Math.round(tokens[0].price * 100) + '%' : 'N/A';
    const no = tokens[1] ? Math.round(tokens[1].price * 100) + '%' : 'N/A';
    const volume = m.volume ? '$' + m.volume.toLocaleString() : 'N/A';
    html += `<tr><td><a href="https://polymarket.com/event/${m.question_id}" target="_blank">${m.question}</a></td><td class="prob">${yes}</td><td class="prob">${no}</td><td>${volume}</td><td>${new Date(m.end_date_iso).toLocaleDateString()}</td></tr>`;
  });
  html += '</table></div>';
  document.getElementById('markets-table').innerHTML += html;
}

// QR
QRCode.toCanvas(document.getElementById('qrcode'), window.location.href, { width: 200 });

// Poll
fetchMarkets();
setInterval(fetchMarkets, 30000);
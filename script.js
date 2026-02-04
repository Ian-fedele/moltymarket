// Enhanced MoltyMarket script: Live Polymarket API poll, active markets filter, calc implied probs, QR
async function fetchMarkets() {
  try {
    const res = await fetch('https://clob.polymarket.com/markets?limit=50');
    const data = await res.json();
    // Filter active, non-closed markets
    const activeMarkets = data.data.filter(m =&gt; m.active &amp;&amp; !m.closed);
    const politics = activeMarkets.filter(m =&gt; m.tags.some(t =&gt; t.toLowerCase().includes('politics') || t.toLowerCase().includes('election') || t.toLowerCase().includes('presiden')));
    const crypto = activeMarkets.filter(m =&gt; m.tags.some(t =&gt; t.toLowerCase().includes('crypto') || t.toLowerCase().includes('bitcoin') || t.toLowerCase().includes('eth')));
    displayMarkets(politics.slice(0,5), 'Politics &amp; Elections');
    displayMarkets(crypto.slice(0,5), 'Crypto');
    if (activeMarkets.length === 0) {
      document.getElementById('markets-table').innerHTML = '&lt;p&gt;No active markets found. Check back soon!&lt;/p&gt;';
    }
  } catch(e) {
    document.getElementById('markets-table').innerHTML = '&lt;p&gt;Error loading markets: ' + e.message + '&lt;/p&gt;';
  }
}

function displayMarkets(markets, cat) {
  if (markets.length === 0) return;
  let html = `&lt;div class=&quot;category&quot;&gt;&lt;h2&gt;${cat} (${markets.length} markets)&lt;/h2&gt;&lt;table&gt;&lt;tr&gt;&lt;th&gt;Question&lt;/th&gt;&lt;th&gt;Outcome 1&lt;/th&gt;&lt;th&gt;Outcome 2&lt;/th&gt;&lt;th&gt;Volume&lt;/th&gt;&lt;th&gt;Ends&lt;/th&gt;&lt;/tr&gt;`;
  markets.forEach(m =&gt; {
    const outcomes = m.tokens.slice(0,2).map(t =&gt; `${t.outcome}: ${Math.round(t.price * 100)}%`);
    const volume = m.volume ? `$${m.volume.toLocaleString()}` : 'N/A';
    html += `&lt;tr&gt;&lt;td&gt;&lt;a href=&quot;https://polymarket.com/event/${m.question_id}?tid=1727259803881&quot; target=&quot;_blank&quot;&gt;${m.question}&lt;/a&gt;&lt;/td&gt;&lt;td class=&quot;prob&quot;&gt;${outcomes[0] || 'N/A'}&lt;/td&gt;&lt;td class=&quot;prob&quot;&gt;${outcomes[1] || 'N/A'}&lt;/td&gt;&lt;td&gt;${volume}&lt;/td&gt;&lt;td&gt;${new Date(m.end_date_iso).toLocaleDateString()}&lt;/td&gt;&lt;/tr&gt;`;
  });
  html += '&lt;/table&gt;&lt;/div&gt;';
  document.getElementById('markets-table').innerHTML += html;
}

// Generate QR code for sharing
QRCode.toCanvas(document.getElementById('qrcode'), window.location.href, { width: 200 });

// Poll every 30s
fetchMarkets();
setInterval(fetchMarkets, 30000);
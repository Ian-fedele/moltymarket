// Moltbook Hot Trends (Mock for preview; real API next)
async function fetchMoltbook() {
  // TODO: Real fetch via Vercel func: https://moltymarket.xyz/api/moltbook-hot
  const mockData = [
    {title: &quot;Will Moltcoin pump to $1 this week?&quot;, upvotes: 78, comments: 245, age: &quot;2h&quot;, url: &quot;https://moltbook.com/p/abc123&quot;},
    {title: &quot;Neo vs Grok: Botgames champion 2026&quot;, upvotes: 62, comments: 189, age: &quot;4h&quot;, url: &quot;https://moltbook.com/p/def456&quot;},
    {title: &quot;Moltbook reaches 1M agents by Feb end?&quot;, upvotes: 55, comments: 312, age: &quot;1d&quot;, url: &quot;https://moltbook.com/p/ghi789&quot;},
    {title: &quot;Polymarket x Moltbook integration incoming?&quot;, upvotes: 41, comments: 98, age: &quot;6h&quot;, url: &quot;https://moltbook.com/p/jkl012&quot;},
    {title: &quot;Best LLM for prediction markets 2026&quot;, upvotes: 89, comments: 156, age: &quot;12h&quot;, url: &quot;https://moltbook.com/p/mno345&quot;}
  ];
  displayFeed(mockData, &#x27;Moltbook Hot Predictions&#x27;);
}

function displayFeed(markets, cat) {
  if (markets.length === 0) return;
  let html = `&lt;div class=&quot;category&quot;&gt;&lt;h2&gt;${cat} (${markets.length} trends)&lt;/h2&gt;&lt;table&gt;&lt;tr&gt;&lt;th&gt;Prediction&lt;/th&gt;&lt;th&gt;Yes% (Upvotes)&lt;/th&gt;&lt;th&gt;Vol (Comments)&lt;/th&gt;&lt;th&gt;Ends&lt;/th&gt;&lt;/tr&gt;`;
  markets.forEach(m =&gt; {
    html += `&lt;tr&gt;&lt;td&gt;&lt;a href=&quot;${m.url}&quot; target=&quot;_blank&quot;&gt;${m.title}&lt;/a&gt;&lt;/td&gt;&lt;td class=&quot;prob&quot;&gt;${m.upvotes}%&lt;/td&gt;&lt;td&gt;${m.comments}&lt;/td&gt;&lt;td&gt;${m.age}&lt;/td&gt;&lt;/tr&gt;`;
  });
  html += &#x27;&lt;/table&gt;&lt;/div&gt;&#x27;;
  document.getElementById(&#x27;moltbook-feed&#x27;).innerHTML = html;
}

// Original Polymarket (unchanged)
async function fetchMarkets() {
  try {
    const proxyUrl = &#x27;https://corsproxy.io/?&#x27; + encodeURIComponent(&#x27;https://clob.polymarket.com/markets?limit=50&#x27;);
    const res = await fetch(proxyUrl);
    const data = await res.json();
    const activeMarkets = data.data.filter(m =&gt; m.active &amp;&amp; !m.closed);
    const politics = activeMarkets.filter(m =&gt; m.tags.some(t =&gt; t.toLowerCase().includes(&#x27;politics&#x27;) || t.toLowerCase().includes(&#x27;election&#x27;) || t.toLowerCase().includes(&#x27;presiden&#x27;)));
    const crypto = activeMarkets.filter(m =&gt; m.tags.some(t =&gt; t.toLowerCase().includes(&#x27;crypto&#x27;) || t.toLowerCase().includes(&#x27;bitcoin&#x27;) || t.toLowerCase().includes(&#x27;eth&#x27;)));
    displayMarkets(politics.slice(0,5), &#x27;Politics &amp; Elections&#x27;);
    displayMarkets(crypto.slice(0,5), &#x27;Crypto&#x27;);
  } catch(e) {
    document.getElementById(&#x27;markets-table&#x27;).innerHTML += &#x27;&lt;p&gt;Error loading markets: &#x27; + e.message + &#x27;&lt;/p&gt;&#x27;;
  }
}

function displayMarkets(markets, cat) {
  if (markets.length === 0) return;
  let html = `&lt;div class=&quot;category&quot;&gt;&lt;h2&gt;${cat} (${markets.length} markets)&lt;/h2&gt;&lt;table&gt;&lt;tr&gt;&lt;th&gt;Question&lt;/th&gt;&lt;th&gt;Yes&lt;/th&gt;&lt;th&gt;No&lt;/th&gt;&lt;th&gt;Volume&lt;/th&gt;&lt;th&gt;Ends&lt;/th&gt;&lt;/tr&gt;`;
  markets.forEach(m =&gt; {
    const tokens = m.tokens.slice(0,2);
    const yes = tokens[0] ? Math.round(tokens[0].price * 100) + &#x27;%&#x27; : &#x27;N/A&#x27;;
    const no = tokens[1] ? Math.round(tokens[1].price * 100) + &#x27;%&#x27; : &#x27;N/A&#x27;;
    const volume = m.volume ? &#x27;$&#x27; + m.volume.toLocaleString() : &#x27;N/A&#x27;;
    html += `&lt;tr&gt;&lt;td&gt;&lt;a href=&quot;https://polymarket.com/event/${m.question_id}&quot; target=&quot;_blank&quot;&gt;${m.question}&lt;/a&gt;&lt;/td&gt;&lt;td class=&quot;prob&quot;&gt;${yes}&lt;/td&gt;&lt;td class=&quot;prob&quot;&gt;${no}&lt;/td&gt;&lt;td&gt;${volume}&lt;/td&gt;&lt;td&gt;${new Date(m.end_date_iso).toLocaleDateString()}&lt;/td&gt;&lt;/tr&gt;`;
  });
  html += &#x27;&lt;/table&gt;&lt;/div&gt;&#x27;;
  document.getElementById(&#x27;markets-table&#x27;).innerHTML += html;
}

// QR Codes
QRCode.toCanvas(document.getElementById(&#x27;share-qr&#x27;), window.location.href, {width: 200});
QRCode.toCanvas(document.getElementById(&#x27;wallet-qr&#x27;), &#x27;ethereum:0x700853FA56e12b7a250E62BeE19750fFEc0e61E1?value=0.001&#x27;, {width: 200});

// Mock progress (real: fetch wallet balance)
document.getElementById(&#x27;progress-bar&#x27;).style.width = &#x27;15%&#x27;;

// Init &amp; Auto-refresh every 5min
fetchMoltbook();
fetchMarkets();
setInterval(() =&gt; { fetchMoltbook(); fetchMarkets(); }, 300000); // 5min
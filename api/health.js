export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  const { method, url } = request;

  // CORS
  const response = new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });

  if (method === 'OPTIONS') {
    return response;
  }

  return new Response(JSON.stringify({ 
    status: 'ok',
    message: 'MoltyMarket API',
    time: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

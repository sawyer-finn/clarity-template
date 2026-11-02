// Vercel serverless function — proxies ClickUp API requests
// Keeps the API key server-side (set CLICKUP_API_KEY in Vercel env vars)
// Also checks DASHBOARD_PASSWORD for auth

export default async function handler(req, res) {
  // CORS for same-origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Simple auth check
  const authHeader = req.headers.authorization;
  const expectedPassword = process.env.DASHBOARD_PASSWORD;
  if (!authHeader || authHeader !== `Bearer ${expectedPassword}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'CLICKUP_API_KEY not configured' });
  }

  const { endpoint } = req.query;
  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint parameter' });
  }

  // Only allow specific ClickUp API paths
  const allowedPrefixes = ['/list/', '/team/', '/task/'];
  const isAllowed = allowedPrefixes.some(p => endpoint.startsWith(p));
  if (!isAllowed) {
    return res.status(403).json({ error: 'Endpoint not allowed' });
  }

  try {
    const url = `https://api.clickup.com/api/v2${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch from ClickUp', detail: err.message });
  }
}

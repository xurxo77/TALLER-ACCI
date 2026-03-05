export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { code } = req.body || {};
    const adminKey = process.env.ADMIN_KEY;
    
    if (code && adminKey && code === adminKey) {
        return res.status(200).json({ valid: true, role: 'admin' });
    }
    
    return res.status(401).json({ valid: false, error: 'Invalid admin key' });
}

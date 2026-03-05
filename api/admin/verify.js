export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // LOG: ver qué llega
    console.log('Method:', req.method);
    console.log('Headers:', req.headers['content-type']);
    console.log('Body raw:', req.body);
    
    if (req.method === 'GET') {
        const code = req.query ? req.query.code : null;
        const adminKey = process.env.ADMIN_KEY;
        console.log('GET code:', code, 'adminKey:', adminKey);
        return res.status(200).json({ valid: code === adminKey });
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { code } = req.body || {};
    const adminKey = process.env.ADMIN_KEY;
    
    console.log('POST code:', code, 'adminKey:', adminKey);
    console.log('Match:', code === adminKey);
    
    if (code && adminKey && code === adminKey) {
        return res.status(200).json({ valid: true, role: 'admin' });
    }
    
    return res.status(401).json({ valid: false, error: 'Invalid admin key' });
}

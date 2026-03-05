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
    
    let body = {};
    try {
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const rawBody = Buffer.concat(chunks).toString();
        if (rawBody) {
            body = JSON.parse(rawBody);
        }
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON' });
    }
    
    const { code } = body;
    const adminKey = process.env.ADMIN_KEY;
    
    if (code && adminKey && code === adminKey) {
        return res.status(200).json({ valid: true, role: 'admin' });
    }
    
    return res.status(401).json({ valid: false, error: 'Invalid admin key' });
}

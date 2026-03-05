export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Leer body
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
        return res.status(400).json({ error: 'Invalid JSON', details: e.message });
    }
    
    const { code } = body;
    const adminKey = process.env.ADMIN_KEY;
    
    // Devolver información de debug
    return res.status(200).json({
        received: code,
        expected: adminKey,
        match: code === adminKey,
        receivedLength: code ? code.length : 0,
        expectedLength: adminKey ? adminKey.length : 0
    });
}
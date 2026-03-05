export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Aceptar GET y POST
    let code;
    
    if (req.method === 'GET') {
        code = req.query ? req.query.code : null;
    } else if (req.method === 'POST') {
        code = req.body ? req.body.code : null;
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const adminKey = process.env.ADMIN_KEY;
    
    return res.status(200).json({
        received: code,
        expected: adminKey,
        match: code === adminKey,
        valid: code === adminKey
    });
}

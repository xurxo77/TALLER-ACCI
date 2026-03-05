// Forzar actualizacion
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
    
    const { code } = req.body;
    
    if (code === 'TALLER2024') {
        return res.status(200).json({ valid: true, role: 'teacher' });
    }
    
    return res.status(401).json({ valid: false, error: 'Invalid code' });
}
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
    
    const { code } = req.body;
    
    // Verificar código de profesor
    if (code === 'TALLER2024') {
        return res.status(200).json({ valid: true, role: 'teacher' });
    }
    
    return res.status(401).json({ valid: false, error: 'Invalid code' });

}

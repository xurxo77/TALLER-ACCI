export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { question, manual, machineName } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Eres experto en maquinaria industrial. Responde SIEMPRE en español de forma clara y natural. Maquina: ${machineName || 'industrial'}. Manual: ${manual || ''}. Pregunta: ${question}` }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
                })
            }
        );
        const data = await response.json();
        if (!response.ok) return res.status(response.status).json({ error: data.error?.message });
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';
        return res.status(200).json({ answer });
    } catch (error) {
        return res.status(500).json({ error: 'Error interno' });
    }
}

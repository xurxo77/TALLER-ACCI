export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { question, pdfBase64, machineName } = req.body;
    
    if (!question) return res.status(400).json({ error: 'Question required' });
    if (!pdfBase64) return res.status(400).json({ error: 'PDF required' });
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inline_data: {
                                    mime_type: "application/pdf",
                                    data: pdfBase64
                                }
                            },
                            {
                                text: `Eres un experto tecnico en maquinaria industrial. Analiza el manual PDF y responde en español de forma clara y natural.

Maquina: ${machineName || 'industrial'}

PREGUNTA: ${question}

Responde de forma practica y directa usando la informacion del manual.`
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000
                    }
                })
            }
        );
        
        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Error de Gemini' });
        }
        
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';
        return res.status(200).json({ answer });
        
    } catch (error) {
        return res.status(500).json({ error: 'Error: ' + error.message });
    }
}

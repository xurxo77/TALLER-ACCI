export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { question, pdfBase64, machineName } = req.body;
    
    if (!question) return res.status(400).json({ error: 'Pregunta requerida' });
    if (!pdfBase64) return res.status(400).json({ error: 'PDF requerido' });
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
                                text: `Eres un experto técnico en maquinaria industrial. Responde SIEMPRE en español de forma clara, precisa y natural.

Máquina: ${machineName || 'industrial'}

PREGUNTA: ${question}

Analiza el manual PDF adjunto y responde usando esa información de forma práctica y directa.`
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

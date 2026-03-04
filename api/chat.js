export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { question, pdfBase64, pdfUrl, machineName } = req.body;
    
    if (!question) return res.status(400).json({ error: 'Question required' });
    
    try {
        let pdfData = pdfBase64;
        
        // Si viene URL del PDF, descargarlo
        if (pdfUrl && !pdfData) {
            const pdfResponse = await fetch(pdfUrl);
            const arrayBuffer = await pdfResponse.arrayBuffer();
            pdfData = Buffer.from(arrayBuffer).toString('base64');
        }
        
        if (!pdfData) {
            return res.status(400).json({ error: 'PDF data required' });
        }
        
        // Llamar a Gemini con el PDF
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inline_data: {
                                    mime_type: "application/pdf",
                                    data: pdfData
                                }
                            },
                            {
                                text: `Eres un experto técnico en maquinaria industrial. Analiza el manual PDF adjunto y responde a la pregunta del usuario de forma clara, precisa y natural en español.

La máquina es: ${machineName || 'una máquina industrial'}

PREGUNTA DEL USUARIO:
 ${question}

Responde de forma práctica y directa. Si encuentras la información en el manual, úsala. Cita especificaciones técnicas si las encuentras.`
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
            console.error('Gemini error:', JSON.stringify(data, null, 2));
            return res.status(response.status).json({ error: data.error?.message || 'Error de Gemini' });
        }
        
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude analizar el manual.';
        
        return res.status(200).json({ answer });
        
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Error interno: ' + error.message });
    }
}

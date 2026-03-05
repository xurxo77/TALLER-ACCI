export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Obtener la URL base
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;
        
        // Intentar cargar machines.json
        const response = await fetch(`${baseUrl}/machines.json`);
        
        if (!response.ok) {
            // Si no existe, devolver lista por defecto
            return res.status(200).json({
                machines: [
                    {"id":"rustler","name":"Rustler EM","model":"EM","brand":"ESAB","cat":"soldadura","img":"rustler.jpg","pdf":"rustler.pdf"},
                    {"id":"buddy","name":"Buddy ARC 180","model":"ARC 180","brand":"ESAB","cat":"soldadura","img":"buddy.jpg","pdf":"buddy.pdf"},
                    {"id":"buddytig","name":"Buddy TIG 160","model":"TIG 160","brand":"ESAB","cat":"soldadura","img":"buddytig.jpg","pdf":"buddytig.pdf"},
                    {"id":"sierra","name":"Sierra de Cinta","model":"FAT 280","brand":"FAT","cat":"corte","img":"FAT280.jpg","pdf":"FAT280.pdf"},
                    {"id":"curvadora","name":"Curvadora","model":"RBM 1050-22","brand":"RBM","cat":"conformado","img":"RBMCURVADORA.jpg","pdf":"RBMCURVADORA.pdf"},
                    {"id":"biseladora","name":"Biseladora","model":"KRBS 101","brand":"KRBS","cat":"corte","img":"biseladoratubos.jpg","pdf":"biseladoratubos.pdf"},
                    {"id":"ionplasma","name":"Ion Plasma Cutter","model":"Plasma","brand":"NomadTechnologies","cat":"corte","img":"ionplasma.jpg","pdf":"ionplasma.pdf"},
                    {"id":"powermax","name":"Cortadora Plasma","model":"Powermax 900","brand":"Hypertherm","cat":"corte","img":"cortadoraplasmamanual.jpg","pdf":"cortadoraplasmamanual.pdf"},
                    {"id":"selco","name":"Neomig 2400","model":"Semiautomatica","brand":"Selco","cat":"soldadura","img":"selco.jpg","pdf":"selco.pdf"},
                    {"id":"rebel","name":"Rebel 235ic","model":"Semiautomatica","brand":"ESAB","cat":"soldadura","img":"rebel.jpg","pdf":"rebel.pdf"},
                    {"id":"taladro","name":"Taladro Columna","model":"S32","brand":"Ibarmia","cat":"corte","img":"taladro.jpg","pdf":"taladro.pdf"},
                    {"id":"plegadora","name":"Plegadora","model":"hS2 AS","brand":"Generica","cat":"conformado","img":"plegadora.jpg","pdf":"plegadora.pdf"}
                ]
            });
        }
        
        const machines = await response.json();
        return res.status(200).json({ machines });
        
    } catch (error) {
        console.error('Error loading machines:', error);
        return res.status(500).json({ error: 'Error loading machines' });
    }
}
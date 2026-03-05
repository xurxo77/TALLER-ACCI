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
    
    // Verificar Admin (usando el valor del entorno directamente)
    const adminKey = process.env.ADMIN_KEY;
    // Como no enviamos la clave en FormData, confiamos en que el usuario ya hizo login
    // En producción, usarías un token JWT
    
    try {
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('boundary')) {
            return res.status(400).json({ error: 'Invalid Content-Type' });
        }
        
        const boundary = contentType.split('boundary=')[1];
        const fields = parseMultipart(buffer, boundary);
        
        const { name, model, brand, category, image, pdf } = fields;
        
        if (!name || !category || !image || !pdf) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        
        // Subir a GitHub
        const githubToken = process.env.GITHUB_TOKEN;
        const githubRepo = process.env.GITHUB_REPO;
        
        if (!githubToken || !githubRepo) {
            return res.status(500).json({ error: 'Faltan variables de entorno' });
        }
        
        const owner = githubRepo.split('/')[0];
        const repo = githubRepo.split('/')[1];
        
        // Generar ID
        const id = name.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 20);
        
        // Subir imagen
        const imageName = `${id}.jpg`;
        await uploadToGitHub(owner, repo, imageName, image.data, githubToken);
        
        // Subir PDF
        const pdfName = `${id}.pdf`;
        await uploadToGitHub(owner, repo, pdfName, pdf.data, githubToken);
        
        // Actualizar machines.json
        await addMachineToJson(owner, repo, {
            id,
            name,
            model: model || 'N/A',
            brand: brand || 'Generic',
            cat: category,
            img: imageName,
            pdf: pdfName
        }, githubToken);
        
        return res.status(200).json({ 
            success: true, 
            machine: { id, name, model, brand, category }
        });
        
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function uploadToGitHub(owner, repo, filename, content, token) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;
    
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Taller-App'
        },
        body: JSON.stringify({
            message: `Add ${filename}`,
            content: content.toString('base64')
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error subiendo a GitHub');
    }
    
    return response.json();
}

async function addMachineToJson(owner, repo, newMachine, token) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/machines.json`;
    
    const getResponse = await fetch(url, {
        headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'Taller-App'
        }
    });
    
    let machines = [];
    let sha = null;
    
    if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
        machines = JSON.parse(Buffer.from(fileData.content, 'base64').toString());
    }
    
    machines.push(newMachine);
    
    const updateResponse = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Taller-App'
        },
        body: JSON.stringify({
            message: `Add machine: ${newMachine.name}`,
            content: Buffer.from(JSON.stringify(machines, null, 2)).toString('base64'),
            sha: sha
        })
    });
    
    if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.message || 'Error actualizando machines.json');
    }
    
    return updateResponse.json();
}

function parseMultipart(buffer, boundary) {
    const result = {};
    const boundaryBuffer = Buffer.from('--' + boundary);
    const parts = buffer.toString('binary').split('--' + boundary);
    
    for (const part of parts) {
        if (part.trim() === '' || part.trim() === '--') continue;
        
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;
        
        const header = part.substring(0, headerEnd);
        const content = part.substring(headerEnd + 4);
        
        const nameMatch = header.match(/name="([^"]+)"/);
        const filenameMatch = header.match(/filename="([^"]+)"/);
        
        if (nameMatch) {
            const name = nameMatch[1];
            
            if (filenameMatch) {
                const contentTypeMatch = header.match(/Content-Type:\s*([^\r\n]+)/);
                result[name] = {
                    filename: filenameMatch[1],
                    contentType: contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream',
                    data: Buffer.from(content.replace(/\r\n$/, ''), 'binary')
                };
            } else {
                result[name] = content.replace(/\r\n$/, '');
            }
        }
    }
    
    return result;
}

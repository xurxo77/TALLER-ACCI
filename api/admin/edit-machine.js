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
        
        const { id, name, model, brand, category, image, pdf } = fields;
        
        if (!id || !name || !category) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        
        const githubToken = process.env.GITHUB_TOKEN;
        const githubRepo = process.env.GITHUB_REPO;
        
        if (!githubToken || !githubRepo) {
            return res.status(500).json({ error: 'Faltan variables de entorno' });
        }
        
        const owner = githubRepo.split('/')[0];
        const repo = githubRepo.split('/')[1];
        
        // Subir nueva imagen si existe
        if (image && image.data) {
            const imageName = `${id}.jpg`;
            await uploadToGitHub(owner, repo, imageName, image.data, githubToken);
        }
        
        // Subir nuevo PDF si existe
        if (pdf && pdf.data) {
            const pdfName = `${id}.pdf`;
            await uploadToGitHub(owner, repo, pdfName, pdf.data, githubToken);
        }
        
        // Actualizar machines.json
        await updateMachineInJson(owner, repo, {
            id,
            name,
            model: model || 'N/A',
            brand: brand || 'Generica',
            cat: category,
            img: `${id}.jpg`,
            pdf: `${id}.pdf`
        }, githubToken);
        
        return res.status(200).json({ success: true });
        
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function uploadToGitHub(owner, repo, filename, content, token) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;
    
    // Obtener SHA del archivo existente
    const getResponse = await fetch(url, {
        headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'Taller-App'
        }
    });
    
    let sha = null;
    if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
    }
    
    const body = {
        message: `Update ${filename}`,
        content: content.toString('base64')
    };
    if (sha) body.sha = sha;
    
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Taller-App'
        },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error subiendo a GitHub');
    }
    
    return response.json();
}

async function updateMachineInJson(owner, repo, updatedMachine, token) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/machines.json`;
    
    const getResponse = await fetch(url, {
        headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'Taller-App'
        }
    });
    
    if (!getResponse.ok) {
        throw new Error('No se pudo obtener machines.json');
    }
    
    const fileData = await getResponse.json();
    const sha = fileData.sha;
    let machines = JSON.parse(Buffer.from(fileData.content, 'base64').toString());
    
    // Actualizar la maquina
    const index = machines.findIndex(m => m.id === updatedMachine.id);
    if (index === -1) {
        throw new Error('Maquina no encontrada');
    }
    
    machines[index] = updatedMachine;
    
    const updateResponse = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Taller-App'
        },
        body: JSON.stringify({
            message: `Update machine: ${updatedMachine.name}`,
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
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
        // Verificar que es admin (usando token o clave)
        const adminKey = req.headers['x-admin-key'] || req.body.adminKey;
        
        if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Parsear multipart/form-data
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        const boundary = req.headers['content-type'].split('boundary=')[1];
        const fields = parseMultipart(buffer, boundary);
        
        const { name, model, brand, category, image, pdf } = fields;
        
        if (!name || !category || !image || !pdf) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Subir archivos a GitHub
        const githubToken = process.env.GITHUB_TOKEN;
        const githubRepo = process.env.GITHUB_REPO;
        const owner = githubRepo.split('/')[0];
        const repo = githubRepo.split('/')[1];
        
        // Generar ID único
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
            'User-Agent': 'Taller-ACC-App'
        },
        body: JSON.stringify({
            message: `Add ${filename}`,
            content: content.toString('base64')
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error uploading to GitHub');
    }
    
    return response.json();
}

async function addMachineToJson(owner, repo, newMachine, token) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/machines.json`;
    
    // Obtener archivo actual
    const getResponse = await fetch(url, {
        headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'Taller-ACC-App'
        }
    });
    
    let machines = [];
    let sha = null;
    
    if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
        machines = JSON.parse(Buffer.from(fileData.content, 'base64').toString());
    }
    
    // Añadir nueva máquina
    machines.push(newMachine);
    
    // Subir archivo actualizado
    const updateResponse = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Taller-ACC-App'
        },
        body: JSON.stringify({
            message: `Add machine: ${newMachine.name}`,
            content: Buffer.from(JSON.stringify(machines, null, 2)).toString('base64'),
            sha: sha
        })
    });
    
    if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.message || 'Error updating machines.json');
    }
    
    return updateResponse.json();
}

function parseMultipart(buffer, boundary) {
    const result = {};
    const boundaryBuffer = Buffer.from('--' + boundary);
    const parts = buffer.toString().split('--' + boundary);
    
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
                // Es un archivo
                const contentTypeMatch = header.match(/Content-Type:\s*([^\r\n]+)/);
                result[name] = {
                    filename: filenameMatch[1],
                    contentType: contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream',
                    data: Buffer.from(content.replace(/\r\n$/, ''), 'binary')
                };
            } else {
                // Es un campo de texto
                result[name] = content.replace(/\r\n$/, '');
            }
        }
    }
    
    return result;
}
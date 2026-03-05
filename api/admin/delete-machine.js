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
    
    const { id } = req.body || {};
    
    if (!id) {
        return res.status(400).json({ error: 'ID requerido' });
    }
    
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;
    
    if (!githubToken || !githubRepo) {
        return res.status(500).json({ error: 'Faltan variables de entorno' });
    }
    
    const owner = githubRepo.split('/')[0];
    const repo = githubRepo.split('/')[1];
    
    try {
        // Borrar imagen
        await deleteFromGitHub(owner, repo, `${id}.jpg`, githubToken);
        
        // Borrar PDF
        await deleteFromGitHub(owner, repo, `${id}.pdf`, githubToken);
        
        // Actualizar machines.json
        await deleteMachineFromJson(owner, repo, id, githubToken);
        
        return res.status(200).json({ success: true });
        
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function deleteFromGitHub(owner, repo, filename, token) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;
    
    // Obtener SHA
    const getResponse = await fetch(url, {
        headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'Taller-App'
        }
    });
    
    if (!getResponse.ok) {
        // El archivo no existe, ignorar
        return;
    }
    
    const fileData = await getResponse.json();
    const sha = fileData.sha;
    
    // Borrar
    await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Taller-App'
        },
        body: JSON.stringify({
            message: `Delete ${filename}`,
            sha: sha
        })
    });
}

async function deleteMachineFromJson(owner, repo, machineId, token) {
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
    
    // Filtrar la maquina
    machines = machines.filter(m => m.id !== machineId);
    
    const updateResponse = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Taller-App'
        },
        body: JSON.stringify({
            message: `Delete machine: ${machineId}`,
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
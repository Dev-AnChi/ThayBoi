export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get current count from external storage
        const getResponse = await fetch('https://api.jsonbin.io/v3/b/65f8a1231f5677401f2b8a1a/latest', {
            headers: {
                'X-Master-Key': '$2a$10$8K1p/a0dL3KzQbVQ8K1p/a0dL3KzQbVQ8K1p/a0dL3KzQbVQ8K1p/a0dL3KzQbVQ'
            }
        });
        
        let currentCount = 0;
        if (getResponse.ok) {
            const data = await getResponse.json();
            currentCount = data.record?.count || 0;
        }
        
        // Increment count
        const newCount = currentCount + 1;
        
        // Update external storage
        const updateResponse = await fetch('https://api.jsonbin.io/v3/b/65f8a1231f5677401f2b8a1a', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': '$2a$10$8K1p/a0dL3KzQbVQ8K1p/a0dL3KzQbVQ8K1p/a0dL3KzQbVQ8K1p/a0dL3KzQbVQ'
            },
            body: JSON.stringify({ count: newCount })
        });
        
        console.log(`📊 Usage count incremented to: ${newCount} at ${new Date().toISOString()}`);
        
        res.status(200).json({ 
            success: true, 
            message: 'Usage logged successfully',
            count: newCount
        });
    } catch (error) {
        console.error('Error incrementing usage:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to log usage' 
        });
    }
}

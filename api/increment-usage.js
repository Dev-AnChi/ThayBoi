export default function handler(req, res) {
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
        // Increment the global counter
        if (!global.usageCount) {
            global.usageCount = 0;
        }
        global.usageCount += 1;
        
        console.log(`📊 Usage count incremented to: ${global.usageCount} at ${new Date().toISOString()}`);
        
        res.status(200).json({ 
            success: true, 
            message: 'Usage logged successfully',
            count: global.usageCount
        });
    } catch (error) {
        console.error('Error incrementing usage:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to log usage' 
        });
    }
}

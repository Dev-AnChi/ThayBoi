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
        // Use /tmp directory for persistence (survives during cold starts)
        const tmpFile = '/tmp/usage_count.txt';
        let count = 0;
        
        // Read current count
        try {
            if (require('fs').existsSync(tmpFile)) {
                const data = require('fs').readFileSync(tmpFile, 'utf8');
                count = parseInt(data.trim()) || 0;
            }
        } catch (readError) {
            console.log('Could not read count, starting from 0');
        }
        
        // Increment
        count += 1;
        
        // Write back
        try {
            require('fs').writeFileSync(tmpFile, count.toString());
            console.log(`📊 Usage count incremented to: ${count} at ${new Date().toISOString()}`);
        } catch (writeError) {
            console.error('Could not write count:', writeError);
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Usage logged successfully',
            count: count
        });
    } catch (error) {
        console.error('Error incrementing usage:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to log usage' 
        });
    }
}

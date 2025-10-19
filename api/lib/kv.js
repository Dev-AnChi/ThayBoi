// Simple store using Vercel Edge Config or memory fallback

let memoryStore = {};

export async function get(key) {
    // Try to use Vercel Edge Config if available
    if (process.env.EDGE_CONFIG_ID && process.env.EDGE_CONFIG_TOKEN) {
        try {
            const response = await fetch(`https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items`, {
                headers: {
                    Authorization: `Bearer ${process.env.EDGE_CONFIG_TOKEN}`
                }
            });
            const data = await response.json();
            return data[key] || null;
        } catch (error) {
            console.log('Edge Config not available, using memory:', error.message);
        }
    }
    
    // Fallback to memory store
    return memoryStore[key] || null;
}

export async function set(key, value) {
    // Try to use Vercel Edge Config if available
    if (process.env.EDGE_CONFIG_ID && process.env.EDGE_CONFIG_TOKEN) {
        try {
            const response = await fetch(`https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${process.env.EDGE_CONFIG_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    [key]: value
                })
            });
            await response.json();
            return true;
        } catch (error) {
            console.log('Edge Config not available, using memory:', error.message);
        }
    }
    
    // Fallback to memory store
    memoryStore[key] = value;
    return true;
}

export async function incr(key) {
    const current = await get(key);
    const newValue = (parseInt(current) || 0) + 1;
    await set(key, newValue);
    return newValue;
}


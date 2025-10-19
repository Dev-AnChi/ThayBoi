// Vercel Edge Config store
import { get as edgeGet } from '@vercel/edge-config';

export async function get(key) {
    try {
        const value = await edgeGet(key);
        console.log('📥 Edge Config get:', key, '=', value);
        return value || 0;
    } catch (error) {
        console.error('❌ Edge Config get error:', error);
        return 0;
    }
}

export async function set(key, value) {
    // Edge Config doesn't support direct set from serverless functions
    // We need to use the Edge Config API
    try {
        const response = await fetch(
            `https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${process.env.EDGE_CONFIG_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: [
                        {
                            operation: 'upsert',
                            key: key,
                            value: value,
                        },
                    ],
                }),
            }
        );
        
        if (response.ok) {
            console.log('✅ Edge Config set:', key, '=', value);
            return value;
        } else {
            const error = await response.text();
            console.error('❌ Edge Config set error:', error);
            return value;
        }
    } catch (error) {
        console.error('❌ Edge Config set error:', error);
        return value;
    }
}

export async function incr(key) {
    try {
        const current = await get(key);
        const newValue = (parseInt(current) || 0) + 1;
        await set(key, newValue);
        console.log('✅ Edge Config incremented:', key, 'to', newValue);
        return newValue;
    } catch (error) {
        console.error('❌ Edge Config incr error:', error);
        return 1;
    }
}


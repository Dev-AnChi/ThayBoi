// Simple persistent store using Vercel Edge Config

export async function get(key) {
    try {
        const { get } = await import('@vercel/edge-config');
        const value = await get(key);
        return value || 0;
    } catch (error) {
        console.log('Error getting data from Edge Config:', error.message);
        return 0;
    }
}

export async function set(key, value) {
    try {
        const { set } = await import('@vercel/edge-config');
        await set(key, value);
        return value;
    } catch (error) {
        console.log('Error setting data to Edge Config:', error.message);
        return value;
    }
}

export async function incr(key) {
    try {
        const current = await get(key);
        const newValue = (parseInt(current) || 0) + 1;
        await set(key, newValue);
        return newValue;
    } catch (error) {
        console.log('Error incrementing data in Edge Config:', error.message);
        return 1;
    }
}


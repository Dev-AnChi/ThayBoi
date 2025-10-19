// Simple persistent store using Vercel Edge Config with fallback

// Global memory store as fallback
let memoryStore = {};

export async function get(key) {
    try {
        console.log('🔍 Getting key from Edge Config:', key);
        const { get } = await import('@vercel/edge-config');
        const value = await get(key);
        console.log('📥 Retrieved value:', value);
        return value || 0;
    } catch (error) {
        console.error('❌ Error getting data from Edge Config:', error.message);
        console.log('🔄 Falling back to memory store');
        return memoryStore[key] || 0;
    }
}

export async function set(key, value) {
    try {
        console.log('💾 Setting key in Edge Config:', key, '=', value);
        const { set } = await import('@vercel/edge-config');
        await set(key, value);
        console.log('✅ Successfully set key:', key, '=', value);
        return value;
    } catch (error) {
        console.error('❌ Error setting data to Edge Config:', error.message);
        console.log('🔄 Falling back to memory store');
        memoryStore[key] = value;
        return value;
    }
}

export async function incr(key) {
    try {
        console.log('➕ Incrementing key:', key);
        const current = await get(key);
        const newValue = (parseInt(current) || 0) + 1;
        console.log('📊 Current value:', current, 'New value:', newValue);
        await set(key, newValue);
        console.log('✅ Successfully incremented key:', key, 'to:', newValue);
        return newValue;
    } catch (error) {
        console.error('❌ Error incrementing data in Edge Config:', error.message);
        console.log('🔄 Falling back to memory store');
        const current = memoryStore[key] || 0;
        const newValue = parseInt(current) + 1;
        memoryStore[key] = newValue;
        return newValue;
    }
}


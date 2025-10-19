// Simple persistent store using file system

import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'usage_data.json');

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Error loading data:', error.message);
    }
    return {};
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.log('Error saving data:', error.message);
        return false;
    }
}

export async function get(key) {
    const data = loadData();
    return data[key] || null;
}

export async function set(key, value) {
    const data = loadData();
    data[key] = value;
    saveData(data);
    return true;
}

export async function incr(key) {
    const current = await get(key);
    const newValue = (parseInt(current) || 0) + 1;
    await set(key, newValue);
    return newValue;
}


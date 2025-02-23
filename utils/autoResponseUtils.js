const fs = require('fs').promises;
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

async function ensureDataDirExists() {
    try {
        await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
        console.error('Gagal membuat direktori data:', error);
        throw error;
    }
}

async function getAutoResponsesForGroup(groupId) {
    await ensureDataDirExists();
    const filePath = path.join(dataDir, `${groupId}.json`);
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File tidak ditemukan, anggap tidak ada auto-response
            return [];
        }
        console.error(`Gagal membaca file auto-response untuk grup ${groupId}:`, error);
        return [];
    }
}

async function saveAutoResponsesForGroup(groupId, autoResponses) {
    await ensureDataDirExists();
    const filePath = path.join(dataDir, `${groupId}.json`);
    try {
        const data = JSON.stringify(autoResponses, null, 2); // Format JSON dengan indentasi 2 spasi
        await fs.writeFile(filePath, data, 'utf8');
    } catch (error) {
        console.error(`Gagal menyimpan auto-response untuk grup ${groupId}:`, error);
        throw error;
    }   
}

module.exports = {
    getAutoResponsesForGroup,
    saveAutoResponsesForGroup,
};
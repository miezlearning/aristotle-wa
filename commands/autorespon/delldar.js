const { getAutoResponsesForGroup, saveAutoResponsesForGroup } = require('../../utils/autoResponseUtils');

module.exports = {
    name: 'delautoresponse',
    category: 'auto response',

    alias: ['delar', 'hapusar'],
    description: 'Menghapus auto-response berdasarkan trigger.',
    async execute(client, msg, args) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return await client.sendMessage(msg.key.remoteJid, { text: 'Perintah ini hanya bisa digunakan di grup.' });
        }

        const groupId = msg.key.remoteJid;
        const triggerToDelete = args[0];

        if (!triggerToDelete) {
            return await client.sendMessage(msg.key.remoteJid, { text: 'Penggunaan: !delautoresponse [trigger]' });
        }

        try {
            let autoResponses = await getAutoResponsesForGroup(groupId);
            const initialLength = autoResponses.length;
            autoResponses = autoResponses.filter(ar => ar.trigger.toLowerCase() !== triggerToDelete.toLowerCase());

            if (autoResponses.length === initialLength) {
                return await client.sendMessage(msg.key.remoteJid, { text: `Tidak ditemukan auto-response dengan trigger "${triggerToDelete}".` });
            }

            await saveAutoResponsesForGroup(groupId, autoResponses);
            await client.sendMessage(msg.key.remoteJid, { text: `Auto-response untuk trigger "${triggerToDelete}" berhasil dihapus.` });
        } catch (error) {
            console.error('Gagal menghapus auto-response:', error);
            await client.sendMessage(msg.key.remoteJid, { text: '❌ Gagal menghapus auto-response. Coba lagi nanti.' });
        }
    },
};
const { getAutoResponsesForGroup } = require('../../utils/autoResponseUtils');

module.exports = {
    name: 'listautoresponses',
    category: 'auto response',
    alias: ['listars', 'daftarar'],
    description: 'Menampilkan daftar auto-response di grup ini.',
    async execute(client, msg, args) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return await client.sendMessage(msg.key.remoteJid, { text: 'Perintah ini hanya bisa digunakan di grup.' });
        }

        const groupId = msg.key.remoteJid;

        try {
            const autoResponses = await getAutoResponsesForGroup(groupId);
            if (autoResponses.length > 0) {
                let listText = 'Daftar Auto-response di grup ini:\n\n';
                autoResponses.forEach((ar, index) => {
                    listText += `${index + 1}. Trigger: ${ar.trigger}\n   Response: ${ar.response}\n`;
                });
                await client.sendMessage(msg.key.remoteJid, { text: listText });
            } else {
                await client.sendMessage(msg.key.remoteJid, { text: 'Tidak ada auto-response yang terdaftar di grup ini.' });
            }
        } catch (error) {
            console.error('Gagal mengambil daftar auto-response:', error);
            await client.sendMessage(msg.key.remoteJid, { text: '❌ Gagal mengambil daftar auto-response. Coba lagi nanti.' });
        }
    },
};
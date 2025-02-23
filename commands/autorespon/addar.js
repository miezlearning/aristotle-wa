const { getAutoResponsesForGroup, saveAutoResponsesForGroup } = require('../../utils/autoResponseUtils');

module.exports = {
    name: 'addautoresponse',
    category: 'auto response',
    alias: ['addar', 'buatar'],
    description: 'Menambahkan auto-response untuk grup ini.',
    async execute(client, msg, args) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return await client.sendMessage(msg.key.remoteJid, { text: 'Perintah ini hanya bisa digunakan di grup.' });
        }

        const groupId = msg.key.remoteJid;
        const [trigger, ...responseParts] = args;
        const response = responseParts.join(' ');

        if (!trigger || !response) {
            return await client.sendMessage(msg.key.remoteJid, { text: 'Penggunaan: !addautoresponse [trigger] [response]' });
        }

        try {
            let autoResponses = await getAutoResponsesForGroup(groupId);
            const existingTriggerIndex = autoResponses.findIndex(ar => ar.trigger.toLowerCase() === trigger.toLowerCase());
            if (existingTriggerIndex !== -1) {
                return await client.sendMessage(msg.key.remoteJid, { text: '❌ Trigger ini sudah terdaftar. Gunakan trigger lain.' });
            }

            autoResponses.push({ trigger, response });
            await saveAutoResponsesForGroup(groupId, autoResponses);
            await client.sendMessage(msg.key.remoteJid, { text: `Auto-response berhasil ditambahkan!\nTrigger: ${trigger}\nResponse: ${response}` }, {quote: msg});
        } catch (error) {
            console.error('Gagal menambahkan auto-response:', error);
            await client.sendMessage(msg.key.remoteJid, { text: '❌ Gagal menambahkan auto-response. Coba lagi nanti.' });
        }
    },
};
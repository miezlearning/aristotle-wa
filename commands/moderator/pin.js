module.exports = {
    name: 'pin',
    alias: ['p'],
    category: 'moderasi',
    description: 'Mem-pin pesan yang di-reply',
    usage: '!pin (balas pesan yang ingin di-pin)',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah pin dipanggil:', JSON.stringify(msg, null, 2));
        try {
            // Cek apakah pesan adalah reply
            if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Balas pesan yang ingin di-pin dengan !pin'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            // Ambil informasi pesan yang di-reply
            const quotedMsg = {
                key: {
                    remoteJid: msg.key.remoteJid,
                    id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                    participant: msg.message.extendedTextMessage.contextInfo.participant
                }
            };

            const messageId = quotedMsg.key.id;
            const jid = quotedMsg.key.remoteJid;

            console.log('Mem-pin pesan:', messageId);

            // Pin pesan menggunakan fetch
            await sock.fetch({
                method: 'PUT',
                url: `${sock.baseURI}/v1/conversations/${jid}/messages/${messageId}/pin`,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Pesan berhasil di-pin');
            await sock.sendMessage(msg.key.remoteJid, {
                text: '✅ Pesan telah di-pin!'
            });
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error('Error processing pin command:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal mem-pin pesan: ' + error.message
            });
        }
    }
};
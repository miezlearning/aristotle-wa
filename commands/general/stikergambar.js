const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'stickertoimg',
    alias: ['sti'],
    category: 'utility',
    description: 'Mengonversi stiker menjadi gambar PNG',
    usage: '!stickertoimg (reply ke stiker)',
    permission: 'user',
    async execute(sock, msg) {
        try {
            let stickerMessage = null;

            // Cek apakah pesan yang di-reply adalah stiker
            if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage) {
                stickerMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            }
            // Cek apakah pesan itu sendiri adalah sticker
            else if (msg.message?.stickerMessage) {
                stickerMessage = msg.message;
            }

            // Jika tidak ada stiker
            if (!stickerMessage) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Reply ke stiker atau kirim stiker untuk dikonversi ke gambar!\n\n' +
                          '⚠️ *Format:* !stickertoimg (reply ke stiker)'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

            // Download stiker sebagai buffer
            const buffer = await downloadMediaMessage(
                stickerMessage.stickerMessage ? { message: stickerMessage } : msg,
                'buffer',
                {},
                { reuploadRequest: sock.updateMediaMessage }
            );

            // Kirim sebagai gambar PNG
            await sock.sendMessage(msg.key.remoteJid, {
                image: buffer,
                caption: '✅ Stiker berhasil dikonversi ke gambar!'
            });

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });
        } catch (error) {
            console.error('Error:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal mengonversi stiker: ' + error.message
            });
        }
    }
};
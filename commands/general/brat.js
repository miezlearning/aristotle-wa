const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const fetch = require('node-fetch');

module.exports = {
    name: 'brat',
    category: 'general',
    description: 'Membuat sticker dengan gaya brat album dari teks',
    usage: '!brat <teks>',
    permission: 'user',
    async execute(sock, msg, args) {
        try {
            if (!args.length) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Kirim teks dengan perintah !brat <teks>'
                });
            }
            
            const text = args.join(' ');
            
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });
            
       
            const apiUrl = `https://ochinpo-helper.hf.space/brat?text=${encodeURIComponent(text)}`;
            
            const sticker = new Sticker(apiUrl, {
                pack: process.env.STICKER_PACKNAME || 'Aristotle Sticker',
                author: process.env.STICKER_AUTHOR || '@miezlipp',
                type: StickerTypes.FULL,
                quality: 100
            });
            
            const stickerMsg = await sticker.toMessage();
            await sock.sendMessage(msg.key.remoteJid, stickerMsg, { quoted: msg });
            
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });
            
        } catch (error) {
            console.error('Error creating brat sticker:', error);
            
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal membuat sticker: ' + (error.message || 'Error tidak diketahui')
            });
        }
    }
};
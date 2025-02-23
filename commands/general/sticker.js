const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'sticker',
    alias: ['s'],
    category: 'general',
    description: 'Membuat sticker dari gambar yang di-upload atau di-reply',
    usage: '!sticker (kirim gambar atau balas media)',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah sticker dipanggil:', JSON.stringify(msg, null, 2));
        try {
            // Cek apakah ada quoted message
            let quotedMsg = null;
            if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                console.log('Pesan adalah reply, memproses quoted message...');
                quotedMsg = {
                    message: msg.message.extendedTextMessage.contextInfo.quotedMessage,
                    key: {
                        remoteJid: msg.key.remoteJid,
                        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                        participant: msg.message.extendedTextMessage.contextInfo.participant
                    }
                };
            }

            // Tentukan pesan yang akan diproses
            let msgToProcess = quotedMsg || msg;

            // Cek tipe pesan dengan pendekatan yang lebih fleksibel
            let msgType = '';
            if (msgToProcess.message) {
                msgType = Object.keys(msgToProcess.message)[0];
                // Jika ada gambar dengan caption
                if (msgType === 'conversation' && msg.message.imageMessage) {
                    console.log('Gambar dengan caption terdeteksi');
                    msgToProcess = { message: msg.message.imageMessage };
                    msgType = 'imageMessage';
                }
            }
            console.log('Tipe pesan yang diproses:', msgType);

            const isMedia = ['imageMessage', 'videoMessage'].includes(msgType);
            console.log('Apakah media?', isMedia);

            if (!isMedia) {
                return await sock.sendMessage(msg.key.remoteJid, { 
                    text: 'Kirim gambar dengan perintah !sticker atau balas gambar dengan !sticker'
                });
            }

            if (msgType === 'videoMessage') {
                return await sock.sendMessage(msg.key.remoteJid, { 
                    text: '❌ Fitur sticker untuk video masih dalam maintenance.'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            console.log('Mulai download media...');
            const buffer = await downloadMediaMessage(
                msgToProcess,
                'buffer',
                {},
                { reuploadRequest: sock.updateMediaMessage }
            );
            console.log('Media berhasil didownload, ukuran:', buffer.length);

            console.log('Membuat stiker...');
            const sticker = new Sticker(buffer, {
                pack: process.env.STICKER_PACKNAME || 'Aristotle Sticker',
                author: process.env.STICKER_AUTHOR || '@miezlipp',
                type: StickerTypes.FULL,
                quality: 50
            });

            console.log('Stiker dibuat, mengirim...');
            const stickerMsg = await sticker.toMessage();
            await sock.sendMessage(msg.key.remoteJid, stickerMsg);
            console.log('Stiker terkirim');

            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error('Error creating sticker:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Gagal membuat sticker: ' + error.message
            });
        }
    }
};
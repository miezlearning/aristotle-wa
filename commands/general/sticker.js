const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fetch = require('node-fetch');
const fs = require('fs');
const webp = require('node-webpmux');

// Fungsi addExif yang diambil dari kode yang Anda berikan
async function addExif(webpSticker, packname, author) {
    const img = new webp.Image();
    const stickerPackId = require('crypto').randomBytes(32).toString('hex');
    const json = { 
        'sticker-pack-id': stickerPackId, 
        'sticker-pack-name': packname, 
        'sticker-pack-publisher': author 
    };
    let exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    let exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    await img.load(webpSticker);
    img.exif = exif;
    return await img.save(null);
}

// Fungsi createSticker yang disesuaikan
async function createSticker(buffer, url, packName, authorName, quality) {
    const stickerMetadata = {
        type: StickerTypes.FULL,
        pack: packName,
        author: authorName,
        quality
    };
    const sticker = new Sticker(buffer || url, stickerMetadata);
    return await sticker.toBuffer();
}

// Fungsi mp4ToWebp yang disesuaikan (tanpa ketergantungan eksternal berlebih)
async function mp4ToWebp(buffer, { packname, author }) {
    const sticker = new Sticker(buffer, {
        pack: packname,
        author: author,
        type: StickerTypes.FULL,
        quality: 50
    });
    return await sticker.toBuffer();
}

module.exports = {
    name: 'stiker',
    alias: ['sk'],
    category: 'general',
    description: 'Membuat sticker dari gambar, video, atau URL yang di-upload/di-reply',
    usage: '!stiker (kirim gambar/video/sticker atau balas media) | [packname]|[author]',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah stiker dipanggil:', JSON.stringify(msg, null, 2));
        try {
            let quotedMsg = null;
            let msgToProcess = msg;
            let msgType = '';

            // Check if the message is a reply
            if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                console.log('Pesan adalah reply, memproses quoted message...');
                quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                msgToProcess = {
                    key: {
                        remoteJid: msg.key.remoteJid,
                        id: msg.message.extendedTextMessage.contextInfo.stanzaId || Date.now().toString(),
                        participant: msg.message.extendedTextMessage.contextInfo.participant
                    },
                    message: quotedMsg
                };
            }

            // Determine message type
            if (msgToProcess.message) {
                const msgKeys = Object.keys(msgToProcess.message);
                msgType = msgKeys.length > 0 ? msgKeys[0] : '';
                if (msgType === 'conversation' && msg.message.imageMessage) {
                    console.log('Gambar dengan caption terdeteksi');
                    msgToProcess.message = { imageMessage: msg.message.imageMessage };
                    msgType = 'imageMessage';
                }
            }
            console.log('Tipe pesan yang diproses:', msgType);

            const isMedia = ['imageMessage', 'videoMessage', 'stickerMessage'].includes(msgType);
            console.log('Apakah media?', isMedia);

            // Parse packname and author from args
            let packName = process.env.STICKER_PACKNAME || 'Aristotle Sticker';
            let authorName = process.env.STICKER_AUTHOR || '@miezlipp';
            if (args.length > 0) {
                let [pack, ...author] = args.join(' ').split('|');
                packName = pack || packName;
                authorName = author.join('|') || authorName;
            }

            if (!isMedia && !(args[0] && isUrl(args[0]))) {
                return await sock.sendMessage(msg.key.remoteJid, { 
                    text: `Kirim gambar, video, atau sticker dengan perintah !stiker atau balas media dengan !stiker\n` +
                          `Atau kirim URL gambar/video dengan !stiker [url] | [packname]|[author]`
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            let stiker = false;
            if (isMedia) {
                console.log('Mulai download media...');
                const buffer = await downloadMediaMessage(
                    msgToProcess,
                    'buffer',
                    {},
                    { reuploadRequest: sock.updateMediaMessage }
                );
                console.log('Media berhasil didownload, ukuran:', buffer.length);

                if (buffer.length > 500 * 1024) {
                    throw '❌ File terlalu besar! Maksimal 500 KB untuk sticker.';
                }

                if (msgType === 'stickerMessage') {
                    stiker = await addExif(buffer, packName, authorName);
                } else if (msgType === 'imageMessage') {
                    stiker = await createSticker(buffer, false, packName, authorName, 50);
                } else if (msgType === 'videoMessage') {
                    const videoSeconds = msgToProcess.message.videoMessage.seconds;
                    if (videoSeconds > 7) {
                        throw '❌ Video terlalu panjang! Maksimal 7 detik untuk sticker.';
                    }
                    stiker = await mp4ToWebp(buffer, { packname: packName, author: authorName });
                }
            } else if (args[0] && isUrl(args[0])) {
                const response = await fetch(args[0]);
                const buffer = await response.buffer();
                stiker = await createSticker(buffer, false, packName, authorName, 50);
            }

            if (stiker instanceof Error) throw stiker;

            console.log('Stiker dibuat, mengirim...');
            await sock.sendMessage(msg.key.remoteJid, { sticker: stiker }, { quoted: msg });
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
                text: '❌ Gagal membuat sticker: ' + (error.message || 'Error tidak diketahui')
            });
        }
    }
};

// Fungsi bantu
const isUrl = (text) => text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(jpe?g|gif|png|mp4)/, 'gi'));
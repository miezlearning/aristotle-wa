const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const webp = require('node-webpmux');

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

async function createSticker(buffer, url, packName, authorName, quality) {
    const stickerMetadata = {
        type: StickerTypes.FULL,
        pack: packName,
        author: authorName,
        quality: quality || 100, // Tingkatkan kualitas default ke 80
        width: 512,
        height: 512
    };
    const sticker = new Sticker(buffer || url, stickerMetadata);
    return await sticker.toBuffer();
}

async function mp4ToWebp(buffer, { packname, author }) {
    return new Promise(async (resolve, reject) => {
        const inputPath = `./temp_input_${Date.now()}.mp4`;
        const outputPath = `./temp_output_${Date.now()}.webp`;
        
        try {
            await fs.writeFile(inputPath, buffer);

            ffmpeg(inputPath)
                .outputOptions([
                    '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2',
                    '-vcodec', 'libwebp',
                    '-lossless', '0', // Matikan lossless untuk kualitas lebih baik dengan kompresi
                    '-q:v', '100', // Tingkatkan kualitas video (0-100, lebih tinggi = lebih baik)
                    '-compression_level', '1', // Tingkat kompresi (0-6, 6 = maksimum kualitas)
                    '-loop', '0',
                    '-preset', 'default',
                    '-an', // Hapus audio
                    '-vsync', '0'
                ])
                .toFormat('webp')
                .on('error', (err) => reject(err))
                .on('end', async () => {
                    const webpBuffer = await fs.readFile(outputPath);
                    const sticker = new Sticker(webpBuffer, {
                        pack: packname,
                        author: author,
                        type: StickerTypes.FULL,
                        quality: 100 // Tingkatkan kualitas stiker
                    });
                    const stickerBuffer = await sticker.toBuffer();
                    await fs.unlink(inputPath);
                    await fs.unlink(outputPath);
                    resolve(stickerBuffer);
                })
                .save(outputPath);
        } catch (err) {
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
            reject(err);
        }
    });
}

module.exports = {
    name: 'stiker',
    alias: ['sk','s'],
    category: 'general',
    description: 'Membuat sticker dari gambar, video, atau URL yang di-upload/di-reply',
    usage: '!stiker (kirim gambar/video/sticker atau balas media) | [packname]|[author]',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah stiker dipanggil:', JSON.stringify(msg, null, 2));
        try {
            let msgToProcess = msg;
            let msgType = '';

            if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                console.log('Pesan adalah reply, memproses quoted message...');
                const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                if (!quotedMsg || !msg.message.extendedTextMessage.contextInfo) {
                    throw new Error('Struktur quoted message tidak valid');
                }
                msgToProcess = {
                    key: {
                        remoteJid: msg.key.remoteJid,
                        id: msg.message.extendedTextMessage.contextInfo.stanzaId || Date.now().toString(),
                        participant: msg.message.extendedTextMessage.contextInfo.participant || undefined,
                        fromMe: false
                    },
                    message: quotedMsg,
                    messageTimestamp: msg.messageTimestamp || Math.floor(Date.now() / 1000),
                    participant: msg.message.extendedTextMessage.contextInfo.participant || undefined,
                    messageContextInfo: msg.message.messageContextInfo || quotedMsg.messageContextInfo || undefined,
                    contextInfo: msg.message.extendedTextMessage.contextInfo || undefined,
                    status: msg.status || 2,
                    pushName: msg.pushName || undefined,
                    sender: msg.key.participant || msg.key.remoteJid
                };
            }

            if (!msgToProcess.key || !msgToProcess.message) {
                throw new Error('Struktur pesan tidak valid: key atau message hilang');
            }

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
                console.log('Struktur msgToProcess sebelum download:', JSON.stringify(msgToProcess, null, 2));
                console.log('Mulai download media...');
                const buffer = await downloadMediaMessage(
                    msgToProcess,
                    'buffer',
                    {},
                    { reuploadRequest: sock.updateMediaMessage }
                );
                console.log('Media berhasil didownload, ukuran:', buffer.length);

                if (buffer.length > 5 * 1024 * 1024) {
                    throw new Error('❌ File terlalu besar! Maksimal 5 MB untuk sticker.');
                }

                if (msgType === 'stickerMessage') {
                    stiker = await addExif(buffer, packName, authorName);
                } else if (msgType === 'imageMessage') {
                    stiker = await createSticker(buffer, false, packName, authorName, 80); // Tingkatkan kualitas
                } else if (msgType === 'videoMessage') {
                    const videoSeconds = msgToProcess.message.videoMessage.seconds;
                    if (videoSeconds > 7) {
                        throw new Error('❌ Video terlalu panjang! Maksimal 7 detik untuk sticker.');
                    }
                    stiker = await mp4ToWebp(buffer, { packname: packName, author: authorName });
                }
            } else if (args[0] && isUrl(args[0])) {
                const response = await fetch(args[0]);
                const buffer = await response.buffer();
                if (buffer.length > 5 * 1024 * 1024) {
                    throw new Error('❌ File terlalu besar! Maksimal 5 MB untuk sticker.');
                }
                stiker = await createSticker(buffer, false, packName, authorName, 80); // Tingkatkan kualitas
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

const isUrl = (text) => text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(jpe?g|gif|png|mp4)/, 'gi'));
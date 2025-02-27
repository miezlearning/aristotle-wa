const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const Jimp = require('jimp');  // Import the jimp library

module.exports = {
    name: 'stickertext',
    alias: ['stext'],
    category: 'general',
    description: 'Membuat sticker dari gambar dengan teks (atas/bawah)',
    usage: '!stext [atas/bawah] [teks] (kirim/balas dengan media)',
    permission: 'user',
    async execute(sock, msg, args) {
        try {
            // 1. Parse arguments
            if (args.length < 2) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Penggunaan: !stext [atas/bawah] [teks].  Balas gambar dengan perintah ini.'
                });
            }

            const position = args[0].toLowerCase(); // 'atas' atau 'bawah'
            const text = args.slice(1).join(' '); // Gabungkan sisa argumen menjadi teks
            if (!['atas', 'bawah'].includes(position)) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Posisi harus "atas" atau "bawah".'
                });
            } 

            // 2. Handle quoted message
            let quotedMsg = null;

            if (msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
                quotedMsg = {
                    message: msg.message.extendedTextMessage.contextInfo.quotedMessage,
                    key: {
                        remoteJid: msg.key.remoteJid,
                        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                        participant: msg.message.extendedTextMessage.contextInfo.participant
                    }
                };
            }

            let msgToProcess = quotedMsg || msg;

            const msgType = Object.keys(msgToProcess.message)[0];
            const isMedia = ['imageMessage', 'videoMessage'].includes(msgType);

            if (!isMedia) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Balas gambar dengan perintah !stext [atas/bawah] [teks]'
                });
            }

            // Check if the media is a video
            if (msgType === 'videoMessage') {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Fitur sticker untuk video masih dalam maintenance.'
                });
            }

            // 3. Download media
            await sock.sendMessage(msg.key.remoteJid, {
                react: {
                    text: "⏳",
                    key: msg.key
                }
            });

            const buffer = await downloadMediaMessage(
                msgToProcess,
                'buffer',
                {},
                { reuploadRequest: sock.updateMediaMessage }
            );

            // 4. Image manipulation (menggunakan library 'jimp')
            try {
                const image = await Jimp.read(buffer); // Load image from buffer

                const width = image.getWidth();
                const height = image.getHeight();

                // Load font yang mendukung emoji
                let font;
              

                const textWidth = Jimp.measureText(font, text);
                const textHeight = Jimp.measureTextHeight(font, text, width); // Menghitung tinggi teks

                const padding = 10; // Padding di sekitar teks
                const rectWidth = width; // Lebar latar belakang = lebar gambar
                const rectHeight = textHeight + padding * 2; // Tinggi latar belakang = tinggi teks + padding

                let rectY;
                if (position === 'atas') {
                    rectY = 0; // Posisi teks di atas
                } else {
                    rectY = height - rectHeight; // Posisi teks di bawah
                }

                // Buat latar belakang semi-transparan
                const background = new Jimp(rectWidth, rectHeight, 'rgba(0,0,0,0.5)'); // Warna hitam dengan transparansi 50%

                // Komposit latar belakang ke gambar
                image.composite(background, 0, rectY);

                // Tulis teks di atas latar belakang
                image.print(
                    font,
                    (width - textWidth) / 2, // Posisi X: tengah
                    rectY + padding, // Posisi Y: di dalam latar belakang
                    {
                        text: text,
                        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                    },
                    rectWidth, // Lebar bounding box
                    rectHeight // Tinggi bounding box
                );

                const manipulatedBuffer = await image.getBufferAsync(Jimp.MIME_PNG); // Convert to PNG buffer

                // Create sticker
                const sticker = new Sticker(manipulatedBuffer, {
                    pack: process.env.STICKER_PACKNAME || 'Aristotle Sticker',
                    author: process.env.STICKER_AUTHOR || '@miezlipp',
                    type: StickerTypes.FULL,
                    quality: 50
                });

                // Convert to message format and send
                const stickerMsg = await sticker.toMessage();
                await sock.sendMessage(msg.key.remoteJid, stickerMsg);

                // React with "success" emoji when done
                await sock.sendMessage(msg.key.remoteJid, {
                    react: {
                        text: "✅",
                        key: msg.key
                    }
                });

            } catch (imageError) {
                console.error('Error manipulating image:', imageError);
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Gagal menambahkan teks ke gambar. Pastikan gambar valid dan library "jimp" terinstall.'
                });
            }

        } catch (error) {
            console.error('Error creating sticker:', error);

            await sock.sendMessage(msg.key.remoteJid, {
                react: {
                    text: "⚠️",
                    key: msg.key
                }
            });

            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal membuat sticker.  Terjadi kesalahan.'
            });
        }
    }
};
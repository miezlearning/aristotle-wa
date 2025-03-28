const config = require('../../config.json');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');

module.exports = {
    name: 'hijaukan',
    alias: ['hyjaukan', 'hyjaukanwaifu'],
    category: 'tools',
    description: 'Mengubah kulit karakter anime menjadi hijau',
    usage: '!hijaukan (kirim dengan gambar anime)',
    permission: 'user',
    async execute(sock, msg, args) {
        try {
            // Cek apakah ada gambar yang dikirim
            if (!msg.message?.imageMessage) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Kirim/Reply gambar anime terlebih dahulu!\n\n' +
                          '⚠️ *Format:* !hijaukan (attach gambar anime)'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

            // Download gambar dari pesan
            const buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                { reuploadRequest: sock.updateMediaMessage }
            );

            // Buat FormData untuk upload ke Catbox
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', buffer, {
                filename: 'image.jpg',
                contentType: 'image/jpeg'
            });

            // Upload gambar ke Catbox
            const catboxResponse = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: {
                    ...form.getHeaders()
                }
            });

            const imageUrl = catboxResponse.data;
            if (!imageUrl || !imageUrl.startsWith('https://files.catbox.moe/')) {
                throw new Error('Gagal mengunggah gambar ke Catbox');
            }

            // Log untuk debugging
            console.log('Catbox URL:', imageUrl);

            // Buat URL dengan query string untuk API hiuraa
            const promptText = encodeURIComponent("Ubah warna kulit atau skin tone menjadi hijau saja, tanpa mengubah elemen lain pada gambar");
            const apiUrl = `https://api.hiuraa.my.id/ai/gemini-canvas?text=${promptText}&imageUrl=${encodeURIComponent(imageUrl)}`;            // Request ke API hiuraa menggunakan GET
            const apiResponse = await axios.get(apiUrl);

            // Log response untuk debugging
            console.log('API Response:', apiResponse.data);

            if (!apiResponse.data.result || !apiResponse.data.result.image || !apiResponse.data.result.image.base64) {
                throw new Error('Response dari API tidak valid atau kosong');
            }

            const processedImage = Buffer.from(apiResponse.data.result.image.base64, 'base64');

            // Kirim hasil gambar yang sudah diedit
            await sock.sendMessage(msg.key.remoteJid, {
                image: processedImage,
                caption: '✅ Kulit karakter anime telah diubah menjadi hitam!'
            });

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Error processing hijaukan command:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Gagal memproses gambar: ' + (error.response?.data?.error || error.message)
            });
        }
    }
};


// thanks for the reference....
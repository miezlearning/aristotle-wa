const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const FormData = require('form-data');

module.exports = {
    name: 'cantik',
    alias: ['beautiful'],
    category: 'utility',
    description: 'Mengedit gambar agar terlihat lebih cantik menggunakan API siputzx.my.id',
    usage: '!cantik [url_gambar] (wajib attach gambar jika tidak ada URL)',
    permission: 'user',
    async execute(sock, msg, args) {
        try {
            let imageUrl = args[0] || null;
            let uploadedUrl = null;

            // Jika ada URL yang diberikan (misalnya dari Catbox)
            if (imageUrl) {
                // Unduh gambar dari URL yang diberikan
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(imageResponse.data, 'binary');

                // Unggah ke ImgBB
                const form = new FormData();
                form.append('image', buffer.toString('base64'));
                const imgbbResponse = await axios.post('https://api.imgbb.com/1/upload', form, {
                    headers: { ...form.getHeaders() },
                    params: { key: '55e5cc5aa72caf6f56f15269597b4f20' } // API key ImgBB kamu
                });
                imageUrl = imgbbResponse.data.data.url;
                uploadedUrl = imageUrl;
                console.log('ImgBB URL from provided link:', imageUrl);
            }
            // Jika tidak ada URL tapi ada attachment gambar
            else if (msg.message?.imageMessage) {
                const buffer = await downloadMediaMessage(msg, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });

                // Unggah ke ImgBB
                const form = new FormData();
                form.append('image', buffer.toString('base64'));
                const imgbbResponse = await axios.post('https://api.imgbb.com/1/upload', form, {
                    headers: { ...form.getHeaders() },
                    params: { key: '55e5cc5aa72caf6f56f15269597b4f20' } // API key ImgBB kamu
                });
                imageUrl = imgbbResponse.data.data.url;
                uploadedUrl = imageUrl;
                console.log('ImgBB URL from attachment:', imageUrl);
            }

            // Jika tidak ada URL maupun attachment
            if (!imageUrl) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Kirim gambar melalui attachment atau masukkan URL gambar!\n\n' +
                          '⚠️ *Format:* !cantik [url_gambar]\n' +
                          '✅ Contoh: !cantik https://files.catbox.moe/5nxxqr.jpg'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

            // Proses dengan API siputzx.my.id
            const apiUrl = new URL('https://api.siputzx.my.id/api/m/beautiful');
            apiUrl.searchParams.append('url', encodeURI(imageUrl));

            console.log('API URL:', apiUrl.toString());

            const response = await axios.get(apiUrl.toString(), { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');

            let caption = '✅Berhasil!';
            if (uploadedUrl) caption += `\n\n📎 URL Gambar: ${uploadedUrl}`;

            await sock.sendMessage(msg.key.remoteJid, { image: buffer, caption });

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });
        } catch (error) {
            console.error('Error:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal mengedit gambar: ' + (error.response?.status ? `HTTP ${error.response.status}` : error.message)
            });
        }
    }
};
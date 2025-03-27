const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const FormData = require('form-data');

module.exports = {
    name: 'buatmeme',
    alias: ['meme'],
    category: 'fun',
    description: 'Membuat meme dengan teks atas dan bawah menggunakan gambar custom',
    usage: '!buatmeme <Top Text> | <Bottom Text> [url_gambar] (atau reply/attach gambar)',
    permission: 'user',
    async execute(sock, msg, args) {
        try {
            let imageUrl = null;
            let uploadedUrl = null;

            // Pisahkan teks atas dan bawah dari argumen
            const textInput = args.join(' ').split('|');
            if (textInput.length < 2) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Format salah! Gunakan: !buatmeme <Top Text> | <Bottom Text> [url_gambar]\n' +
                          '✅ Contoh: !buatmeme OH WOW | THIS IS BEAUTIFUL https://example.com/image.jpg\n' +
                          'ℹ️ Bisa juga reply atau attach gambar!'
                });
            }

            const topText = encodeURIComponent(textInput[0].trim());
            const bottomText = encodeURIComponent(textInput[1].trim());

            // Cek apakah ada URL gambar di argumen (ambil bagian terakhir setelah teks)
            const possibleUrl = args.slice(args.indexOf('|') + 1).join(' ').trim();
            if (possibleUrl && possibleUrl.startsWith('http')) {
                imageUrl = possibleUrl;
            }

            // Jika ada URL gambar di argumen
            if (imageUrl) {
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(imageResponse.data, 'binary');

                // Unggah ke ImgBB untuk mendapatkan URL stabil
                const form = new FormData();
                form.append('image', buffer.toString('base64'));
                const imgbbResponse = await axios.post('https://api.imgbb.com/1/upload', form, {
                    headers: { ...form.getHeaders() },
                    params: { key: '55e5cc5aa72caf6f56f15269597b4f20' } // Ganti dengan API key ImgBB kamu
                });
                imageUrl = imgbbResponse.data.data.url;
                uploadedUrl = imageUrl;
                console.log('ImgBB URL from provided link:', imageUrl);
            }
            // Jika ada pesan yang di-reply berisi gambar
            else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                const buffer = await downloadMediaMessage({ message: quotedMsg }, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });

                // Unggah ke ImgBB
                const form = new FormData();
                form.append('image', buffer.toString('base64'));
                const imgbbResponse = await axios.post('https://api.imgbb.com/1/upload', form, {
                    headers: { ...form.getHeaders() },
                    params: { key: '55e5cc5aa72caf6f56f15269597b4f20' } // Ganti dengan API key ImgBB kamu
                });
                imageUrl = imgbbResponse.data.data.url;
                uploadedUrl = imageUrl;
                console.log('ImgBB URL from replied image:', imageUrl);
            }
            // Jika ada attachment gambar di pesan
            else if (msg.message?.imageMessage) {
                const buffer = await downloadMediaMessage(msg, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });

                // Unggah ke ImgBB
                const form = new FormData();
                form.append('image', buffer.toString('base64'));
                const imgbbResponse = await axios.post('https://api.imgbb.com/1/upload', form, {
                    headers: { ...form.getHeaders() },
                    params: { key: '55e5cc5aa72caf6f56f15269597b4f20' } // Ganti dengan API key ImgBB kamu
                });
                imageUrl = imgbbResponse.data.data.url;
                uploadedUrl = imageUrl;
                console.log('ImgBB URL from attachment:', imageUrl);
            }

            // Jika tidak ada sumber gambar
            if (!imageUrl) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Kirim gambar melalui attachment, reply gambar, atau masukkan URL gambar!\n\n' +
                          '⚠️ *Format:* !buatmeme <Top Text> | <Bottom Text> [url_gambar]\n' +
                          '✅ Contoh: !buatmeme OH WOW | THIS IS BEAUTIFUL https://example.com/image.jpg'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

            // Panggil API meme dengan gambar custom
            const apiUrl = `https://api.siputzx.my.id/api/m/memgen?link=${encodeURI(imageUrl)}&top=${topText}&bottom=${bottomText}&font=1`;
            console.log('API URL:', apiUrl);

            const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');

            // Kirim hasil meme
            let caption = `✅ Meme berhasil dibuat!\nTeks Atas: ${textInput[0].trim()}\nTeks Bawah: ${textInput[1].trim()}`;
            if (uploadedUrl) caption += `\n\n📎 URL Gambar: ${uploadedUrl}`;

            await sock.sendMessage(msg.key.remoteJid, { image: buffer, caption });

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });
        } catch (error) {
            console.error('Error:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal membuat meme: ' + (error.response?.status ? `HTTP ${error.response.status}` : error.message)
            });
        }
    }
};
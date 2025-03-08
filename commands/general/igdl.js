const Axios = require('axios');
const fs = require('fs');

module.exports = {
    name: 'igdl',
    alias: ['ig', 'instadl'],
    category: 'media',
    description: 'Download media dari Instagram menggunakan URL',
    usage: '!igdl <URL Instagram>',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah igdl dipanggil:', JSON.stringify(msg, null, 2));

        try {
            // Cek apakah ada URL
            let url = args.join(' ').trim();
            if (!url || !url.includes('instagram.com')) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Masukkan URL Instagram yang valid!\n\n' +
                          '⚠️ *Format:* !igdl <URL>\n' +
                          '✅ Contoh: !igdl https://www.instagram.com/p/DG7i34Wxz36/'
                });
            }

            // Reaksi loading
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            console.log('Mengunduh data Instagram dari:', url);

            // Panggil fungsi fetch data
            const data = await fetchIGData(url);
            if (!data || !data.data || !data.data.media || data.data.media.length === 0) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Gagal mengunduh media!\n' +
                          '⚠️ Mungkin URL invalid, postingan privat, atau API bermasalah.\n' +
                          '✅ Coba URL lain atau pastikan postingan publik.'
                });
            }

            const { media, postInfo: { caption, likesCount, commentsCount }, comments, metadata: { originalUrl } } = data.data;

            // Ambil 2 komentar teratas (kalau ada)
            const topComments = comments.slice(0, 2).map(comment => 
                `💬 ${comment.username}: ${comment.text}`
            ).join('\n') || '💬 Tidak ada komentar';

            // Format caption umum
            const baseCaption = `📸 *Media Instagram Ditemukan!*\n\n` +
                               `📝 *Caption:* ${caption || 'Tidak ada keterangan'}\n` +
                               `❤️ *Likes:* ${likesCount || '0'}\n` +
                               `💬 *Komentar:* ${commentsCount || '0'}\n` +
                               `📌 *Top Komentar:*\n${topComments}\n` +
                               `🔗 *Sumber:* ${originalUrl}\n` +
                               `⚠️ Gunakan untuk keperluan pribadi, jangan distribusikan!`;

            // Proses setiap media
            for (const item of media) {
                const { type, downloadUrl } = item;
                console.log(`Memproses media ${type}:`, downloadUrl);

                const response = await Axios.get(downloadUrl, { responseType: 'arraybuffer' });
                const filePath = `./temp_${Date.now()}_${type === 'image' ? 'jpg' : 'mp4'}`;
                fs.writeFileSync(filePath, response.data);

                if (type === 'image') {
                    await sock.sendMessage(msg.key.remoteJid, {
                        image: fs.readFileSync(filePath),
                        caption: baseCaption,
                        mimetype: 'image/jpeg'
                    }, { quoted: msg });
                } else if (type === 'video') {
                    await sock.sendMessage(msg.key.remoteJid, {
                        video: fs.readFileSync(filePath),
                        caption: baseCaption,
                        mimetype: 'video/mp4'
                    }, { quoted: msg });
                }

                fs.unlinkSync(filePath);
            }

            console.log('Media berhasil dikirim');
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error('Error processing igdl command:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal mengunduh media: ' + (error.message || 'Error tidak diketahui')
            });
        }
    }
};

// Fungsi untuk fetch data Instagram dari API Itzpire
async function fetchIGData(url, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const apiUrl = `https://itzpire.com/download/instagram?url=${encodeURIComponent(url)}`;
            console.log(`Mencoba fetch data (attempt ${attempt + 1}):`, apiUrl);
            const response = await Axios.get(apiUrl);
            const data = response.data;

            // Log respons API untuk debugging
            console.log('Respons API:', JSON.stringify(data, null, 2));

            // Validasi respons
            if (data && data.status === 'success' && data.data && data.data.media && data.data.media.length > 0) {
                return data;
            }
            console.log('Data tidak valid, mencoba ulang:', data);
        } catch (error) {
            console.error(`Gagal fetch (attempt ${attempt + 1}):`, error.message);
            if (error.response) {
                console.error('Status:', error.response.status, 'Data:', error.response.data);
            }
        }
    }
    throw new Error('Gagal fetch data Instagram setelah beberapa percobaan.');
}
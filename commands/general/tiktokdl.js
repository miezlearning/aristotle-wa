const Axios = require('axios');
const fs = require('fs');

module.exports = {
    name: 'tiktok',
    alias: ['tt', 'tikdl'],
    category: 'media',
    description: 'Download video TikTok tanpa watermark dari URL',
    usage: '!tiktok <URL TikTok>',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah tiktok dipanggil:', JSON.stringify(msg, null, 2));

        try {
            // Cek apakah ada URL
            let url = args.join(' ').trim();
            if (!url || !url.includes('tiktok.com')) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Masukkan URL TikTok yang valid!\n\n' +
                          '⚠️ *Format:* !tiktok <URL>\n' +
                          '✅ Contoh: !tiktok https://www.tiktok.com/@gerrywijayaaaa/video/7476995705240816902'
                });
            }

            // Reaksi loading
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            console.log('Mengunduh data TikTok dari:', url);

            // Panggil fungsi fetch data
            const data = await fetchTikTokData(url);
            if (!data || !data.tiktok || !data.tiktok.video) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Gagal mengunduh video!\n' +
                          '⚠️ Mungkin URL invalid, video privat, atau API bermasalah.\n' +
                          '✅ Coba URL lain atau pastikan video publik.'
                });
            }

            const { video: tikVideoUrl, description: tikDescription, author: { nickname: tikAuthor }, statistics: { likeCount: tikLikes, commentCount: tikComments, shareCount: tikShares } } = data.tiktok;

            // Format caption
            const caption = `🎥 *TikTok Video*\n\n` +
                            `📌 *Deskripsi:* ${tikDescription || 'Tidak ada deskripsi'}\n` +
                            `👤 *Author:* ${tikAuthor || 'Penulis Tidak Diketahui'}\n` +
                            `❤️ *Likes:* ${tikLikes || '0'}\n` +
                            `💬 *Komentar:* ${tikComments || '0'}\n` +
                            `🔗 *Share:* ${tikShares || '0'}`;

            console.log('Data TikTok ditemukan:', tikVideoUrl);

            // Download video
            const response = await Axios.get(tikVideoUrl, { responseType: 'arraybuffer' });
            const filePath = `./temp_${Date.now()}.mp4`;
            fs.writeFileSync(filePath, response.data);

            // Kirim video
            await sock.sendMessage(msg.key.remoteJid, {
                video: fs.readFileSync(filePath),
                caption: caption,
                mimetype: 'video/mp4'
            }, { quoted: msg });
            
            // Hapus file temporary
            fs.unlinkSync(filePath);

            console.log('Video berhasil dikirim');
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error('Error processing tiktok command:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal mengunduh video: ' + (error.message || 'Error tidak diketahui')
            });
        }
    }
};

// Fungsi untuk fetch data TikTok dari API Dreaded
async function fetchTikTokData(url, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const apiUrl = `https://api.dreaded.site/api/tiktok?url=${encodeURIComponent(url)}`;
            console.log(`Mencoba fetch data (attempt ${attempt + 1}):`, apiUrl);
            const response = await Axios.get(apiUrl);
            const data = response.data;

            if (data && data.status === 200 && data.tiktok && data.tiktok.video && data.tiktok.description && data.tiktok.author.nickname && data.tiktok.statistics.likeCount) {
                return data;
            }
            console.log('Data tidak valid, mencoba ulang:', data);
        } catch (error) {
            console.error(`Gagal fetch (attempt ${attempt + 1}):`, error.message);
        }
    }
    throw new Error('Gagal fetch data TikTok setelah beberapa percobaan.');
}
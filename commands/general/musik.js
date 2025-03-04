const yts = require('yt-search');
const Axios = require('axios');

module.exports = {
    name: 'musik',
    alias: ['music', 'mp3'],
    category: 'utility',
    description: 'Mencari dan mengunduh audio dari YouTube berdasarkan judul atau URL',
    usage: '!musik <judul lagu atau URL YouTube>',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah musik dipanggil:', JSON.stringify(msg, null, 2));
        try {
            // Cek apakah ada argumen
            if (!args.length) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Kirim judul lagu atau URL YouTube dengan perintah !musik\nContoh: !musik Happy Asmara Full Album'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            const query = args.join(' ').trim();
            let videoUrl = query;

            // Jika bukan URL YouTube, cari di yt-search
            if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
                console.log('Mencari lagu:', query);
                await sock.sendMessage(msg.key.remoteJid, { text: '🔍 Mencari lagu...' });
                const searchResults = await yts(query);
                if (!searchResults.videos.length) {
                    return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Tidak ada hasil untuk pencarian Anda.' });
                }
                videoUrl = searchResults.videos[0].url;
                console.log('URL ditemukan:', videoUrl);
            }

            // Panggil API untuk mendapatkan URL unduhan audio
            console.log('Mengambil audio dari API...');
            const apiUrl = `https://apis.davidcyriltech.my.id/youtube/mp3?url=${videoUrl}`;
            const response = await Axios.get(apiUrl);

            if (!response.data || !response.data.success || !response.data.result.downloadUrl) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Gagal mengambil audio. Coba lagi nanti.'
                });
            }

            const downloadUrl = response.data.result.downloadUrl;
            console.log('URL unduhan:', downloadUrl);

            // Kirim audio ke pengguna
            console.log('Mengirim audio...');
            await sock.sendMessage(msg.key.remoteJid, {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: msg });

            console.log('Audio terkirim');
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error('Error processing musik command:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal memproses perintah: ' + error.message
            });
        }
    }
};
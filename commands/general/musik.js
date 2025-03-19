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
        
        if (!args.length) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '🎵 Masukkan judul lagu atau URL YouTube setelah !musik\nContoh: !musik Wave to Earth Homesick'
            });
        }

        const processingMsg = await sock.sendMessage(msg.key.remoteJid, {
            text: `🔎 Sedang cari lagu yang kamu cari... \`${args.join(' ').trim()}\``,
            react: { text: "⏳", key: msg.key }
        });

        try {
            const query = args.join(' ').trim();
            let youtubeUrl = query;

            // Cari video jika bukan URL
            if (!query.match(/youtube\.com|youtu\.be/)) {
                console.log('Mencari lagu:', query);
                const results = await yts(query);
                if (!results.videos.length) {
                    throw new Error('Tidak ada video yang ditemukan');
                }
                youtubeUrl = results.videos[0].url;
            }

            const videoInfo = (await yts(youtubeUrl)).videos[0];
            if (!videoInfo) throw new Error('Informasi video tidak tersedia');

            // Daftar API yang akan dicoba
            const apiList = [
                `https://apis.davidcyriltech.my.id/youtube/mp3?url=${youtubeUrl}`,
                `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${youtubeUrl}`,
                `https://api.akuari.my.id/downloader/youtubeaudio?link=${youtubeUrl}`
            ];

            let apiResponse;
            for (const api of apiList) {
                try {
                    console.log(`Mencoba API: ${api}`);
                    apiResponse = await Axios.get(api);
                    const data = apiResponse.data;
                    if (data.status === 200 || data.success) {
                        console.log('API berhasil:', api);
                        break;
                    }
                } catch (err) {
                    console.error(`API gagal: ${api} - ${err.message}`);
                    continue;
                }
            }

            if (!apiResponse || !apiResponse.data) {
                throw new Error('Semua server gagal merespons');
            }

            const responseData = apiResponse.data.result || apiResponse.data;
            const audioLink = responseData.downloadUrl || responseData.url;
            if (!audioLink) throw new Error('URL audio tidak ditemukan');

            const songDetails = {
                title: responseData.title || videoInfo.title,
                artist: responseData.author || videoInfo.author.name,
                thumbnail: responseData.image || videoInfo.thumbnail
            };

            // Caption yang lebih jelas
            const captionText = `
🎸 *ada nih lagunya...*
──────────────────
🎶 *Judul*: ${songDetails.title}
🎤 *Artis*: ${songDetails.artist}
⏱ *Durasi*: ${videoInfo.timestamp}
👀 *Views*: ${videoInfo.views.toLocaleString()}
🌐 *Link*: ${youtubeUrl}
──────────────────
            `.trim();

            // Kirim audio dengan caption dan thumbnail
            await sock.sendMessage(msg.key.remoteJid, {
                audio: { url: audioLink },
                mimetype: 'audio/mpeg',
                ptt: false,
                caption: captionText,
                contextInfo: {
                    externalAdReply: {
                        title: songDetails.title,
                        body: songDetails.artist,
                        thumbnailUrl: songDetails.thumbnail,
                        sourceUrl: youtubeUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });

            // Ganti reaksi menjadi sukses
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: processingMsg.key }
            });

        } catch (error) {
            console.error('Error dalam perintah musik:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🚨 Gagal memproses lagu: ${error.message}`,
                react: { text: "⚠️", key: processingMsg.key }
            });
        }
    }
};
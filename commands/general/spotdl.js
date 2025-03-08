const Axios = require('axios');
const fs = require('fs');

module.exports = {
    name: 'spotifydl',
    alias: ['spotdl', 'spotify'],
    category: 'media',
    description: 'Download lagu dari Spotify menggunakan URL',
    usage: '!spotifydl <URL Spotify>',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah spotifydl dipanggil:', JSON.stringify(msg, null, 2));

        try {
            // Cek apakah ada URL
            let url = args.join(' ').trim();
            if (!url || !url.includes('spotify.com')) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Masukkan URL Spotify yang valid!\n\n' +
                          '⚠️ *Format:* !spotifydl <URL>\n' +
                          '✅ Contoh: !spotifydl https://open.spotify.com/track/5mtTAScDytxZj14NmlN'
                });
            }

            // Reaksi loading
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            console.log('Mengunduh data Spotify dari:', url);

            // Panggil fungsi fetch data
            const data = await fetchSpotifyData(url);
            if (!data || !data.data || !data.data.audio) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Gagal mengunduh lagu!\n' +
                          '⚠️ Mungkin URL invalid, lagu tidak tersedia, atau API bermasalah.\n' +
                          '✅ Coba URL lain atau pastikan lagu tersedia.'
                });
            }

            const { audio: songUrl, details: { name: title, artist, album, releaseDate, cover_url: coverUrl } } = data.data;

            // Format caption
            const caption = `🎵 *Lagu Spotify Ditemukan!*\n\n` +
                            `🎤 *Judul:* ${title || 'Unknown Title'}\n` +
                            `👤 *Artis:* ${artist || 'Unknown Artist'}\n` +
                            `💿 *Album:* ${album || 'Unknown Album'}\n` +
                            `📅 *Rilis:* ${releaseDate || 'Unknown Date'}\n` +
                            `⚠️ Gunakan untuk keperluan pribadi, jangan distribusikan!`;

            console.log('Lagu ditemukan:', songUrl);

            // Download lagu
            const songResponse = await Axios.get(songUrl, { responseType: 'arraybuffer' });
            const filePath = `./temp_${Date.now()}.mp3`;
            fs.writeFileSync(filePath, songResponse.data);

            // Kirim lagu dengan cover art (opsional)
            await sock.sendMessage(msg.key.remoteJid, {
                audio: fs.readFileSync(filePath),
                mimetype: 'audio/mp4', // WhatsApp support audio/mp4 untuk MP3
                ptt: false,
                fileName: `${title} - ${artist}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: `${title} - ${artist}`,
                        body: `Album: ${album}`,
                        thumbnailUrl: coverUrl || 'https://via.placeholder.com/150?text=Cover+Art',
                        mediaType: 2,
                        mediaUrl: url,
                        sourceUrl: url
                    }
                }
            }, { quoted: msg });

            // Kirim pesan terpisah dengan caption
            await sock.sendMessage(msg.key.remoteJid, {
                text: caption
            });

            // Hapus file temporary
            fs.unlinkSync(filePath);

            console.log('Lagu berhasil dikirim');
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error('Error processing spotifydl command:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal mengunduh lagu: ' + (error.message || 'Error tidak diketahui')
            });
        }
    }
};

// Fungsi untuk fetch data Spotify dari API Itzpire (Diperbarui)
async function fetchSpotifyData(url, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const apiUrl = `https://itzpire.com/download/spotify?url=${encodeURIComponent(url)}`;
            console.log(`Mencoba fetch data (attempt ${attempt + 1}):`, apiUrl);
            const response = await Axios.get(apiUrl);
            const data = response.data;

            // Log respons API untuk debugging
            console.log('Respons API:', JSON.stringify(data, null, 2));

            // Validasi respons
            if (data && data.status === 'success' && data.data && data.data.audio) {
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
    throw new Error('Gagal fetch data Spotify setelah beberapa percobaan.');
}
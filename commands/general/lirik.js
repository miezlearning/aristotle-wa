const Axios = require('axios');

module.exports = {
    name: 'lirik',
    alias: ['lyrics', 'letra'],
    category: 'media',
    description: 'Mencari lirik lagu berdasarkan judul dan/atau penyanyi menggunakan API lewdhutao Musixmatch',
    usage: '!lirik <judul lagu> atau !lirik <penyanyi - judul>',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah lirik dipanggil:', JSON.stringify(msg, null, 2));
        
        try {
            // Cek apakah ada argumen atau quoted text
            let text = args.join(' ').trim();
            if (!text && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation) {
                text = msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation;
            }

            if (!text) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Kirim judul lagu atau penyanyi dengan perintah !lirik\n\n' +
                          '⚠️ *Format yang disarankan:* Penyanyi - Judul\n' +
                          '✅ Contoh: *Wave to Earth - Homesick*'
                });
            }

            // Beri reaksi loading
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            console.log('Mencari lirik untuk:', text);

            // Normalisasi input agar format lebih bersih
            text = text.replace(/\s*-\s*/g, ' - ').trim(); // Pastikan format "artis - judul"

            let artist = '';
            let title = text;
            if (text.includes('-')) {
                [artist, title] = text.split('-').map(part => part.trim());
            }

            // Panggil fungsi pencarian lirik
            const lyricsData = await fetchLyrics(title, artist);
            if (!lyricsData) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Tidak menemukan lirik untuk lagu tersebut.\n\n' +
                          '⚠️ Pastikan format input benar: Penyanyi - Judul atau Judul - Penyanyi.\n' +
                          '✅ Coba: *Wave to Earth - Homesick* atau *Homesick - Wave to Earth*'
                });
            }

            const { track_name, artist_name, lyrics, artwork_url } = lyricsData;
            console.log('Lirik ditemukan:', track_name);

            // Format pesan lirik
            const caption = `🎵 *${track_name}*\n` +
                            `*${artist_name}*\n\n` +
                            `${lyrics}`;

            // Kirim dengan artwork
            await sock.sendMessage(msg.key.remoteJid, {
                image: { url: artwork_url || 'https://via.placeholder.com/150?text=Lyrics' },
                caption: caption
            }, { quoted: msg });

            console.log('Lirik berhasil dikirim');
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error('Error processing lirik command:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal memproses perintah: ' + (error.response?.data?.message || error.message)
            });
        }
    }
};

// Fungsi untuk mencoba pencarian dua kali dengan urutan berbeda
async function fetchLyrics(title, artist) {
    let apiUrl1 = `https://lyrics.lewdhutao.my.eu.org/musixmatch/lyrics-search?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;
    let apiUrl2 = `https://lyrics.lewdhutao.my.eu.org/musixmatch/lyrics-search?title=${encodeURIComponent(artist)}&artist=${encodeURIComponent(title)}`;
    
    try {
        let response = await Axios.get(apiUrl1);
        if (response.data && response.data.lyrics) {
            return response.data;
        }

        console.log('Pencarian pertama gagal, mencoba format terbalik...');
        
        // Jika pencarian pertama gagal, coba dengan format terbalik
        response = await Axios.get(apiUrl2);
        if (response.data && response.data.lyrics) {
            return response.data;
        }
    } catch (error) {
        console.error('Error fetching lyrics:', error);
    }

    return null;
}

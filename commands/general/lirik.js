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
                    text: 'Kirim judul lagu atau penyanyi dengan perintah !lirik\nContoh: !lirik Wave to Earth - Homesick'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            console.log('Mencari lirik untuk:', text);

            // Pisahkan penyanyi dan judul jika ada tanda '-'
            let artist = '';
            let title = text;
            if (text.includes('-')) {
                [artist, title] = text.split('-').map(part => part.trim());
            }

            // Panggil API lewdhutao Musixmatch
            const apiUrl = `https://lyrics.lewdhutao.my.eu.org/musixmatch/lyrics-search?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;
            const response = await Axios.get(apiUrl);

            // Debugging: Log respons API
            console.log('Response:', response.data);

            // Cek apakah respons valid
            if (!response.data || !response.data.lyrics) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Tidak menemukan lirik untuk lagu tersebut.'
                });
            }

            const { track_name, artist_name, lyrics, artwork_url } = response.data;

            console.log('Lirik ditemukan:', track_name);
            const caption = `🎵 *${track_name}*\n` +
                           `*${artist_name}*\n\n` +
                           `${lyrics}`;

            // Kirim dengan artwork dari API
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
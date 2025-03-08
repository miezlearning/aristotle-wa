const Axios = require('axios');

module.exports = {
    name: 'film',
    alias: ['movie', 'tvshow'],
    category: 'media',
    description: 'Menjelajahi dunia film atau TV show dengan sentuhan magis via API OMDB',
    usage: '!film <judul film>',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah film dipanggil:', JSON.stringify(msg, null, 2));

        try {
            // Cek apakah ada argumen atau quoted text
            let text = args.join(' ').trim();
            if (!text && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation) {
                text = msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation;
            }

            if (!text) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '✨ *Portal Film Terbuka!* ✨\n' +
                          'Masukkan judul film untuk memulai petualangan!\n\n' +
                          '⚠️ *Format:* Judul Film\n' +
                          '✅ *Contoh:* *The Matrix* atau *Inception*'
                });
            }

            // Reaksi loading dengan simbol misterius
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "🔮", key: msg.key }
            });

            console.log('Mencari film di dimensi lain:', text);

            // Panggil fungsi pencarian film
            const filmData = await fetchFilm(text);
            if (!filmData) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '🌫️ *Kabut Misteri Menyelimuti...* 🌫️\n' +
                          '❌ Film ini tak ditemukan di arsip kosmik!\n\n' +
                          '⚠️ Pastikan judul benar.\n' +
                          '✅ Coba: *The Matrix* atau *Inception*\n' +
                          'ℹ️ Jika terlalu baru, mungkin belum tercatat di OMDB.'
                });
            }

            const {
                Title, Year, Rated, Released, Runtime, Genre, Director, Writer, Actors, Plot,
                Language, Country, Awards, BoxOffice, Production, imdbRating, imdbVotes, Poster
            } = filmData;

            console.log('Film ditemukan dari alam gaib:', Title);

            // Format pesan dengan simbol keren dan layout kreatif
            let caption = '🌌═════✨ *INFORMASI FILM* ✨═════🌌\n' +
                          '🎬 *Judul:* ' + Title + ' 🎥\n' +
                          '📅 *Tahun:* ' + Year + ' 🕒\n' +
                          '⭐ *Rating:* ' + Rated + ' 🌟\n' +
                          '🗓️ *Rilis:* ' + Released + ' 📅\n' +
                          '⏳ *Durasi:* ' + Runtime + ' ⌛\n' +
                          '🎭 *Genre:* ' + Genre + ' 🎭\n' +
                          '🎞️ *Sutradara:* ' + Director + ' 🎬\n' +
                          '✍️ *Penulis:* ' + Writer + ' 📝\n' +
                          '👥 *Aktor:* ' + Actors + ' 🎭\n' +
                          '📜 *Plot:* ' + Plot + ' ✨\n' +
                          '🌐 *Bahasa:* ' + Language + ' 🗣️\n' +
                          '🌍 *Negara:* ' + Country + ' 🌏\n' +
                          '🏆 *Penghargaan:* ' + Awards + ' 🏅\n' +
                          '💰 *Box Office:* ' + BoxOffice + ' 💸\n' +
                          '🏢 *Produksi:* ' + Production + ' 🎦\n' +
                          '🌠 *IMDB Rating:* ' + imdbRating + ' ⭐\n' +
                          '🗳️ *IMDB Votes:* ' + imdbVotes + ' 📊\n' +
                          '═════🌠 🌠═════';

            // Kirim dengan poster dan efek magis
            await sock.sendMessage(msg.key.remoteJid, {
                image: { url: Poster || 'https://via.placeholder.com/150?text=Poster+Gaib' },
                caption: caption
            }, { quoted: msg });

            console.log('Info film dikirim dari dimensi lain');
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "🌟", key: msg.key }
            });

        } catch (error) {
            console.error('Error membuka portal film:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "💀", key: msg.key }
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ *Portal Gagal Dibuka!* ' + (error.response?.data?.message || error.message) + '\n' +
                      'Coba lagi dengan judul lain...'
            });
        }
    }
};

// Fungsi untuk mencari info film dari OMDB API
async function fetchFilm(title) {
    const apiKey = 'f5be14d8'; // API key dari OMDB
    const apiUrl = `http://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(title)}&plot=full`;

    console.log('Mencari film di arsip kosmik:', apiUrl);

    try {
        const response = await Axios.get(apiUrl);
        console.log('Respons dari dimensi OMDB:', response.data);

        if (response.data && response.data.Response === 'True') {
            return response.data;
        } else {
            console.log('Film hilang di arsip:', response.data.Error);
            return null;
        }
    } catch (error) {
        console.log('Portal OMDB terganggu:', error.message);
        if (error.response) {
            console.log('Detail gangguan:', error.response.data);
        }
        return null;
    }
}
const axios = require('axios');

module.exports = {
    name: 'jkt',
    alias: ['jkt48', 'beritajkt'],
    category: 'news',
    description: 'Menampilkan berita terbaru JKT48 dari api.siputzx.my.id',
    usage: '!jkt',
    permission: 'everyone',
    async execute(sock, msg, args) {
        try {
            // Kirim reaksi "⏳" (sedang memproses)
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

            // Mengambil data dari API
            console.log('Mengambil berita JKT48 dari API...');
            const response = await axios.get('https://api.siputzx.my.id/api/berita/jkt48');
            const data = response.data;

            // Cek status API
            if (!data.status || !data.data || data.data.length === 0) {
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: 'Maaf, tidak ada berita JKT48 yang tersedia saat ini. Coba lagi nanti!' 
                });
                // Ganti reaksi menjadi "⚠️" jika data kosong
                await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
                return;
            }

            // Ambil 3 berita teratas
            const beritaList = data.data.slice(0, 3);

            // Format pesan
            let pesan = `*Berita Terbaru JKT48* 🎤\n\n`;
            beritaList.forEach((berita, index) => {
                pesan += `${index + 1}. *${berita.title}*\n`;
                pesan += `📅 Tanggal: ${berita.date}\n`;
                pesan += `🔗 Link: ${berita.link}\n`;
                pesan += `📌 Icon: ${berita.icon}\n\n`;
            });
            pesan += `Selamat menikmati berita terbaru dari JKT48!`;

            // Kirim pesan ke pengguna
            await sock.sendMessage(msg.key.remoteJid, { text: pesan });

            // Ganti reaksi menjadi "✅" (sukses)
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });
            console.log('Berita JKT48 berhasil dikirim ke', msg.key.remoteJid);

        } catch (error) {
            console.error('Error di jkt:', error.message);
            // Kirim pesan error dan reaksi "⚠️" (gagal)
            await sock.sendMessage(msg.key.remoteJid, { 
                text: 'Terjadi kesalahan saat mengambil berita JKT48. Mungkin API sedang bermasalah!' 
            });
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
        }
    }
};
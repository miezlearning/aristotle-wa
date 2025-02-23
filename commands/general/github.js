const fetch = require('node-fetch'); // Pastikan sudah diinstall: npm install node-fetch@2

module.exports = {
    name: 'github',
    category: 'utility',
    description: 'Mendapatkan informasi akun GitHub berdasarkan username.',
    usage: '!github <username>',
    permission: 'member',
    async execute(sock, msg, args) {
        console.log('Memulai perintah github...');

        if (args.length === 0) {
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Masukkan username GitHub!' }, { quoted: msg });
                console.log('Pesan kesalahan: Username kosong.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan (username kosong):', error);
            }
            return;
        }

        const username = args[0];

        try {
            const response = await fetch(`https://api.github.com/users/${username}`, {
                headers: {
                    'User-Agent': 'WhatsApp-Bot'
                }
            });

            if (!response.ok) {
                let errorMessage = `❌ Gagal mendapatkan informasi GitHub untuk ${username}.`;
                if (response.status === 404) {
                    errorMessage = `❌ Pengguna GitHub dengan username *"${username}"* tidak ditemukan.`;
                } else if (response.status === 403) {
                    errorMessage = '❌ Batas permintaan API GitHub tercapai. Coba lagi nanti.';
                }
                try {
                    await sock.sendMessage(msg.key.remoteJid, { text: errorMessage }, { quoted: msg });
                    console.log("Pesan error GitHub terkirim");
                } catch (sendErr) {
                    console.error("Gagal kirim pesan error GitHub:", sendErr);
                }
                return;
            }

            const data = await response.json();

            // Format informasi akun secara estetik
            let userInfo = `┏━━━━━━━━━━━━━━━┓\n`;
            userInfo += `┃     👤 *GitHub Profile*     ┃\n`;
            userInfo += `┗━━━━━━━━━━━━━━━┛\n\n`;

            userInfo += `📛 *Username:* \`${data.login}\`\n`;
            if (data.name) userInfo += `👤 *Nama:* ${data.name}\n`;
            if (data.bio) userInfo += `📜 *Bio:* ${data.bio}\n`;
            if (data.company) userInfo += `🏢 *Instansi:* ${data.company}\n`;
            if (data.location) userInfo += `📍 *Lokasi:* ${data.location}\n`;
            if (data.blog) userInfo += `🔗 *Website:* ${data.blog}\n`;
            if (data.email) userInfo += `📧 *Email:* ${data.email}\n`;
            userInfo +=`━━━━━━━━━━━━━━━━━━`
            userInfo += `\n📊 *Statistik Akun*\n`;
            userInfo += `├ 🧑‍🤝‍🧑 *Followers:* ${data.followers}\n`;
            userInfo += `├ 👥 *Following:* ${data.following}\n`;
            userInfo += `├ 📦 *Repositori Publik:* ${data.public_repos}\n`;
            userInfo += `└ 📝 *Gists Publik:* ${data.public_gists}\n`;

            userInfo += `\n📅 *Bergabung Sejak:* ${new Date(data.created_at).toLocaleDateString()}\n`;
            userInfo += `🔗 *Profil GitHub:* ${data.html_url}\n`;

            // Mengirim gambar profil dan teks
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    image: { url: data.avatar_url },
                    caption: userInfo
                }, { quoted: msg });
                console.log("Pesan GitHub profile berhasil terkirim");
            } catch (sendErr) {
                // Jika gagal kirim gambar, coba kirim teks saja
                console.error("Gagal kirim gambar, mencoba kirim teks...", sendErr);
                try {
                    await sock.sendMessage(msg.key.remoteJid, { text: userInfo }, { quoted: msg });
                    console.log("Pesan GitHub (text only) berhasil terkirim");
                } catch (err2) {
                    console.error("Gagal kirim pesan GitHub (text only):", err2);
                }
            }
        } catch (error) {
            console.error('Gagal mendapatkan informasi GitHub:', error);
            let errorMessage = '❌ Terjadi kesalahan saat menghubungi API GitHub.';

            try {
                await sock.sendMessage(msg.key.remoteJid, { text: errorMessage }, { quoted: msg });
            } catch (err) {
                console.error("Gagal kirim pesan error catch terluar:", err);
            }
        }
    }
};

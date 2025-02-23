const config = require('../../config.json');

module.exports = {
    name: 'linkgrup',
    alias: ['link', 'grouplink', 'invitelink'],
    category: 'moderasi', // Atau kategori lain yang sesuai
    description: 'Mendapatkan link undangan grup.',
    usage: '!linkgrup',
    permission: 'member', // Bisa diubah jadi 'admin' jika hanya admin yang boleh
    async execute(sock, msg, args) {
        console.log('Memulai perintah linkgrup...');

        // Cek apakah pesan berasal dari grup
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Perintah ini hanya bisa digunakan di dalam grup!' }, { quoted: msg });
                console.log('Pesan kesalahan: Perintah hanya untuk grup.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan (bukan grup):', error);
            }
            return;
        }


        // Cek izin (opsional, jika ingin membatasi hanya untuk admin)
        const isAdmin = msg.key.participant === config.adminNumber + '@s.whatsapp.net'; //Ganti jika diperlukan
        if (config.linkRequiresAdmin && !isAdmin) {  //Tambahkan config.linkRequiresAdmin di config.json (true/false)
              try {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Hanya admin yang bisa mendapatkan link grup!' }, { quoted: msg });
                console.log('Pesan kesalahan: Hanya admin yang bisa mendapatkan link.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan (bukan admin):', error);
            }
            return;
        }

        try {
            // Dapatkan kode invite grup
            const inviteCode = await sock.groupInviteCode(msg.key.remoteJid);

            // Buat link undangan
            const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

            // Kirim link ke pengirim
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Link undangan grup: ${inviteLink}` }, { quoted: msg });
            console.log(`Link undangan berhasil dikirim: ${inviteLink}`);

        } catch (error) {
            console.error('Gagal mendapatkan link undangan:', error);
            let errorMessage = '❌ Gagal mendapatkan link undangan grup. Pastikan bot adalah admin.'; //Pesan default
            if (error.message.includes("not-authorized")) {
                errorMessage = '❌ Gagal mendapatkan link undangan. Bot mungkin bukan admin, atau izin untuk mengelola grup telah dicabut.';
            }
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: errorMessage }, { quoted: msg });
                console.log('Pesan kesalahan (gagal mendapatkan link) terkirim.');
            } catch (sendError) {
                 console.error('Gagal mengirim pesan error:', sendError);
            }
        }
    }
};
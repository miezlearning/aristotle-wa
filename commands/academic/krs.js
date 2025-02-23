const moment = require('moment-timezone');
moment.locale('id');

module.exports = {
    name: 'batalkrs',
    category: 'academic',
    description: 'Mengirim notifikasi pembatalan KRS mahasiswa',
    usage: '!batalkrs <nim>, <nama>, <alasan>',
    permission: 'admin',
    async execute(sock, msg, args) {
        const fullArgs = args.join(' ');

        // Pisahkan argumen berdasarkan koma
        const parsedArgs = fullArgs.split(',').map(arg => arg.trim());

        // Jika format tidak sesuai
        if (parsedArgs.length < 3) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: 'Format salah! Gunakan: !batalkrs <nim>, <nama>, <alasan>\n\n Contoh: \n!batalkrs 2209106127, Muhammad Alif, Ingin menambah mata kuliah.'
            });
        }

        const nim = parsedArgs[0];
        const nama = parsedArgs[1];
        const alasan = parsedArgs.slice(2).join(', '); // Gabungkan kembali alasan jika ada koma di dalamnya
        const timestamp = moment().tz('Asia/Makassar').format('DD MMMM YYYY HH:mm:ss');

        // Ambil daftar admin grup
        let adminMentions = '';
        let mentions = [];
        try {
            const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
            const admins = groupMetadata.participants.filter(p => p.admin);
            
            if (admins.length > 0) {
                mentions = admins.map(admin => admin.id);
                adminMentions = admins.map(admin => `@${admin.id.split('@')[0]}`).join(' ');
            }
        } catch (error) {
            console.error('Gagal mengambil data admin:', error);
        }

        const notifText = `*NOTIFIKASI PEMBATALAN KRS*\n\n` +
            `📝 Detail Mahasiswa:\n` +
            `NIM: ${nim}\n` +
            `Nama: ${nama}\n\n` +
            `❌ Alasan Pembatalan:\n${alasan}\n\n` +
            `⏰ Waktu: ${timestamp}\n\n` +
            `📌 Tindak Lanjut:\n` +
            `Tunggu konfirmasi dari pihak terkait.\n\n` +
            `🔔 *Mohon perhatian Bapak/Ibu:* ${adminMentions}`;

        try {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: notifText,
                mentions: mentions
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '✅ Notifikasi pembatalan KRS berhasil dikirim!'
            });
        } catch (error) {
            console.error('Error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal mengirim notifikasi pembatalan KRS.'
            });
        }
    }
};

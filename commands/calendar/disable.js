const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

module.exports = {
    name: 'disablecalendar',
    category: 'calendar',
    description: 'Menonaktifkan kalender untuk grup tertentu.',
    async execute(sock, msg, args) {
        console.log('Memulai perintah disablecalendar...'); // Log awal
        if (msg.key.participant !== config.adminNumber + '@s.whatsapp.net') {
            console.log('Bukan admin.');
            return await sock.sendMessage(msg.key.remoteJid, { text: 'Hanya admin yang dapat menggunakan perintah ini.' });
        }

        if (args.length < 2) {
            console.log('Argumen kurang.');
            return await sock.sendMessage(msg.key.remoteJid, { text: 'Penggunaan: !disablecalendar <nama_kalender> <group_id>' });
        }

        // Gabungkan semua argumen sebelum ID grup menjadi nama kalender
        const calendarName = args.slice(0, args.length - 1).join(' ');
        const groupId = args[args.length - 1];

        console.log('Nama kalender:', calendarName);
        console.log('ID grup:', groupId);

        const calendarToDisable = config.calendars.find(calendar => calendar.name === calendarName);

        if (!calendarToDisable) {
            console.log('Kalender tidak ditemukan.');
            return await sock.sendMessage(msg.key.remoteJid, { text: `Kalender dengan nama "${calendarName}" tidak ditemukan.` });
        }

        console.log('Kalender ditemukan:', calendarToDisable);

        // 1. Buat salinan konfigurasi sementara
        const updatedConfig = JSON.parse(JSON.stringify(config)); // Deep copy

        const calendarToUpdate = updatedConfig.calendars.find(calendar => calendar.name === calendarName);

        if (calendarToUpdate) {
            calendarToUpdate.allowedGroups = calendarToUpdate.allowedGroups.filter(group => group !== groupId); // Hapus grup dari daftar

            console.log('Grup dihapus dari daftar allowedGroups. allowedGroups sekarang:', calendarToUpdate.allowedGroups);

            if (calendarToUpdate.allowedGroups.length === 0) {
                calendarToUpdate.enabled = false; // Nonaktifkan jika tidak ada grup yang diizinkan
                console.log('Tidak ada grup yang diizinkan. Menonaktifkan kalender.');
            } else {
                console.log('Masih ada grup yang diizinkan. Kalender tetap aktif.');
            }
        }

        console.log('Mengirim pesan sukses...');
        try {
            // 2. Kirim pesan *sebelum* menulis ke file
            await sock.sendMessage(msg.key.remoteJid, { text: `Kalender "${calendarName}" berhasil dinonaktifkan untuk grup ${groupId}.` });
            console.log('Pesan sukses terkirim.');

            // 3. Tulis ke file *setelah* pesan terkirim dan setelah jeda 1 detik
            setTimeout(() => {
                fs.writeFileSync(path.join(__dirname, '../../config.json'), JSON.stringify(updatedConfig, null, 2));
                console.log('config.json berhasil diperbarui (setelah jeda).');
            }, 1000); // Jeda 1 detik

        } catch (error) {
            console.error('Terjadi kesalahan:', error);
            // Mungkin perlu mengirim pesan kesalahan ke pengguna di sini
        }
    }
};
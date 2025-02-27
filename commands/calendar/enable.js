const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

module.exports = {
    name: 'enablecalendar',
    category: 'calendar',
    alias: 'cl',
    description: 'Mengaktifkan kalender untuk grup tertentu.',
    async execute(sock, msg, args) {
        console.log('Memulai perintah enablecalendar...'); // Log awal
        if (msg.key.participant !== config.adminNumber + '@s.whatsapp.net') {
            console.log('Bukan admin.');
            return await sock.sendMessage(msg.key.remoteJid, { text: 'Hanya admin yang dapat menggunakan perintah ini.' });
        }

        if (args.length < 2) {
            console.log('Argumen kurang.');
            return await sock.sendMessage(msg.key.remoteJid, { text: 'Penggunaan: !enablecalendar <nama_kalender> <group_id>' });
        }

        // Gabungkan semua argumen sebelum ID grup menjadi nama kalender
        const calendarName = args.slice(0, args.length - 1).join(' ');
        const groupId = args[args.length - 1]; // Ambil ID grup dari argumen

        console.log('Nama kalender:', calendarName);
        console.log('ID grup:', groupId);

        const calendarToEnable = config.calendars.find(calendar => calendar.name === calendarName);

        if (!calendarToEnable) {
            console.log('Kalender tidak ditemukan.');
            return await sock.sendMessage(msg.key.remoteJid, { text: `Kalender dengan nama "${calendarName}" tidak ditemukan.` });
        }

        console.log('Kalender ditemukan:', calendarToEnable);

        const updatedConfig = JSON.parse(JSON.stringify(config)); // Deep copy

        const calendarIndex = updatedConfig.calendars.findIndex(calendar => calendar.name === calendarName);

        if (calendarIndex === -1) {
            console.log('Kalender tidak ditemukan dalam konfigurasi yang diperbarui.');
            return await sock.sendMessage(msg.key.remoteJid, { text: `Kalender dengan nama "${calendarName}" tidak ditemukan dalam konfigurasi yang diperbarui.` });
        }

        const calendarToUpdate = updatedConfig.calendars[calendarIndex];

        if (!calendarToUpdate.allowedGroups) {
            calendarToUpdate.allowedGroups = [];
        }

        if (!calendarToUpdate.allowedGroups.includes(groupId)) {
            calendarToUpdate.allowedGroups.push(groupId); // Tambahkan grup ke daftar yang diizinkan
            console.log('Grup ditambahkan ke allowedGroups. allowedGroups sekarang:', calendarToUpdate.allowedGroups);
        }

        calendarToUpdate.enabled = true; // Aktifkan kalender
        console.log('Kalender diaktifkan.');


        console.log('Mengirim pesan sukses...');
        try {
            // 2. Kirim pesan *sebelum* menulis ke file
            await sock.sendMessage(msg.key.remoteJid, { text: `Kalender "${calendarName}" berhasil diaktifkan untuk grup ${groupId}.` });
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
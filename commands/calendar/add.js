const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

module.exports = {
    name: 'addcalendar',
    category: 'calendar',
    description: 'Menambahkan kalender baru ke daftar.',
    async execute(sock, msg, args) {
        if (msg.key.participant !== config.adminNumber + '@s.whatsapp.net') {
            return await sock.sendMessage(msg.key.remoteJid, { text: 'Hanya admin yang dapat menggunakan perintah ini.' });
        }

        if (args.length < 3) {
            return await sock.sendMessage(msg.key.remoteJid, { text: 'Penggunaan: !addcalendar <nama> <url> <menit_sebelum>' });
        }

        const name = args[0];
        const url = args[1];
        const minutesBefore = parseInt(args[2]);

        if (isNaN(minutesBefore)) {
            return await sock.sendMessage(msg.key.remoteJid, { text: 'Menit sebelum harus berupa angka.' });
        }

        const newCalendar = {
            name: name,
            url: url,
            notificationMinutesBefore: minutesBefore,
            enabled: false // Default: nonaktif
        };

        config.calendars.push(newCalendar);

        // Simpan kembali ke config.json
        fs.writeFileSync(path.join(__dirname, '../../config.json'), JSON.stringify(config, null, 2));

        await sock.sendMessage(msg.key.remoteJid, { text: `Kalender "${name}" berhasil ditambahkan. Jangan lupa untuk mengaktifkannya dengan !enablecalendar.` });
    }
};
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

module.exports = {
    name: 'removecalendar',
    category: 'calendar',
    description: 'Menghapus kalender dari daftar berdasarkan nama.',
    async execute(sock, msg, args) {
        if (msg.key.participant !== config.adminNumber + '@s.whatsapp.net') {
            return await sock.sendMessage(msg.key.remoteJid, { text: 'Hanya admin yang dapat menggunakan perintah ini.' });
        }

        if (args.length < 1) {
            return await sock.sendMessage(msg.key.remoteJid, { text: 'Penggunaan: !removecalendar <nama_kalender>' });
        }

        const calendarName = args[0];
        const initialLength = config.calendars.length;
        config.calendars = config.calendars.filter(calendar => calendar.name !== calendarName);

        if (config.calendars.length === initialLength) {
            return await sock.sendMessage(msg.key.remoteJid, { text: `Kalender dengan nama "${calendarName}" tidak ditemukan.` }, {quote : msg});
        }

        // Simpan kembali ke config.json
        fs.writeFileSync(path.join(__dirname, '../../config.json'), JSON.stringify(config, null, 2));

        await sock.sendMessage(msg.key.remoteJid, { text: `Kalender "${calendarName}" berhasil dihapus.` });
    }
};
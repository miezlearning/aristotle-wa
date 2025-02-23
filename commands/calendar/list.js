const config = require('../../config.json');

module.exports = {
    name: 'listcalendars',
    category: 'calendar',
    description: 'Menampilkan daftar kalender yang terdaftar.',
    async execute(sock, msg, args) {
        let message = "Daftar Kalender:\n";
        config.calendars.forEach((calendar, index) => {
            message += `${index + 1}. ${calendar.name} (URL: ${calendar.url}, Notifikasi: ${calendar.notificationMinutesBefore} menit, Aktif: ${calendar.enabled ? 'Ya' : 'Tidak'})\n`;
        });

        await sock.sendMessage(msg.key.remoteJid, { text: message });
    }
};
const ical = require('node-ical');
const moment = require('moment-timezone');
const config = require('../../config.json');

module.exports = {
    name: 'today',
    category: 'calendar',
    description: 'Menampilkan daftar acara hari ini dari kalender yang dikonfigurasi.',
    usage: '!today <nama_kalender>',
    permission: 'admin',
    async execute(sock, msg, args) {
        console.log('Memulai perintah showtoday...');

        // Cek apakah pengirim adalah admin yang diizinkan (hapus jika tidak diperlukan)

        if (args.length < 1) { // Perubahan: Memeriksa apakah ada argumen sama sekali
            console.log('Argumen kurang.');
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Format salah! Gunakan: !today <nama_kalender>'
                });
                console.log('Pesan kesalahan format berhasil dikirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan format:', error);
            }
            return;
        }

        // Gabungkan semua argumen menjadi nama kalender
        const calendarName = args.join(' ');
        console.log(`Nama kalender yang diminta: ${calendarName}`);

        // Case-insensitive calendar lookup
        const calendar = config.calendars.find(cal => {
            return cal.name.toLowerCase() === calendarName.toLowerCase();
        });

        if (!calendar) {
            console.log('Kalender tidak ditemukan.');
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `❌ Kalender dengan nama "${calendarName}" tidak ditemukan.`
                });
                console.log('Pesan kesalahan kalender tidak ditemukan berhasil dikirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan kalender tidak ditemukan:', error);
            }
            return;
        }

        console.log(`URL kalender: ${calendar.url}`);

        try {
            console.log('Mencoba mengambil acara dari kalender...');
            const events = await ical.async.fromURL(calendar.url);
            console.log('Acara berhasil diambil dari kalender.');

            let eventListText = `*📅 Acara Hari Ini dari Kalender "${calendar.name}"*\n\n`;
            let separator = "--------------------------------------------------\n"; // Pemisah
            let eventCount = 0;

            const today = moment().tz(config.timezone).startOf('day');
            const tomorrow = moment(today).add(1, 'day');

            for (const k in events) {
                if (events.hasOwnProperty(k)) {
                    const event = events[k];
                    if (event.type === 'VEVENT') {
                        const eventStart = moment(event.start).tz(config.timezone);

                        // Filter untuk acara yang dimulai atau berlangsung hari ini
                        if (eventStart >= today && eventStart < tomorrow) {
                            eventCount++;
                            const start = eventStart.format('D MMMM YYYY, HH:mm');
                            const end = moment(event.end).tz(config.timezone).format('HH:mm');

                            // Bersihkan deskripsi
                            let description = event.description || 'Tidak ada deskripsi';
                            description = description.replace(/<br\s*[\/]?>/gi, '\n'); // Ganti <br> dengan baris baru
                            description = description.replace(/<[^>]*>?/gm, ''); // Hapus semua tag HTML
                            description = description.replace(/ /gi, ' '); // Ganti   dengan spasi
                            description = description.replace(/&/gi, '&');   // Ganti & dengan &
                            description = description.replace(/</gi, '<');     // Ganti < dengan <
                            description = description.replace(/>/gi, '>');     // Ganti > dengan >

                            eventListText += `*${eventCount}. ${event.summary}*\n`;
                            eventListText += `⏰ ${start} - ${end}\n`;
                            eventListText += `📍 Lokasi: ${event.location || 'Tidak ada lokasi'}\n`;
                            eventListText += `📝 Deskripsi:\n${description}\n`; // Tampilkan deskripsi yang sudah dibersihkan
                            eventListText += separator; // Tambahkan separator
                        }
                    }
                }
            }

            if (eventCount === 0) {
                eventListText = 'Tidak ada acara yang ditemukan hari ini di kalender ini.';
            }

            try {
                console.log('Mengirim daftar acara hari ini...');
                await sock.sendMessage(msg.key.remoteJid, { text: eventListText },{quote: msg});
                console.log('Daftar acara hari ini berhasil dikirim.');
            } catch (sendMessageError) {
                console.error('Gagal mengirim daftar acara hari ini:', sendMessageError);
            }

        } catch (error) {
            console.error('Error saat mengambil atau memproses acara kalender:', error);
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Gagal mengambil atau memproses acara kalender. Pastikan URL valid dan kalender dapat diakses.'
                });
                console.log('Pesan kesalahan pengambilan acara berhasil dikirim.');
            } catch (sendMessageError) {
                console.error('Gagal mengirim pesan kesalahan pengambilan acara:', sendMessageError);
            }
        }
    }
};
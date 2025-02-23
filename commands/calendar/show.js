const ical = require('node-ical');
const moment = require('moment-timezone');
const config = require('../../config.json');

module.exports = {
    name: 'showcalendar',
    category: 'calendar',
    description: 'Menampilkan daftar acara dari kalender yang dikonfigurasi.',
    usage: '!showcalendar <nama_kalender>',
    permission: 'admin',
    async execute(sock, msg, args) {
        console.log('Memulai perintah showcalendar...');

        // Cek apakah pengirim adalah admin yang diizinkan
        if (msg.key.participant !== config.adminNumber + '@s.whatsapp.net') {
            console.log('Bukan admin yang diizinkan.');
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini!'
                });
                console.log('Pesan kesalahan izin berhasil dikirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan izin:', error);
            }
            return;
        }

        if (args.length < 1) { // Perubahan: Memeriksa apakah ada argumen sama sekali
            console.log('Argumen kurang.');
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Format salah! Gunakan: !showcalendar <nama_kalender>'
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

        // Pencarian kalender HARUS case-insensitive
        const calendar = config.calendars.find(cal => {
            const configNameLower = cal.name.toLowerCase();
            const calendarNameLower = calendarName.toLowerCase();
            return configNameLower === calendarNameLower;
        });

        if (!calendar) {
            console.log('Kalender tidak ditemukan.');
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `❌ Kalender dengan nama "${calendarName}" tidak ditemukan.`
                    
                },{
                    quote: msg
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

            let eventListText = `*📅 Acara Hari Ini dari Kalender "${calendar.name}"*\n\n`; // MODIFIKASI: Acara HARI INI (perubahan dari daftar acara)
            let separator = "--------------------------------------------------\n"; // Pemisah

            let eventCount = 0;
            const today = moment().startOf('day');  // MODIFIKASI: Ambil awal hari ini

            for (const k in events) {
                if (events.hasOwnProperty(k)) {
                    const event = events[k];
                    if (event.type === 'VEVENT') {
                        const eventStart = moment(event.start); // Dapatkan waktu mulai acara
                        if (eventStart.isSame(today, 'day')) {  // MODIFIKASI: Cek apakah acara hari ini
                            eventCount++;
                            const start = moment(event.start).tz(config.timezone).format('D MMMM YYYY, HH:mm');
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
                eventListText = 'Tidak ada acara yang ditemukan di kalender ini untuk hari ini.'; //MODIFIKASI: memperjelas bahwa tidak ada acara hari ini
            }

            try {
                console.log('Mengirim daftar acara...');
                await sock.sendMessage(msg.key.remoteJid, { text: eventListText });
                console.log('Daftar acara berhasil dikirim.');
            } catch (sendMessageError) {
                console.error('Gagal mengirim daftar acara:', sendMessageError);
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
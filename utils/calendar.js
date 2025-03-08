const ical = require('node-ical');
const moment = require('moment-timezone');
const config = require('../config.json');

async function getUpcomingEventsFromCalendar(calendar) {
    try {
        const events = await ical.async.fromURL(calendar.url);
        const now = moment().tz(config.timezone);

        let upcomingEvents = [];

        for (const k in events) {
            if (events.hasOwnProperty(k)) {
                const event = events[k];
                if (event.type === 'VEVENT') {
                    const startDate = moment(event.start).tz(config.timezone);
                    const endDate = moment(event.end).tz(config.timezone);

                    if (startDate.isAfter(now)) {
                        upcomingEvents.push({
                            start: startDate,
                            end: endDate,
                            summary: event.summary,
                            description: event.description,
                            calendarName: calendar.name, // Tambahkan nama kalender
                            notificationMinutesBefore: calendar.notificationMinutesBefore, // Tambahkan waktu notifikasi
                            location: event.location,
                            status: event.status,
                            uid: event.uid,
                            url: event.url,
                        });
                    }
                }
            }
        }

        upcomingEvents.sort((a, b) => a.start.valueOf() - b.start.valueOf());
        return upcomingEvents;

    } catch (err) {
        console.error(`Gagal mengambil atau memproses acara kalender ${calendar.name}:`, err);
        return [];
    }
}

async function getAllUpcomingEvents() {
    let allEvents = [];
    for (const calendar of config.calendars) {
        if (calendar.enabled) {
            console.log(`Memproses kalender: ${calendar.name}`);
            const events = await getUpcomingEventsFromCalendar(calendar);
            console.log(`Jumlah event dari ${calendar.name}:`, events.length);
            allEvents = allEvents.concat(events);
        }
    }
    allEvents.sort((a, b) => a.start.valueOf() - b.start.valueOf());
    console.log("Total upcoming events:", allEvents.length);
    return allEvents;
}

function formatEventMessage(event) {
    const start = event.start.format('D MMMM YYYY, HH:mm');
    const end = event.end.format('HH:mm');

    // Bersihkan deskripsi
    let description = event.description || 'Tidak ada deskripsi';
    description = description.replace(/<br\s*[\/]?>/gi, '\n'); // Ganti <br> dengan baris baru
    description = description.replace(/<[^>]*>?/gm, ''); // Hapus semua tag HTML
    description = description.replace(/ /gi, ' '); // Ganti   dengan spasi
    description = description.replace(/&/gi, '&');   // Ganti & dengan &
    description = description.replace(/</gi, '<');     // Ganti < dengan <
    description = description.replace(/>/gi, '>');     // Ganti > dengan >

    let message = `📅 *${event.summary}* (Kalender: ${event.calendarName})\n` +
        `⏰ ${start} - ${end}\n`;

    if (event.location) {
        message += `📍 Lokasi: ${event.location}\n`;
    }

    if (event.status) {
        message += `Status: ${event.status}\n`;
    }

    if (event.uid) {
        message += `UID: ${event.uid}\n`;
    }

     if (event.url) {
        message += `🔗 URL: ${event.url}\n`;
    }

    message += `📝 Deskripsi:\n${description}\n`;

    return message;
}

module.exports = { getAllUpcomingEvents, formatEventMessage }; // Ubah export
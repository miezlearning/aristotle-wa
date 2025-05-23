const moment = require('moment-timezone');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config.json');
const { reminders, saveReminders, sortReminders, scheduleNextReminder } = require('../../utils/reminderUtils');

module.exports = {
    name: 'reminderall',
    category: 'reminder',
    description: 'Mengatur pengingat yang akan menyebut semua anggota grup secara otomatis.',
    usage: '!reminderall [<waktu_relatif>] [<tanggal>] [<waktu>] <pesan>',
    permission: 'user',
    async execute(sock, msg, args) {
        const groupId = msg.key.remoteJid;

        // Validasi grup
        if (!groupId.endsWith('@g.us')) {
            return await sock.sendMessage(groupId, { text: '❌ Command ini hanya bisa digunakan di grup!' });
        }

        if (args.length < 1) {
            return await sock.sendMessage(groupId, {
                text: '❌ Format salah! Gunakan: !reminderall [<waktu_relatif>] [<tanggal (DD-MM-YYYY)>] [<waktu (HH:mm)>] <pesan>'
            });
        }

        // Ambil metadata grup untuk daftar semua anggota
        const groupMetadata = await sock.groupMetadata(groupId);
        const participants = groupMetadata.participants.map(participant => participant.id);

        let relativeTime = null;
        let date = null;
        let time = null;
        let message = null;
        const unitMap = { m: 'minutes', h: 'hours', d: 'days' };

        // Waktu default: sekarang di zona waktu yang benar
        let reminderTime = moment().tz(config.timezone);
        let startIndex = 0;

        // Fungsi parsing waktu relatif
        const parseRelativeTime = (relativeTime) => {
            const value = parseInt(relativeTime);
            const unit = relativeTime.replace(value.toString(), '');
            return (isNaN(value) || !['m', 'h', 'd'].includes(unit)) ? null : { value, unit };
        };

        // Step 1: Parse waktu relatif (contoh: 10m, 2h)
        if (args.length > 0) {
            const relativeTimeInfo = parseRelativeTime(args[0]);
            if (relativeTimeInfo) {
                reminderTime.add(relativeTimeInfo.value, unitMap[relativeTimeInfo.unit]);
                startIndex++;
            }
        }

        // Step 2: Parse tanggal (contoh: 13-02-2024)
        if (args[startIndex] && moment(args[startIndex], 'DD-MM-YYYY', true).isValid()) {
            const parsedDate = moment.tz(args[startIndex], 'DD-MM-YYYY', config.timezone);
            reminderTime.set({
                year: parsedDate.year(),
                month: parsedDate.month(),
                date: parsedDate.date()
            });
            startIndex++;
        }

        // Step 3: Parse waktu (contoh: 14:30 atau 14.30)
        if (args[startIndex] && /^([01]?[0-9]|2[0-3])[\.\:][0-5][0-9]$/.test(args[startIndex])) {
            const [hours, minutes] = args[startIndex].replace('.', ':').split(':');
            reminderTime.set({
                hour: parseInt(hours),
                minute: parseInt(minutes)
            });
            startIndex++;
        }

        // Validasi akhir
        if (!reminderTime.isValid()) {
            return await sock.sendMessage(groupId, { text: '❌ Format waktu tidak valid.' });
        }

        if (reminderTime.isBefore(moment().tz(config.timezone))) {
            return await sock.sendMessage(groupId, { text: '❌ Waktu pengingat harus di masa depan.' });
        }

        // Ambil pesan
        const messageContent = args.slice(startIndex).join(' ');

        // Konstruksi objek reminder dengan semua anggota grup sebagai mentions
        const reminder = {
            id: uuidv4(),
            groupId,
            timestamp: reminderTime.valueOf(),
            message: messageContent,
            mentions: participants, // Semua anggota grup dimasukkan ke mentions
            creator: msg.key.participant || msg.key.remoteJid
        };

        // Tambahkan ke penyimpanan
        if (!reminders.has(groupId)) {
            reminders.set(groupId, []);
        }

        await sock.sendMessage(groupId, {
            text: `✅ Pengingat untuk semua anggota diatur pada ${reminderTime.format('D MMMM YYYY, HH:mm')}!`,
            mentions: participants // Mention semua saat konfirmasi
        });

        reminders.get(groupId).push(reminder);
        saveReminders();
        sortReminders();
        scheduleNextReminder(sock);
    }
};
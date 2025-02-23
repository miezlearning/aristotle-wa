const moment = require('moment-timezone');
const { reminders } = require('../../utils/reminderUtils'); // Import reminders dari utils
const config = require('../../config.json');

module.exports = {
    name: 'listreminders',
    category: 'reminder',
    description: 'Menampilkan daftar pengingat untuk grup ini.',
    usage: '!listreminders',
    permission: 'user',
    async execute(sock, msg, args) {
        const groupId = msg.key.remoteJid;

        if (!reminders.has(groupId) || reminders.get(groupId).length === 0) {
            return await sock.sendMessage(groupId, { text: 'Tidak ada pengingat yang diatur untuk grup ini.' });
        }

        let messageText = '*Daftar Pengingat*\n\n';
        reminders.get(groupId).forEach((reminder, index) => {
            const reminderTime = moment(reminder.timestamp).tz(config.timezone).format('D MMMM YYYY, HH:mm');
            messageText += `${index + 1}. ${reminderTime}: ${reminder.message}\n`;
        });

        await sock.sendMessage(groupId, { text: messageText });
    }
};
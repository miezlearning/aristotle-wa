const { scheduledMessages } = require('../../utils/scheduledMessageUtils');

module.exports = {
    name: 'scheduledlist',
    description: 'Menampilkan daftar SEMUA pesan terjadwal (global).',
    async execute(sock, msg, args) {
        let message = '🗓️ Daftar SEMUA Pesan Terjadwal (Global):\n\n';
        let totalMessages = 0;

        if (scheduledMessages.size === 0) {
            return await sock.sendMessage(msg.key.remoteJid, { text: 'Tidak ada pesan terjadwal untuk ditampilkan.' });
        }

        let messageCounter = 1;

        for (const [groupId, messageList] of scheduledMessages.entries()) {
            if (messageList.length > 0) {
                message += `Grup ID: ${groupId}\n`; // Tambahkan ID Grup
                for (let i = 0; i < messageList.length; i++) {
                    const schedule = messageList[i];
                    const date = new Date(schedule.timestamp).toLocaleString();
                    message += `  ${messageCounter}. "${schedule.message}" - Dijadwalkan pada: ${date}\n`; // Spasi untuk indentasi
                    messageCounter++;
                    totalMessages++;
                }
                message += "\n"; // Pemisah antar grup
            }
        }

        if (totalMessages === 0) {
            return await sock.sendMessage(msg.key.remoteJid, { text: 'Tidak ada pesan terjadwal untuk ditampilkan.' });
        }

        await sock.sendMessage(msg.key.remoteJid, { text: message });
    }
};
const { reminders, saveReminders } = require('../../utils/reminderUtils'); // Import reminders dan saveReminders
const config = require('../../config.json');

module.exports = {
    name: 'deletereminder',
    category: 'reminder',
    description: 'Menghapus pengingat dari daftar berdasarkan nomor urut.',
    usage: '!deletereminder <nomor_urut>',
    permission: 'user',
    async execute(sock, msg, args) {
        const groupId = msg.key.remoteJid;

        if (!reminders.has(groupId) || reminders.get(groupId).length === 0) {
            return await sock.sendMessage(groupId, { text: 'Tidak ada pengingat yang diatur untuk grup ini.' });
        }

        if (args.length !== 1) {
            return await sock.sendMessage(groupId, {
                text: '❌ Format salah! Gunakan: !deletereminder <nomor_urut>'
            });
        }

        const reminderIndex = parseInt(args[0]) - 1; // Konversi ke indeks berbasis 0

        if (isNaN(reminderIndex) || reminderIndex < 0 || reminderIndex >= reminders.get(groupId).length) {
            return await sock.sendMessage(groupId, { text: '❌ Nomor urut tidak valid.' });
        }

        reminders.get(groupId).splice(reminderIndex, 1);
        if(reminders.get(groupId).length === 0){
            reminders.delete(groupId)
        }

        // Kirim pesan sukses *sebelum* menulis ke file
        await sock.sendMessage(groupId, { text: `✅ Pengingat berhasil dihapus!` });

          // Tulis ke file *setelah* pesan terkirim dan setelah jeda 1 detik
        setTimeout(() => {
             // Simpan pengingat ke file
            saveReminders();
        }, 1000);
    }
};
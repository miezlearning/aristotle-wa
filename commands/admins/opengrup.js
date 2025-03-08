module.exports = {
    name: 'open',
    alias: ['opengroup', 'unlock'],
    category: 'group',
    description: 'Membuka grup agar semua member bisa mengirim pesan',
    usage: '!open',
    permission: 'admin', // Hanya admin yang bisa jalankan
    async execute(sock, msg) {
        console.log('Perintah open dipanggil:', JSON.stringify(msg, null, 2));

        try {
            // Cek apakah pesan dikirim di grup
            if (!msg.key.remoteJid.endsWith('@g.us')) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Perintah ini hanya bisa digunakan di grup!'
                });
            }

            // Cek apakah pengirim adalah admin
            const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
            const senderId = msg.key.participant || msg.key.remoteJid;
            const isAdmin = groupMetadata.participants.some(
                participant => participant.id === senderId && participant.admin
            );

            if (!isAdmin) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Hanya admin yang bisa menggunakan perintah ini!'
                });
            }

            // Reaksi loading
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            // Ubah pengaturan grup: set announce ke false (semua bisa kirim pesan)
            await sock.groupSettingUpdate(msg.key.remoteJid, 'announce', false);

            // Kirim pesan konfirmasi
            await sock.sendMessage(msg.key.remoteJid, {
                text: '✅ Grup berhasil dibuka!\nSekarang semua member bisa mengirim pesan.'
            });

            // Reaksi sukses
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error('Error processing open command:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal membuka grup: ' + (error.message || 'Error tidak diketahui')
            });
        }
    }
};
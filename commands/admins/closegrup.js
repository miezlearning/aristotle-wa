module.exports = {
    name: 'close',
    alias: ['closegroup', 'lock'],
    category: 'group',
    description: 'Menutup grup agar hanya admin yang bisa mengirim pesan',
    usage: '!close',
    permission: 'admin', // Hanya admin yang bisa jalankan
    async execute(sock, msg) {
        console.log('Perintah close dipanggil:', JSON.stringify(msg, null, 2));

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

            // Ubah pengaturan grup: set announce ke true (hanya admin bisa kirim pesan)
            await sock.groupSettingUpdate(msg.key.remoteJid, 'announce', true);

            // Kirim pesan konfirmasi
            await sock.sendMessage(msg.key.remoteJid, {
                text: '✅ Grup berhasil ditutup!\nSekarang hanya admin yang bisa mengirim pesan.'
            });

            // Reaksi sukses
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error('Error processing close command:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal menutup grup: ' + (error.message || 'Error tidak diketahui')
            });
        }
    }
};
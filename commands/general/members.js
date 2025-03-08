module.exports = {
    name: 'members',
    category: 'general',
    description: 'Melihat siapa saja yang ada di grup',
    usage: '!members',
    permission: 'user',
    async execute(sock, msg, args) {
        try {
            // Pastikan perintah dijalankan di grup
            if (!msg.key.remoteJid.endsWith('@g.us')) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Perintah ini hanya bisa digunakan di grup!'
                });
            }

            // Kirim reaksi "processing"
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            // Ambil metadata grup
            const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
            const participants = groupMetadata.participants;

            // Buat daftar peserta
            let onlineList = participants.map((p, i) => {
                const isAdmin = p.admin === 'admin' || p.admin === 'superadmin' ? ' (Admin)' : '';
                return `${i + 1}. @${p.id.split('@')[0]}${isAdmin}`;
            });

            // Buat pesan
            const totalParticipants = participants.length;
            const message = `👥 *Daftar Member di Grup*\n` +
                           `Total: ${totalParticipants} member\n\n` +
                           onlineList.join('\n') + '\n\n' +
                           `*Catatan*: Ini adalah daftar semua member grup.`;

            // Kirim pesan dengan mention
            await sock.sendMessage(msg.key.remoteJid, {
                text: message,
                mentions: participants.map(p => p.id)
            }, { quoted: msg });

            // Kirim reaksi sukses
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error('Error fetching group participants:', error);

            // Kirim reaksi error
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });

            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal memuat daftar peserta: ' + (error.message || 'Error tidak diketahui')
            });
        }
    }
};
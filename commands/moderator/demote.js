const config = require('../../config.json');

module.exports = {
    name: 'demote', // Atau 'unadmin'
    category: 'moderasi',
    description: 'Mencopot status admin dari anggota grup.',
    usage: '!demote <@member> atau !demote (dengan reply pesan member)',
    permission: 'admin',
    async execute(sock, msg, args) {
        console.log('Memulai perintah demote...');

        // --- Cek Izin ---
        const isAdmin = msg.key.participant === config.adminNumber + '@s.whatsapp.net'; // Sesuaikan dengan cara menentukan admin
        if (!isAdmin) {
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini!' }, { quoted: msg });
                console.log('Pesan kesalahan izin terkirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan izin:', error);
            }
            return;
        }

        // --- Cek Apakah di Grup ---
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Perintah ini hanya bisa digunakan di dalam grup!' }, { quoted: msg });
                console.log('Pesan kesalahan: Perintah hanya untuk grup.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan (bukan grup):', error);
            }
            return;
        }

        // --- Mendapatkan ID Target ---
        let targetId = '';

        // 1. Coba dari mention (@member)
        if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            targetId = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            console.log('Target ID dari mention:', targetId);
        }
        // 2. Coba dari reply
        else if (msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
            targetId = msg.message.extendedTextMessage.contextInfo.participant; // Ambil dari contextInfo.participant
            console.log('Target ID dari reply:', targetId);
        }
        // 3. Jika tidak ada keduanya, beri pesan kesalahan
        else {
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Mention member atau reply pesan member yang ingin di-demote!' }, { quoted: msg });
                console.log('Pesan kesalahan: Tidak ada mention/reply.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan (tidak ada mention/reply):', error);
            }
            return;
        }

        // --- Validasi target ID ---
        if (!targetId.endsWith('@s.whatsapp.net')) {
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: "❌ Target ID tidak valid." }, { quoted: msg });
                console.error("Gagal karena target ID tidak valid:", targetId);
                return;
            } catch (e) {
                console.error("Gagal kirim error target id tidak valid:", e);
                return;
            }
        }

        // --- Mencopot Admin ---
        try {
            await sock.groupParticipantsUpdate(
                msg.key.remoteJid,
                [targetId],
                "demote" // Ini yang penting: "demote" untuk mencopot admin
            );
            console.log(`Berhasil mencopot admin dari ${targetId}`);

            try {
                await sock.sendMessage(msg.key.remoteJid, { text: `✅ Berhasil mencopot status admin dari ${targetId.split('@')[0]}.` }, { quoted: msg });
                console.log("Pesan berhasil demote terkirim");
            } catch (sendErr) {
                console.error("Gagal kirim pesan berhasil demote", sendErr);
            }
        } catch (error) {
            console.error('Gagal mencopot admin:', error);
            let errorMessage = '❌ Gagal mencopot status admin. Pastikan bot adalah admin dan member tersebut adalah admin.';
            if (error.message.includes('not-authorized')) { // Pesan error dari baileys jika bot bukan admin
                errorMessage = '❌ Bot bukan admin, tidak bisa mencopot admin.';
            } else if (error.message.includes('not-participant')) { // Jika target bukan participant
                errorMessage = "❌ Target bukan anggota grup.";
            }
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: errorMessage }, { quoted: msg });
                console.log('Pesan kesalahan gagal demote terkirim.');
            } catch (sendErr) {
                console.error("Gagal kirim pesan error demote", sendErr);
            }
        }
    }
};
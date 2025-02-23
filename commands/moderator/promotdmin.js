const config = require('../../config.json');

module.exports = {
    name: 'promote',
    category: 'moderasi',
    alias: ['akmin', 'atmint'],
    description: 'Mempromosikan member menjadi admin grup.',
    usage: '!promote <@tag member> atau !promote <nomor telepon> atau !promote (reply pesan)',
    permission: 'admin',
    async execute(sock, msg, args) {
        console.log('Memulai perintah promote...');

        // Cek apakah pengirim adalah admin grup
        const isAdmin = msg.key.participant === config.adminNumber + '@s.whatsapp.net';
        if (!isAdmin) {
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

        let targetId;

        // Cek apakah ada tag mention
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid.length > 0) {
            targetId = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Cek apakah ada reply message
        else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            targetId = msg.message.extendedTextMessage.contextInfo.participant;
        }
        // Jika tidak ada tag, coba ambil nomor telepon dari argumen
        else if (args.length > 0) {
            const phoneNumber = args[0].replace(/[^0-9]/g, ''); // Hilangkan karakter non-angka
            targetId = phoneNumber + '@s.whatsapp.net';
        }
        else {
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Tag member, masukkan nomor telepon, atau reply pesan yang ingin dipromosikan!'
                });
                console.log('Pesan kesalahan tidak ada target berhasil dikirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan tidak ada target:', error);
            }
            return;
        }

        try {
            await sock.groupParticipantsUpdate(
                msg.key.remoteJid,
                [targetId],
                "promote" // "promote" untuk menjadikan admin
            );
            console.log(`Berhasil mempromosikan ${targetId}`);
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: `✅ Berhasil menambahkan status admin dari ${targetId.split('@')[0]}.` }, { quoted: msg });
                console.log('Pesan berhasil promote dikirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan berhasil promote:', error);
            }

        } catch (error) {
            console.error('Gagal mempromosikan:', error);
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Gagal mempromosikan member. Pastikan bot adalah admin dan member tersebut ada di grup.'
                });
                console.log('Pesan kesalahan gagal promote berhasil dikirim.');
            } catch (sendMessageError) {
                console.error('Gagal mengirim pesan kesalahan promote:', sendMessageError);
            }
        }
    }
};
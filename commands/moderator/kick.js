const config = require('../../config.json');

module.exports = {
    name: 'kick',
    category: 'moderasi',
    description: 'Mengeluarkan (kick) member dari grup.',
    usage: '!kick <@tag member>',
    permission: 'admin', // Atau sesuaikan dengan level izin yang Anda inginkan (misalnya, 'groupAdmin')
    async execute(sock, msg, args) {
        console.log('Memulai perintah kick...');

        // Cek apakah pengirim adalah admin grup (atau memiliki izin yang sesuai)
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const isAdmin = groupMetadata.participants.some(participant => participant.id === msg.key.participant && participant.admin !== null);
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

        // Ambil ID target yang akan di-kick
        if (!msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid.length === 0) {
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Tag member yang ingin di-kick!'
                });
                console.log('Pesan kesalahan tidak ada tag berhasil dikirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan tidak ada tag:', error);
            }
            return;
        }

        const targetId = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];

        // Validasi bahwa target bukan bot itu sendiri
        if (targetId === sock.user.id.split(":")[0] + "@s.whatsapp.net") {
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Tidak bisa kick bot sendiri!'
                });
                console.log('Pesan kesalahan kick bot sendiri berhasil dikirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan kick bot sendiri:', error);
            }
            return;
        }

        try {
            await sock.groupParticipantsUpdate(
                msg.key.remoteJid,
                [targetId],
                "remove" // "remove" untuk kick
            );
            console.log(`Berhasil kick ${targetId}`);
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `✅ Berhasil mengeluarkan ${targetId.split('@')[0]} dari grup.`
                });
                console.log('Pesan berhasil kick dikirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan berhasil kick:', error);
            }

        } catch (error) {
            console.error('Gagal kick:', error);
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Gagal mengeluarkan member. Pastikan bot adalah admin dan coba lagi nanti.'
                });
                console.log('Pesan kesalahan gagal kick berhasil dikirim.');
            } catch (sendMessageError) {
                console.error('Gagal mengirim pesan kesalahan kick:', sendMessageError);
            }
        }
    }
};
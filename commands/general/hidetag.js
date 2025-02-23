const config = require('../../config.json');


module.exports = {
    name: 'hidetag',
    category: 'general',
    description: 'Menyebutkan semua anggota grup secara tersembunyi (hidetag).',
    usage: '!hidetag <pesan>',
    permission: 'admin', // Atau sesuaikan dengan level izin yang Anda inginkan
    async execute(sock, msg, args) {
        console.log('Memulai perintah hidetag...');

        // Cek apakah pengirim adalah admin (atau memiliki izin yang sesuai)
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const isAdmin = groupMetadata.participants.find(participant => participant.id === msg.key.participant && participant.admin !== null);
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

        const participants = groupMetadata.participants;

        const mentions = participants.map(x => x.id);

        let text = args.join(" ") || "Hai semuanya!";  // Jika tidak ada pesan, gunakan pesan default

        try {
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: text,
                    mentions: mentions
                },
                {
                    quoted: msg // Opsional: Mengutip pesan asli
                }
            );
            console.log('Hidetag berhasil dikirim.');
        } catch (error) {
            console.error('Gagal mengirim hidetag:', error);
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Gagal mengirim hidetag.  Coba lagi nanti.'
                });
                console.log('Pesan kesalahan pengiriman hidetag berhasil dikirim.');
            } catch (sendMessageError) {
                console.error('Gagal mengirim pesan kesalahan hidetag:', sendMessageError);
            }
        }
    }
};
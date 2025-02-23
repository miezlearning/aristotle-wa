const config = require('../../config.json');

module.exports = {
    name: 'add',
    category: 'moderasi',
    description: 'Menambahkan member ke grup.',
    usage: '!add <nomor telepon>',
    permission: 'admin', // Atau sesuaikan dengan level izin yang Anda inginkan (misalnya, 'groupAdmin')
    async execute(sock, msg, args) {
        console.log('Memulai perintah add...');

        // Cek apakah pengirim adalah admin grup (atau memiliki izin yang sesuai)
        const isAdmin = msg.key.participant === config.adminNumber + '@s.whatsapp.net'; // Ganti dengan cara Anda menentukan admin
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

        // Ambil nomor telepon dari argumen
        if (args.length === 0) {
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Masukkan nomor telepon yang ingin ditambahkan!'
                });
                console.log('Pesan kesalahan tidak ada nomor telepon berhasil dikirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan tidak ada nomor telepon:', error);
            }
            return;
        }

        const phoneNumber = args[0].replace(/[^0-9]/g, '')  // Hilangkan karakter non-angka
        const targetId = phoneNumber + '@s.whatsapp.net';

        try {
            await sock.groupParticipantsUpdate(
                msg.key.remoteJid,
                [targetId],
                "add" // "add" untuk menambahkan
            );
            console.log(`Berhasil menambahkan ${targetId}`);
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `✅ Berhasil menambahkan ${phoneNumber} ke grup.`
                });
                console.log('Pesan berhasil menambahkan dikirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan berhasil menambahkan:', error);
            }

        } catch (error) {
            console.error('Gagal menambahkan:', error);
            let errorMessage = '❌ Gagal menambahkan member. Pastikan bot adalah admin dan nomor yang dimasukkan valid.';
            if (error.output?.statusCode === 403) {
              errorMessage = '❌ Nomor tersebut tidak dapat ditambahkan. Mungkin karena privasi mereka atau mereka telah memblokir bot.'
            }
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: errorMessage
                });
                console.log('Pesan kesalahan gagal menambahkan berhasil dikirim.');
            } catch (sendMessageError) {
                console.error('Gagal mengirim pesan kesalahan menambahkan:', sendMessageError);
            }
        }
    }
};
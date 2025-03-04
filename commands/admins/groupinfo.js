const config = require('../../config.json');

module.exports = {
    name: 'groupinfo',
    category: 'admin',
    description: 'Memeriksa informasi grup tempat perintah ini digunakan atau berdasarkan ID grup yang diberikan',
    usage: '!groupinfo [group_id]',
    permission: 'admin',
    async execute(sock, msg, args) {
        // Fungsi helper untuk mengirim pesan
        async function sendMessage(jid, message) {
            try {
                const msgId = 'message_' + Date.now();
                
                // Mencoba mengirim pesan dengan timeout
                const sent = await Promise.race([
                    sock.sendMessage(jid, { 
                        text: message,
                        messageId: msgId 
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Send timeout')), 10000)
                    )
                ]);

                if (sent && sent.key) {
                    console.log(`Pesan berhasil dikirim dengan ID: ${sent.key.id}`);
                    return true;
                } else {
                    console.error('Pesan gagal dikirim: Tidak ada konfirmasi pengiriman');
                    return false;
                }
            } catch (error) {
                console.error('Error saat mengirim pesan:', error);
                throw error;
            }
        }

        console.log(`Menjalankan perintah groupinfo dengan args:`, args);

        // Cek koneksi socket
        if (!sock.user || !sock.user.id) {
            console.error('Socket tidak terhubung dengan benar');
            return;
        }

        // Cek admin
        if (msg.key.participant !== config.adminNumber + '@s.whatsapp.net') {
            console.log('Bukan admin yang diizinkan');
            await sendMessage(
                msg.key.remoteJid,
                '❌ Anda tidak memiliki izin untuk menggunakan perintah ini!'
            );
            return;
        }

        // Tentukan groupId: gunakan args[0] jika ada, jika tidak gunakan current group
        let groupId = msg.key.remoteJid; // Default ke grup tempat command dijalankan
        if (args.length > 0) {
            groupId = args[0];
            // Validasi format group ID jika diberikan
            if (!groupId.endsWith('@g.us')) {
                console.log('ID Grup tidak valid');
                await sendMessage(
                    msg.key.remoteJid,
                    '❌ ID Grup tidak valid! Harus berakhiran @g.us'
                );
                return;
            }
        } else if (!groupId.endsWith('@g.us')) {
            // Jika tidak ada args dan bukan grup
            console.log('Perintah tidak digunakan di grup');
            await sendMessage(
                groupId,
                '❌ Perintah ini hanya dapat digunakan di dalam grup jika tidak ada ID grup yang diberikan!'
            );
            return;
        }

        try {
            console.log(`Mencoba mendapatkan metadata grup untuk: ${groupId}`);
            
            // Tambahkan timeout untuk mengambil metadata
            const groupMetadata = await Promise.race([
                sock.groupMetadata(groupId),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Metadata timeout')), 15000)
                )
            ]);

            console.log('Metadata grup berhasil didapatkan:', groupMetadata);

            if (!groupMetadata) {
                throw new Error('Metadata grup kosong');
            }

            const groupInfoText = `*Informasi Grup*\n\n` +
                `📌 *ID*: ${groupMetadata.id}\n` +
                `📌 *Nama*: ${groupMetadata.subject}\n` +
                `📌 *Deskripsi*: ${groupMetadata.desc || 'Tidak ada deskripsi'}\n` +
                `📌 *Jumlah Anggota*: ${groupMetadata.participants.length}\n` +
                `📌 *Dibuat*: ${new Date(groupMetadata.creation * 1000).toLocaleString()}\n` +
                `📌 *Owner*: ${groupMetadata.owner ? '@' + groupMetadata.owner.split('@')[0] : 'Tidak diketahui'}\n`;

            const messageSent = await sendMessage(msg.key.remoteJid, groupInfoText);
            
            if (!messageSent) {
                throw new Error('Gagal mengirim pesan');
            }

            console.log('Informasi grup berhasil dikirim');

        } catch (error) {
            console.error('Error dalam eksekusi groupinfo:', error);
            
            const errorMessage = error.message.includes('not-authorized') ?
                '❌ Bot tidak memiliki akses ke grup tersebut. Pastikan bot adalah anggota grup.' :
                '❌ Gagal mengambil informasi grup. Silakan coba lagi nanti.';

            await sendMessage(msg.key.remoteJid, errorMessage);
        }
    }
};
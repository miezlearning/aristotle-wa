const config = require('../../config.json');

module.exports = {
    name: 'kirim',
    category: 'moderasi',
    description: 'Mengirim pesan ke nomor WhatsApp tertentu (teks atau gambar).',
    usage: '!kirim <nomor> <pesan> ATAU !kirim <nomor> dengan caption gambar',
    permission: 'admin', // Sesuaikan dengan izin yang Anda inginkan
    async execute(sock, msg, args) {
        console.log('Memulai perintah kirim...');

        // Cek izin
        const isAdmin = msg.key.participant === config.adminNumber + '@s.whatsapp.net'; // Sesuaikan cara menentukan admin
        if (!isAdmin) {
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini!' }, { quoted: msg });
                console.log('Pesan kesalahan izin terkirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan izin:', error);
            }
            return;
        }

        // --- Parsing Argumen dan Nomor Telepon ---
        if (args.length < 2 && !msg.message.extendedTextMessage?.contextInfo?.quotedMessage) { //Cek minimal 2 argumen, DAN cek quoted message
             try {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Format perintah salah. Gunakan: `!kirim <nomor> <pesan>` atau `!kirim <nomor>` dengan me-reply pesan/gambar.' }, { quoted: msg });
                console.log('Pesan kesalahan format terkirim.');
            } catch (error) {
                console.error('Gagal mengirim pesan kesalahan format:', error);
            }
            return;
        }

        let phoneNumber = args[0].replace(/[^0-9]/g, ''); // Bersihkan nomor telepon
        phoneNumber = phoneNumber + '@s.whatsapp.net'; // Tambahkan @s.whatsapp.net

        // --- Handle Pengiriman Pesan ---

        // 1. Jika ada quoted message (gambar atau teks)
        const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;

        if (quoted) {
             let quotedType = Object.keys(quoted)[0]; //Ambil tipe pesan yg di-quote
             let content, options;

             //Jika yg di-quote adl gambar
             if(quotedType === 'imageMessage'){
                content = {
                  image: {url: quoted.imageMessage.url},
                  caption: args.slice(1).join(' ') || quoted.imageMessage.caption || '' // Ambil caption dari argumen, atau caption asli gambar, atau string kosong
                }
                options = {};
             }
             //Jika yg di-quote adl text
             else if (quotedType === 'conversation'){
                content = {
                    text:  args.slice(1).join(' ') ? args.slice(1).join(' ') : quoted.conversation // Ambil teks dari argumen, atau text asli yang direply.
                }
                options = {};
             }
             //Jika yg di-quote adalah tipe lain, beri error
             else {
               try {
                    await sock.sendMessage(msg.key.remoteJid, {text: '❌ Hanya bisa me-reply gambar atau teks!' }, {quoted: msg});
                    return;
                } catch (error){
                    console.error("Gagal kirim pesan 'hanya bisa reply gambar/teks':", error);
                    return;
                }
             }


            try {
                await sock.sendMessage(phoneNumber, content, options);
                console.log(`Pesan (quoted) terkirim ke ${phoneNumber}`);
                try {
                    await sock.sendMessage(msg.key.remoteJid, { text: `✅ Pesan (quoted) berhasil dikirim ke ${args[0]}` }, { quoted: msg });
                } catch (innerError) {
                     console.error('Gagal mengirim pesan konfirmasi (quoted):', innerError);
                }

            } catch (error) {
                console.error(`Gagal mengirim pesan (quoted) ke ${phoneNumber}:`, error);
                try {
                    await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal mengirim pesan (quoted) ke ${args[0]}. Pastikan nomornya valid dan tidak diblokir.` }, { quoted: msg });
                } catch (innerError) {
                    console.error('Gagal mengirim pesan kesalahan pengiriman (quoted):', innerError);
                }
            }


        // 2. Jika TIDAK ada quoted message (hanya teks biasa)
        } else {
            const messageText = args.slice(1).join(' ');
             if (!messageText) { //Jika tidak ada text sama sekali.
                try {
                    await sock.sendMessage(msg.key.remoteJid, { text: '❌ Masukkan pesan yang ingin dikirim!' }, { quoted: msg });
                       console.log('Pesan kesalahan tidak ada teks.');
                } catch(err){
                  console.error('Gagal mengirim pesan tidak ada teks:', err);
                }
                return;
             }
            try {
                await sock.sendMessage(phoneNumber, { text: messageText });
                console.log(`Pesan teks terkirim ke ${phoneNumber}`);
                  try {
                    await sock.sendMessage(msg.key.remoteJid, { text: `✅ Pesan berhasil dikirim ke ${args[0]}` }, { quoted: msg });
                } catch (innerError) {
                     console.error('Gagal mengirim pesan konfirmasi (teks):', innerError);
                }
            } catch (error) {
                console.error(`Gagal mengirim pesan teks ke ${phoneNumber}:`, error);
                try {
                    await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal mengirim pesan ke ${args[0]}. Pastikan nomornya valid dan tidak diblokir.` }, { quoted: msg });
                } catch (innerError) {
                    console.error('Gagal mengirim pesan kesalahan pengiriman (teks):', innerError);
                }
            }
        }
    }
};
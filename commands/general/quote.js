const config = require('../../config.json');
const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const FormData = require('form-data');

module.exports = {
    name: 'quotly',
    alias: ['quote', 'makequote'],
    category: 'utility',
    description: 'Membuat gambar quote dengan avatar, nama custom, dan pilihan mode (hitam/putih)',
    usage: '!quotly [nama], <teks>, [url_avatar] --hitam/--putih',
    permission: 'user',
    async execute(sock, msg, args) {
        try {
            // Daftar nomor yang diblokir
            const blockedNumber = '+6281257638984'; // Format nomor tanpa spasi atau tanda "-"

            // Ambil nomor pengirim
            const senderNumber = msg.key.participant || msg.key.remoteJid;

            // Normalisasi nomor pengirim (hapus spasi, tanda "-", dan pastikan formatnya sama)
            const normalizedSenderNumber = senderNumber.replace(/[-+\s]/g, '');

            // Cek apakah nomor pengirim ada di daftar nomor yang diblokir
            if (normalizedSenderNumber === blockedNumber) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'mau apasih icann?  🤟🏻😜🤟🏻'
                });
            }

            // Gabungkan semua argumen menjadi string
            const fullInput = args.join(' ');

            // Ambil mode dari argumen terakhir (setelah spasi terakhir)
            let mode = null;
            const lastSpaceSplit = fullInput.split(' ').filter(item => item.trim());
            const lastArg = lastSpaceSplit[lastSpaceSplit.length - 1];

            if (lastArg === '--hitam') {
                mode = '1'; // Mode hitam
            } else if (lastArg === '--putih') {
                mode = '2'; // Mode putih
            }

            // Hapus mode dari input sebelum parsing
            let inputWithoutMode = fullInput;
            if (mode) {
                inputWithoutMode = fullInput.replace(lastArg, '').trim();
            }

            // Parsing argumen dengan separator koma
            const input = inputWithoutMode.split(',').map(item => item.trim());
            let customName = input[0] || 'Seseorang'; // Nama di argumen pertama
            let text = input[1] || ''; // Teks di argumen kedua
            let avatarUrl = input[2] || null; // URL avatar di argumen ketiga

            // Cek jika ada pesan yang direply
            if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quotedMsg = msg.message.extendedTextMessage.contextInfo;
                const jid = quotedMsg.participant || quotedMsg.key.remoteJid;
                
                // Ambil profil dari pesan yang direply
                const profilePictureUrl = await sock.profilePictureUrl(jid, 'image').catch(() => null);
                avatarUrl = profilePictureUrl;
                
                // Teks selalu diambil dari pesan yang direply
                text = quotedMsg.quotedMessage.conversation || quotedMsg.quotedMessage.extendedTextMessage?.text || '';
                
                // Nama bisa dioverride oleh argumen pertama
                customName = input[0] || 'Seseorang';
                // Avatar bisa dioverride oleh argumen kedua (jika ada)
                avatarUrl = input[1] || profilePictureUrl;
            }

            // Cek attachment gambar jika ada dan avatarUrl masih null
            if (!avatarUrl && msg.message?.imageMessage) {
                const buffer = await downloadMediaMessage(
                    msg,
                    'buffer',
                    {},
                    { reuploadRequest: sock.updateMediaMessage }
                );

                // Buat FormData untuk upload ke Catbox
                const form = new FormData();
                form.append('reqtype', 'fileupload');
                form.append('fileToUpload', buffer, {
                    filename: 'avatar.jpg',
                    contentType: 'image/jpeg'
                });

                // Upload gambar ke Catbox
                const catboxResponse = await axios.post('https://catbox.moe/user/api.php', form, {
                    headers: { ...form.getHeaders() }
                });

                avatarUrl = catboxResponse.data;
                if (!avatarUrl || !avatarUrl.startsWith('https://files.catbox.moe/')) {
                    throw new Error('Gagal mengunggah gambar ke Catbox');
                }

                console.log('Catbox URL:', avatarUrl);
            }

            // Validasi input
            if (!text) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Masukkan teks untuk quote atau reply pesan!\n\n' +
                          '⚠️ *Format:* !quotly [nama], <teks>, [url_avatar] --hitam/--putih\n' +
                          '✅ Contoh: !quotly Budi, Halo dunia --hitam'
                });
            }

            // Validasi mode
            if (!mode) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Harap tentukan mode dengan --hitam atau --putih!\n\n' +
                          '⚠️ *Format:* !quotly [nama], <teks>, [url_avatar] --hitam/--putih\n' +
                          '✅ Contoh: !quotly Budi, Halo dunia --hitam'
                });
            }

            // Gunakan avatar default mirip WhatsApp jika avatarUrl masih kosong
            if (!avatarUrl) {
                avatarUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
            }

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

            // Pilih API berdasarkan mode
            let apiUrl;
            if (mode === '1') {
                // Mode hitam
                apiUrl = new URL('https://api.hiuraa.my.id/maker/quotechat');
                apiUrl.searchParams.append('text', text);
                apiUrl.searchParams.append('name', customName);
                apiUrl.searchParams.append('profile', avatarUrl);
            } else {
                // Mode putih
                apiUrl = new URL('https://api.ryzendesu.vip/api/image/quotly');
                apiUrl.searchParams.append('text', text);
                apiUrl.searchParams.append('name', customName);
                apiUrl.searchParams.append('avatar', avatarUrl);
            }

            // Log URL untuk debugging
            console.log('API URL:', apiUrl.toString());

            // Request ke API
            const response = await axios.get(apiUrl.toString(), { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');

            // Kirim hasil
            await sock.sendMessage(msg.key.remoteJid, {
                image: buffer,
                caption: `Quote untuk "${text}" oleh ${customName} (Mode: ${mode === '1' ? 'Hitam' : 'Putih'})`
            });

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Error processing quotly command:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Gagal membuat quote: ' + (error.response?.data?.error || error.message)
            });
        }
    }
};
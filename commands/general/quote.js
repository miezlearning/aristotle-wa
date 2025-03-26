const config = require('../../config.json');
const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'quotly',
    alias: ['quote', 'makequote'],
    category: 'utility',
    description: 'Membuat gambar quote dengan avatar dan nama custom',
    usage: '!quotly <teks>, [nama], [url_avatar]',
    permission: 'user',
    async execute(sock, msg, args) {
        try {
            // Parsing argumen dengan separator koma
            const input = args.join(' ').split(',').map(item => item.trim());
            let text = input[0] || '';
            let customName = input[1] || 'Seseorang';
            let avatarUrl = input[2] || null;

            // Cek jika ada pesan yang direply
            if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quotedMsg = msg.message.extendedTextMessage.contextInfo;
                const jid = quotedMsg.participant || quotedMsg.key.remoteJid;
                
                // Ambil profil dari pesan yang direply
                const profilePictureUrl = await sock.profilePictureUrl(jid, 'image').catch(() => null);
                avatarUrl = profilePictureUrl;
                
                // Teks selalu diambil dari pesan yang direply, argumen pertama diabaikan
                text = quotedMsg.quotedMessage.conversation || quotedMsg.quotedMessage.extendedTextMessage?.text || '';
                
                // Nama bisa dioverride oleh argumen pertama (bukan kedua, karena teks tidak dipakai)
                customName = input[0] || 'Seseorang';
                // Avatar bisa dioverride oleh argumen kedua (jika ada)
                avatarUrl = input[1] || profilePictureUrl;
            }

            // Cek attachment gambar jika ada
            if (!avatarUrl && msg.message?.imageMessage) {
                const buffer = await downloadMediaMessage(
                    msg,
                    'buffer',
                    {},
                    { reuploadRequest: sock.updateMediaMessage }
                );
                // Di sini seharusnya ada logika upload ke server temporer untuk mendapatkan URL
                // Misalnya: avatarUrl = await uploadToServer(buffer);
            }

            // Validasi input
            if (!text) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Masukkan teks untuk quote atau reply pesan!\n\n' +
                          '⚠️ *Format:* !quotly <teks>, [nama], [url_avatar]\n' +
                          '✅ Contoh: !quotly Halo dunia, Budi\n' +
                          '✅ Reply pesan: !quotly Budi, https://example.com/avatar.jpg'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

            // Buat URL untuk API Quotly
            const apiUrl = new URL('https://api.ryzendesu.vip/api/image/quotly');
            apiUrl.searchParams.append('text', text);
            apiUrl.searchParams.append('name', customName);
            apiUrl.searchParams.append('avatar', avatarUrl || '');

            // Request ke API
            const response = await axios.get(apiUrl.toString(), { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');

            // Kirim hasil
            await sock.sendMessage(msg.key.remoteJid, {
                image: buffer,
                caption: `Quote untuk "${text}" oleh ${customName}`
            });

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Error processing quotly command:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Gagal membuat quote: ' + error.message 
            });
        }
    }
};
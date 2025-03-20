const config = require('../../config.json');
const axios = require('axios');

module.exports = {
    name: 'lihatprofil',
    alias: ['profilwa', 'checkwa'],
    category: 'utility',
    description: 'Melihat informasi profil WhatsApp berdasarkan nomor yang diberikan',
    usage: '!lihatprofil <nomor_whatsapp>',
    permission: 'user',
    async execute(sock, msg, args) {
        console.log('Perintah lihatprofil dipanggil:', JSON.stringify(msg, null, 2));
        
        try {
            const input = args.join('').trim();
            const phoneNumber = input.replace(/\D/g, '');
            if (!phoneNumber || phoneNumber.length < 10) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Masukkan nomor WhatsApp yang valid!\n\n' +
                          '⚠️ *Format:* !lihatprofil <nomor_whatsapp>\n' +
                          '✅ Contoh: !lihatprofil 6281234567890'
                });
            }

            const jid = `${phoneNumber}@s.whatsapp.net`;
            console.log('JID yang akan diperiksa:', jid);

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

            const contactCheck = await sock.onWhatsApp(jid);
            if (!contactCheck || contactCheck.length === 0 || !contactCheck[0].exists) {
                throw new Error('Nomor tidak terdaftar di WhatsApp!');
            }

            console.log('Raw contactCheck:', JSON.stringify(contactCheck, null, 2));

            const profileStatus = await sock.fetchStatus(jid).catch(() => ({ status: 'Tidak tersedia' }));
            console.log('Raw profileStatus:', JSON.stringify(profileStatus, null, 2));

            const profilePictureUrl = await sock.profilePictureUrl(jid, 'image').catch(() => null);

            const profileData = {
                number: phoneNumber,
                status: profileStatus.status || 'Tidak tersedia',
                name: contactCheck[0].name || contactCheck[0].notify || 'Tidak tersedia',
                picture: profilePictureUrl ? 'Tersedia (dikirim sebagai gambar)' : 'Tidak ada foto profil khusus'
            };

            console.log('Data profil yang akan ditampilkan:', profileData);

            await sock.sendMessage(msg.key.remoteJid, {
                text: `📱 *Informasi Profil WhatsApp*\n\n` +
                      `📞 Nomor: ${profileData.number}\n` +
                      `👤 Nama: ${profileData.name}\n` +
                      `💬 Status: ${profileData.status}\n` +
                      `🖼️ Foto Profil: ${profileData.picture}`
            });

            if (profilePictureUrl) {
                const response = await axios.get(profilePictureUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data, 'binary');
                await sock.sendMessage(msg.key.remoteJid, {
                    image: buffer,
                    caption: `Foto profil untuk ${profileData.number}`
                });
            }

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Error processing lihatprofil command:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal memproses perintah: ' + error.message });
        }
    }
};
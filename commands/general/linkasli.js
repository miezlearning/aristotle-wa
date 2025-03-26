const config = require('../../config.json');
const axios = require('axios');

module.exports = {
    name: 'ceklink',
    alias: ['linkasli', 'rillkah'],
    category: 'utility',
    description: 'Memeriksa link asli dari redirect link',
    usage: '!ceklink <url>',
    permission: 'user',
    async execute(sock, msg, args) {
        try {
            // Ambil URL dari argumen
            const url = args.join(' ').trim();

            // Validasi input
            if (!url) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Masukkan URL untuk diperiksa!\n\n' +
                          '⚠️ *Format:* !ceklink <url>\n' +
                          '✅ Contoh: !ceklink s.id/plthinker'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

            // Buat URL untuk API
            const apiUrl = new URL('https://api.hiuraa.my.id/tools/redirectdetective');
            apiUrl.searchParams.append('url', url);

            // Request ke API
            const response = await axios.get(apiUrl.toString());
            const data = response.data;

            // Cek apakah API mengembalikan hasil yang valid
            if (data.status === 'success' && data.final_url) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `🔗 *Link Asli:*\n${data.final_url}\n\n` +
                          `📋 *Input:* ${url}`
                });
            } else {
                throw new Error(data.message || 'Gagal mendeteksi link asli');
            }

            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Error processing ceklink command:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚠️", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Gagal memeriksa redirect: ' + error.message 
            });
        }
    }
};
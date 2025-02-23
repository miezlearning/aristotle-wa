const config = require('../../config.json');

module.exports = {
    name: 'getgroupid',
    category: 'admin',
    alias:['idgrup'],
    description: 'Mendapatkan ID grup saat ini',
    usage: '!getgroupid',
    permission: 'admin',
    async execute(sock, msg, args) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Perintah ini hanya dapat digunakan di dalam grup!'
            });
        }

        // Cek apakah pengirim adalah admin yang diizinkan
        if (msg.key.participant !== config.adminNumber + '@s.whatsapp.net') {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini!'
            });
        }

        await sock.sendMessage(msg.key.remoteJid, {
            text: `🆔 ID Grup ini adalah: ${msg.key.remoteJid}`
        });
    }
};
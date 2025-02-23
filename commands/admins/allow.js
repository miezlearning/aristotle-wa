const fs = require('fs').promises;
const config = require('../../config.json');

module.exports = {
    name: 'allowgroup',
    category: 'admin',
    description: 'Menambahkan grup ke daftar grup yang diizinkan',
    usage: '!allowgroup <add/remove> <group_id>',
    permission: 'admin',
    async execute(sock, msg, args) {
        // Cek apakah pengirim adalah admin yang diizinkan
        if (msg.key.participant !== config.adminNumber + '@s.whatsapp.net') {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini!'
            });
        }

        if (args.length !== 2) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah! Gunakan: !allowgroup <add/remove> <group_id>'
            });
        }

        const action = args[0].toLowerCase();
        const groupId = args[1];

        if (!groupId.endsWith('@g.us')) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ ID Grup tidak valid!'
            });
        }

        try {
            const configPath = './config.json';
            const config = require('../../config.json');
            
            if (!config.allowedGroups) {
                config.allowedGroups = [];
            }

            if (action === 'add') {
                if (config.allowedGroups.includes(groupId)) {
                    return await sock.sendMessage(msg.key.remoteJid, {
                        text: '❌ Grup ini sudah ada dalam daftar yang diizinkan!'
                    });
                }
                config.allowedGroups.push(groupId);
                await fs.writeFile(configPath, JSON.stringify(config, null, 2));
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '✅ Grup berhasil ditambahkan ke daftar yang diizinkan!'
                });
            } else if (action === 'remove') {
                const index = config.allowedGroups.indexOf(groupId);
                if (index === -1) {
                    return await sock.sendMessage(msg.key.remoteJid, {
                        text: '❌ Grup tidak ditemukan dalam daftar yang diizinkan!'
                    });
                }
                config.allowedGroups.splice(index, 1);
                await fs.writeFile(configPath, JSON.stringify(config, null, 2));
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '✅ Grup berhasil dihapus dari daftar yang diizinkan!'
                });
            } else {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Aksi tidak valid! Gunakan "add" atau "remove"'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Terjadi kesalahan saat memproses perintah.'
            });
        }
    }
};
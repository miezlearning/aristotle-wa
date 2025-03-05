const config = require('../../config.json');

module.exports = {
    name: 'join',
    alias: ['joingrup', 'addgrup'],
    category: 'general',
    description: 'Menambahkan bot ke grup WhatsApp menggunakan link undangan',
    usage: '!join <link grup WhatsApp>',
    permission: 'user', // Bisa diubah ke 'admin' atau 'owner' jika hanya untuk pengguna tertentu
    async execute(sock, msg, args) {
        console.log('Perintah join dipanggil:', JSON.stringify(msg, null, 2));
        
        try {
            // Cek izin admin dari config.adminNumber
            if (msg.key.participant !== config.adminNumber + '@s.whatsapp.net') {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini!'
                });
            }

            // Cek apakah ada argumen (link)
            let link = args.join(' ').trim();
            if (!link) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Kirim link undangan grup dengan perintah !join\n\n' +
                          '⚠️ *Format:* !join <link grup>\n' +
                          '✅ Contoh: !join https://chat.whatsapp.com/xxxxxxxxxxxxxxxxxx'
                });
            }

            // Validasi apakah input adalah link grup WhatsApp
            if (!link.includes('chat.whatsapp.com')) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Link tidak valid. Harus berupa link undangan grup WhatsApp!\n' +
                          '✅ Contoh: https://chat.whatsapp.com/xxxxxxxxxxxxxxxxxx'
                });
            }

            // Beri reaksi loading
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⏳", key: msg.key }
            });

            console.log('Memproses link grup:', link);

            // Ekstrak kode undangan dari link
            const inviteCodeMatch = link.match(/chat\.whatsapp\.com\/(?:invite\/)?([0-9A-Za-z]{20,24})/);
            if (!inviteCodeMatch || !inviteCodeMatch[1]) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Kode undangan tidak ditemukan dalam link. Pastikan link valid!'
                });
            }

            const inviteCode = inviteCodeMatch[1];
            console.log('Kode undangan:', inviteCode);

            // Gabung ke grup menggunakan kode undangan
            const groupResponse = await sock.groupAcceptInvite(inviteCode);
            console.log('Respons dari groupAcceptInvite:', groupResponse);

            // Periksa respons (bisa string jid atau objek)
            let groupId;
            if (typeof groupResponse === 'string') {
                groupId = groupResponse; // Jika string langsung (jid)
            } else if (groupResponse && groupResponse.id) {
                groupId = groupResponse.id; // Jika objek dengan id
            } else {
                // Cek apakah bot sudah ada di grup
                const groups = await sock.groupFetchAllParticipating();
                const groupExists = Object.values(groups).some(group => group.inviteCode === inviteCode);
                if (groupExists) {
                    groupId = Object.keys(groups).find(key => groups[key].inviteCode === inviteCode);
                    console.log('Bot sudah ada di grup:', groupId);
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `ℹ️ Bot sudah berada di grup!\nID Grup: ${groupId}`
                    });
                    await sock.sendMessage(msg.key.remoteJid, {
                        react: { text: "✅", key: msg.key }
                    });
                    return;
                }
                throw new Error('Gagal bergabung ke grup. Link mungkin kedaluwarsa atau tidak valid.');
            }

            console.log('Berhasil bergabung ke grup:', groupId);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `✅ Bot telah bergabung ke grup!\nID Grup: ${groupId}`
            });

            // Kirim pesan selamat datang ke grup (opsional)
            await sock.sendMessage(groupId, {
                text: '*Halo semua*! Aku bot yang baru bergabung. Ketik `!help` untuk melihat perintah yang kupunya 👻.'
            });

            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error('Error processing join command:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: "⚠️", key: msg.key }
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal memproses perintah: ' + error.message
            });
        }
    }
};
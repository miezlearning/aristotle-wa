const config = require('../../config.json');
const listManager = require('../../utils/listManager').listManager;

module.exports = {
    name: 'ikut',
    alias: ['join_list', 'masuk'],
    category: 'group',
    description: 'Bergabung ke daftar yang sudah dibuat di grup dengan nama dan catatan bebas',
    usage: '!ikut <nama> <catatan>',
    permission: 'user',
    async execute(sock, msg, args) {
        const groupId = msg.key.remoteJid;

        if (!groupId.endsWith('@g.us')) {
            return await sock.sendMessage(groupId, { text: '❌ Command ini hanya bisa digunakan di grup!' });
        }

        listManager.checkExpiredLists();
        const list = listManager.getList(groupId);
        if (!list) {
            return await sock.sendMessage(groupId, {
                text: '❌ Belum ada list di grup ini atau list sudah kadaluarsa! Buat baru dengan !setup_list'
            });
        }

        try {
            // Pastikan ada input
            if (args.length < 1) {
                return await sock.sendMessage(groupId, {
                    text: '⚠️ Format salah! Gunakan: *!ikut <nama> <catatan>*\nContoh: !ikut Alip Ayam Goreng 2 porsi\n(Nama hanya boleh huruf, angka, spasi, maks 20 karakter)'
                });
            }

            // Ambil nama dari kata pertama, sisanya jadi catatan
            const participantName = args[0].trim().slice(0, 20);
            const note = args.slice(1).join(' ').trim().slice(0, 50) || '';

            // Validasi nama (huruf, angka, spasi)
            if (!participantName || !participantName.match(/^[a-zA-Z0-9\s]+$/)) {
                return await sock.sendMessage(groupId, {
                    text: '⚠️ Nama tidak valid! Gunakan: *!ikut <nama> <catatan>*\nContoh: !ikut Alip Ayam Goreng 2 porsi\n(Nama hanya boleh huruf, angka, spasi, maks 20 karakter)'
                });
            }

            const result = listManager.addParticipant(groupId, participantName, note);
            if (!result.success) {
                if (result.reason === 'full') {
                    return await sock.sendMessage(groupId, {
                        text: `❌ List *${list.name}* sudah penuh (maksimum 50 peserta)!`
                    });
                } else if (result.reason === 'duplicate') {
                    return await sock.sendMessage(groupId, {
                        text: `⚠️ *${participantName}* sudah ada di list *${list.name}*!`
                    });
                }
            }

            console.log(`[${groupId}] ${participantName} bergabung ke list ${list.name}`);
            const updatedList = listManager.getList(groupId);
            const participantList = updatedList.participants
                .map((p, i) => `${i + 1}. ${p.name}${p.note ? ' - ' + p.note : ''}`)
                .join('\n');

            await sock.sendMessage(groupId, {
                text: `✅ *${participantName}* berhasil masuk list *${updatedList.name}*!\n\nDaftar saat ini:\n${participantList}`
            });

        } catch (error) {
            console.error('Error in ikut command:', error);
            await sock.sendMessage(groupId, { text: '❌ Gagal bergabung ke list: ' + error.message });
        }
    }
};
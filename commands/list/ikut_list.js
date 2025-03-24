module.exports.ikut = {
    name: 'ikut',
    alias: ['join_list', 'masuk'],
    category: 'group',
    description: 'Bergabung ke daftar yang sudah dibuat di grup',
    usage: '!ikut <nama> - <catatan>',
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
            const input = args.join(' ').split(' - ');
            const participantName = input[0]?.trim().slice(0, 20);
            const note = input[1]?.trim().slice(0, 50) || '';

            if (!participantName || !participantName.match(/^[a-zA-Z0-9\s]+$/)) {
                return await sock.sendMessage(groupId, {
                    text: '⚠️ Format salah atau nama tidak valid! Gunakan: *!ikut <nama> - <catatan>*\nContoh: !ikut Alip - Ayam Goreng\n(Nama hanya boleh huruf, angka, spasi, maks 20 karakter)'
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
                .map((p, i) => `${i + 1}. ${p.name} - ${p.note || 'Tanpa catatan'}`)
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
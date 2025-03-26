const config = require('../../config.json');
const listManager = require('../../utils/listManager').listManager;

module.exports = {
    name: 'tutup_list',
    alias: ['closelist', 'hapus_list'],
    category: 'group',
    description: 'Menutup atau menghapus list aktif di grup',
    usage: '!tutup_list',
    permission: 'admin',
    async execute(sock, msg, args) {
        const groupId = msg.key.remoteJid;

        if (!groupId.endsWith('@g.us')) {
            return await sock.sendMessage(groupId, { text: '❌ Command ini hanya untuk grup!' });
        }

        listManager.checkExpiredLists();
        const list = listManager.getList(groupId);
        if (!list) {
            return await sock.sendMessage(groupId, { text: '❌ Tidak ada list aktif atau list sudah kadaluarsa di grup ini!' });
        }

        const metadata = await sock.groupMetadata(groupId);
        const isAdmin = metadata.participants
            .find(p => p.id === msg.key.participant)?.admin || msg.key.participant === list.creator;

        if (!isAdmin) {
            return await sock.sendMessage(groupId, { text: '❌ Hanya admin grup atau pembuat list yang bisa menutup list!' });
        }

        listManager.deleteList(groupId);
        console.log(`[${groupId}] List ${list.name} ditutup oleh ${msg.key.participant}`);
        await sock.sendMessage(groupId, {
            text: `✅ List *${list.name}* telah ditutup dan dihapus!`
        });
    }
};
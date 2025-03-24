const fs = require('fs');
const path = require('path');

const listsFile = path.join(__dirname, 'lists.json');

class ListManager {
    constructor() {
        this.lists = new Map();
        this.loadLists();
    }

    createList(groupId, listName, creator) {
        if (this.lists.has(groupId)) {
            return false;
        }
        this.lists.set(groupId, {
            name: listName,
            participants: [],
            createdAt: Date.now(),
            creator: creator
        });
        this.saveLists();
        return true;
    }

    addParticipant(groupId, participant, note = '') {
        if (this.lists.has(groupId)) {
            const list = this.lists.get(groupId);
            if (list.participants.length >= 50) {
                return { success: false, reason: 'full' };
            }
            if (list.participants.some(p => p.name.toLowerCase() === participant.toLowerCase())) {
                return { success: false, reason: 'duplicate' };
            }
            list.participants.push({ name: participant, note });
            this.saveLists();
            return { success: true };
        }
        return { success: false, reason: 'not_found' };
    }

    deleteList(groupId) {
        if (this.lists.has(groupId)) {
            this.lists.delete(groupId);
            this.saveLists();
            return true;
        }
        return false;
    }

    getList(groupId) {
        this.checkExpiredLists();
        return this.lists.get(groupId) || null;
    }

    checkExpiredLists() {
        const now = Date.now();
        for (const [groupId, list] of this.lists.entries()) {
            if (now - list.createdAt > 24 * 60 * 60 * 1000) {
                this.lists.delete(groupId);
                console.log(`List di ${groupId} kadaluarsa dan dihapus`);
            }
        }
        this.saveLists();
    }

    saveLists() {
        fs.writeFileSync(listsFile, JSON.stringify([...this.lists], null, 2));
    }

    loadLists() {
        if (fs.existsSync(listsFile)) {
            const data = JSON.parse(fs.readFileSync(listsFile));
            this.lists = new Map(data);
        }
    }
}

module.exports = new ListManager();
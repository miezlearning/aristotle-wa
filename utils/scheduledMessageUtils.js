const fs = require('fs');
const path = require('path');

const scheduledMessagesFilePath = path.join(__dirname, '../scheduledMessages.json');
let scheduledMessages = new Map();

function loadScheduledMessages() {
    try {
        const data = fs.readFileSync(scheduledMessagesFilePath, 'utf8');
        const parsedData = JSON.parse(data);

        scheduledMessages = new Map(Object.entries(parsedData).map(([groupId, messageList]) => [
            groupId,
            messageList.map(message => ({
                ...message,
                timestamp: parseInt(message.timestamp),
                mentions: message.mentions || [],
            }))
        ]));
    } catch (error) {
        console.warn('Gagal memuat data scheduledMessages.json (mungkin file belum ada).', error);
        scheduledMessages = new Map();
    }
}

function saveScheduledMessages() {
    try {
        const data = JSON.stringify(Object.fromEntries(scheduledMessages), null, 2);
        fs.writeFileSync(scheduledMessagesFilePath, data, 'utf8');
    } catch (error) {
        console.error('Gagal menyimpan data ke scheduledMessages.json:', error);
    }
}

async function processScheduledMessages(sock) {
    const now = Date.now();
    let needsSave = false;

    for (const [groupId, messageList] of scheduledMessages.entries()) {
        const activeMessages = [];
        let groupModified = false; // Track if this group's messages were modified

        for (const messageObj of messageList) {
            if (now >= messageObj.timestamp) {
                try {
                    await sock.sendMessage(groupId, {
                        text: messageObj.message,
                        mentions: messageObj.mentions // Sertakan mentions saat mengirim pesan
                    });
                    console.log(`Pesan terjadwal ${messageObj.id} terkirim ke ${groupId}`);
                    needsSave = true;
                    groupModified = true; // This group had messages processed
                } catch (error) {
                    console.error(`Gagal mengirim pesan terjadwal ${messageObj.id} ke ${groupId}:`, error);
                    activeMessages.push(messageObj); // Keep for retry or logging
                }
                // DO NOT push to activeMessages.  It's done.  It's either sent or failed.
            } else {
                activeMessages.push(messageObj); // Keep upcoming messages
            }
        }

        // Update the scheduledMessages map only if the group was modified
        if (groupModified) {
            if (activeMessages.length > 0) {
                scheduledMessages.set(groupId, activeMessages);
            } else {
                scheduledMessages.delete(groupId);
            }
        }
    }

    if (needsSave) {
        saveScheduledMessages();
        console.log('Data scheduledMessages.json diperbarui.');
    }
}

function scheduleMessage(sock, groupId, message, timestamp, mentions = []) {
    const messageId = Date.now().toString(); // Unique ID
    const newMessage = {
        id: messageId,
        message: message,
        timestamp: timestamp,
        mentions: mentions // Simpan mentions di sini
    };

    if (scheduledMessages.has(groupId)) {
        scheduledMessages.get(groupId).push(newMessage);
    } else {
        scheduledMessages.set(groupId, [newMessage]);
    }

    saveScheduledMessages();
    console.log(`Pesan dijadwalkan (ID: ${messageId}) untuk dikirim pada ${new Date(timestamp).toLocaleString()}`);

    // Set Timeout
    const delay = timestamp - Date.now();
    setTimeout(async () => {
        await processScheduledMessages(sock); // Process ALL messages, not just this one.
    }, delay);
}

module.exports = {
    scheduledMessages,
    loadScheduledMessages,
    saveScheduledMessages,
    scheduleMessage,
    processScheduledMessages, // Export this function
};
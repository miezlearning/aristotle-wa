const fs = require('fs');
const path = require('path');

let nextTimeout = null; // Menyimpan reference timeout

// Lokasi file penyimpanan
const REMINDERS_FILE = path.join(__dirname, '../reminders.json');

// Objek untuk menyimpan pengingat (sementara, di memori)
const reminders = new Map();

// Fungsi untuk memuat pengingat dari file
function loadReminders() {
    try {
        const data = fs.readFileSync(REMINDERS_FILE, 'utf8');
        const parsedData = JSON.parse(data);

        for (const groupId in parsedData) {
            if (parsedData.hasOwnProperty(groupId)) {
                reminders.set(groupId, parsedData[groupId]);
            }
        }

        console.log('Pengingat berhasil dimuat dari file.');
    } catch (error) {
        console.error('Gagal memuat pengingat dari file (mungkin file tidak ada):', error);
    }
}

// Fungsi untuk menyimpan pengingat ke file
function saveReminders() {
    try {
        const dataToStore = {};

        // Hanya simpan grup yang memiliki reminder aktif
        for (const [groupId, reminderList] of reminders.entries()) {
            if (reminderList.length > 0) {
                dataToStore[groupId] = reminderList;
            }
        }

        fs.writeFileSync(REMINDERS_FILE, JSON.stringify(dataToStore, null, 2), 'utf8');
        console.log('Reminders saved!');
    } catch (error) {
        console.error('Gagal menyimpan:', error);
    }
}

function sortReminders() {
    for (const [groupId, list] of reminders.entries()) {
        list.sort((a, b) => a.timestamp - b.timestamp);
    }
}

// Proses pengingat yang sudah waktunya
async function processReminders(sock) {
    console.log('Memproses reminders...');
    const now = Date.now();
    let needsSave = false;

    for (const [groupId, reminderList] of reminders.entries()) {
        const activeReminders = [];

        for (const reminder of reminderList) {
            if (now >= reminder.timestamp) {
                try {
                    await sock.sendMessage(groupId, {
                        text: `⏰ Pengingat dari @${reminder.creator.split('@')[0]}:\n${reminder.message}`,
                        mentions: [reminder.creator, ...reminder.mentions]
                    });
                    console.log(`Reminder ${reminder.id} terkirim`);
                    needsSave = true;
                } catch (error) {
                    console.error(`Gagal mengirim reminder ${reminder.id}:`, error);
                    activeReminders.push(reminder);
                }
            } else {
                activeReminders.push(reminder);
            }
        }

        if (activeReminders.length > 0) {
            reminders.set(groupId, activeReminders);
        } else {
            reminders.delete(groupId);
        }
    }

    if (needsSave) {
        saveReminders();
        sortReminders();
        console.log('Data JSON diperbarui');
    }
}

// Jadwalkan timeout untuk reminder terdekat
function scheduleNextReminder(sock) {
    const allReminders = [];
    reminders.forEach((list) => allReminders.push(...list));

    if (allReminders.length === 0) return;

    const nextReminder = allReminders.reduce((prev, curr) => 
        prev.timestamp < curr.timestamp ? prev : curr
    );

    const delay = nextReminder.timestamp - Date.now();

    if (delay < 0) {
        processReminders(sock);
    } else {
        if (nextTimeout) clearTimeout(nextTimeout);
        nextTimeout = setTimeout(() => {
            processReminders(sock);
            scheduleNextReminder(sock);
        }, delay);
    }
}

module.exports = {
    reminders,
    loadReminders,
    saveReminders,
    scheduleNextReminder,
    processReminders // Ekspor fungsi ini
};
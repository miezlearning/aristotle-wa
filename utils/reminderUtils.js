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

// Jadwalkan timeout untuk reminder terdekat
function scheduleNextReminder(sock) {
    // Cari semua reminder dari semua grup
    const allReminders = [];
    reminders.forEach((list) => allReminders.push(...list));

    if (allReminders.length === 0) return;

    // Cari reminder dengan timestamp terkecil
    const nextReminder = allReminders.reduce((prev, curr) => 
        prev.timestamp < curr.timestamp ? prev : curr
    );

    // Hitung delay sampai reminder terdekat
    const delay = nextReminder.timestamp - Date.now();

    if (delay < 0) {
        // Jika waktu sudah lewat, proses segera
        processReminders(sock);
    } else {
        // Hapus timeout sebelumnya (jika ada)
        if (nextTimeout) clearTimeout(nextTimeout);

        // Set timeout baru
        nextTimeout = setTimeout(() => {
            processReminders(sock);
            scheduleNextReminder(sock); // Jadwalkan berikutnya
        }, delay);
    }
}

module.exports = {
    reminders,
    loadReminders,
    saveReminders,
    sortReminders,
    scheduleNextReminder
};
const { default:  makeWASocket, DisconnectReason, useMultiFileAuthState, downloadContentFromMessage  } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const { loadCommands } = require('./utils/commandLoader');
const config = require('./config.json');
const cron = require('node-cron');
const moment = require('moment-timezone');
const { getAllUpcomingEvents, formatEventMessage } = require('./utils/calendar');
const { loadReminders, reminders, saveReminders, scheduleNextReminder, sortReminders } = require('./utils/reminderUtils');
const { loadScheduledMessages, processScheduledMessages } = require('./utils/scheduledMessageUtils'); // Import
const { getAutoResponsesForGroup } = require('./utils/autoResponseUtils'); // Import fungsi utility

require('dotenv').config();

let sock = null;
let nextReminderTimeout = null;
global.searchResults = {};


async function updateBotStatus(status) {
    if (!sock || sock.connectionState !== 'open') {
        console.log('Tidak dapat mengubah status: Koneksi tertutup.');
        return;
    }

    try {
        const statusMessage = status === 'online' 
            ? '🤖 🟢\r\n\r\n✨ Life\'s a remix. Sample the good parts, rewrite the bad.  Makacihh☺️' 
            : '🤖 🔴\r\n\r\n✨ Life\'s a remix. Sample the good parts, rewrite the bad.  Makacihh☺️';
        await sock.updateProfileStatus(statusMessage);
        console.log(`Status bot diubah menjadi: ${statusMessage}`);
    } catch (error) {
        console.error('Gagal mengubah status bot:', error);
    }
}

async function connectToWhatsApp() {
    await updateBotStatus('offline'); // Set status awal ke offline saat connectToWhatsApp dipanggil

    const { state, saveCreds } = await useMultiFileAuthState('auth_info', { legacy: true });

    const connection = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        logger: pino({ level: 'silent' })
    });

    // Memuat semua perintah
    const commands = await loadCommands();
    
    // Inisialisasi reminders
    loadReminders();
    sortReminders();

    let connectionState = 'disconnected';

    connection.ev.on('connection.update', async (update) => {
        const { connection: status, lastDisconnect } = update;
    
        if (status) {
            connectionState = status;
            connection.connectionState = status; // Update the connection state
        }
    
        if (status === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
    
            console.log('Koneksi terputus:', lastDisconnect.error);
    
            try {
                await updateBotStatus('offline');
            } catch (error) {
                console.error('Gagal update status saat disconnect:', error);
            }
    
            if (shouldReconnect) {
                console.log('Mencoba reconnect...');
                let retryCount = 0;
                const maxRetries = 5;
                const reconnect = async () => {
                    try {
                        sock = await connectToWhatsApp();
                        await updateBotStatus('online');
                        console.log('Reconnect berhasil!');
                    } catch (error) {
                        console.error(`Gagal reconnect (percobaan ${retryCount + 1}/${maxRetries}):`, error);
                        if (retryCount < maxRetries) {
                            retryCount++;
                            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff max 30 detik
                            console.log(`Menunggu ${delay}ms sebelum mencoba lagi...`);
                            setTimeout(reconnect, delay);
                        } else {
                            console.log('Reconnect gagal setelah maksimum percobaan.');
                        }
                    }
                };
                await reconnect();
            }
        } else if (status === 'open') {
            console.log('Bot berhasil terkoneksi!');
            sock = connection;
            await updateBotStatus('online');
            loadReminders();
            sortReminders();
            scheduleNextReminderCheck();
            loadScheduledMessages(); // Load scheduled messages
            setInterval(() => {
                processScheduledMessages(sock); // Process scheduled messages every minute
            }, 60000);
    
            // Tetap pertahankan cron untuk notifikasi kalender
            cron.schedule(config.cronSchedule, () => checkAndSendNotifications(sock), {
                scheduled: true,
                timezone: config.timezone
            });
        }
    });

    process.on('SIGINT', async () => {
        console.log('\nMematikan bot...');
        try {
            if (sock && sock.connectionState === 'open') {
                await updateBotStatus('offline');
            }
        } catch (error) {
            console.error('Gagal update status:', error);
        } finally {
            process.exit(0);
        }
    });
    
    // Handle error tidak tertangkap
    process.on('uncaughtException', async (error) => {
        console.error('Error tidak tertangkap:', error);
        try {
            if (sock && sock.connectionState === 'open') {
                await updateBotStatus('offline');
            }
        } catch (err) {
            console.error('Gagal update status:', err);
        } finally {
            process.exit(1);
        }
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
        console.error('Terjadi unhandled rejection:', reason);
        try {
            if (sock && sock.connectionState === 'open') {
                await updateBotStatus('offline');
            }
        } catch (error) {
            console.error('Gagal mengubah status bot:', error);
        } finally {
            process.exit(1);
        }
    });
    
    
    // Signal handling untuk SIGTERM
    process.on('SIGTERM', async () => {
        console.log('\nMenerima sinyal SIGTERM. Mematikan bot...');
        try {
            await updateBotStatus('offline'); // Ubah status menjadi offline
            console.log('Status bot diubah menjadi "Offline".');
        } catch (error) {
            console.error('Gagal mengubah status bot:', error);
        } finally {
            process.exit(0); // Keluar dari program
        }
    });
    
    
    
   

    connection.ev.on('creds.update', async (creds) => { // Modifikasi di sini
        await saveCreds();
        console.log('Kredensial diperbarui dan disimpan!');
    });

    connection.ev.on('messages.upsert', async ({ messages }) => {
        if(connectionState !== 'open') return;

        const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            // Ambil teks perintah dari berbagai sumber, termasuk caption gambar
            const text = (
                msg.message.conversation || 
                msg.message?.extendedTextMessage?.text || 
                msg.message?.imageMessage?.caption || 
                ''
            ).trim();
        // Auto-response logic (dipindahkan ke atas dan hanya dijalankan jika bukan command)
        if(!text.startsWith('!')) {
            const isGroup = msg.key.remoteJid.endsWith('@g.us');
            if (isGroup) {
                try {
                    const groupId = msg.key.remoteJid;
                    const autoResponses = await getAutoResponsesForGroup(groupId);

                    for (const autoResponse of autoResponses) {
                        if (text.toLowerCase().includes(autoResponse.trigger.toLowerCase())) {
                            // Proses mention dalam response
                            const responseText = autoResponse.response;
                            const mentions = [];
                            let processedResponseText = responseText;

                            // Regex untuk mencari mention (format: @nomorWA atau @nomorWA@s.whatsapp.net)
                            const mentionRegex = /@(\d+)(@s\.whatsapp\.net)?/g;
                            let match;

                            while ((match = mentionRegex.exec(responseText)) !== null) {
                                const phoneNumber = match[1];
                                const fullJid = `${phoneNumber}@s.whatsapp.net`;
                                mentions.push(fullJid);
                                // Ganti mention di teks dengan mention yang bisa di-parse WhatsApp (opsional)
                                processedResponseText = processedResponseText.replace(match[0], `@${phoneNumber}`);
                            }

                            await sock.sendMessage(msg.key.remoteJid, {
                                text: processedResponseText, // Gunakan processedResponseText atau responseText asli
                                mentions: mentions.length > 0 ? mentions : undefined, // Hanya kirim opsi mentions jika ada mention
                                quoted: msg // Tambahkan quoted message agar auto-response juga reply ke pesan user
                            });
                            console.log(`Auto-response terpicu untuk trigger: ${autoResponse.trigger} di grup: ${groupId} dengan mentions: ${mentions}`);
                            return; // Hentikan setelah menemukan trigger pertama dan merespons
                        }
                    }
                } catch (error) {
                    console.error('Error memproses auto-response:', error);
                }
            }
            return; // Keluar dari handler jika ini auto-response atau bukan grup
        }

        // Command processing logic (tetap sama, hanya dijalankan jika pesan adalah command)
        const isGroup = msg.key.remoteJid.endsWith('@g.us');

        // Validasi grup untuk command (tetap sama)
        if(isGroup && !config.allowedGroups.includes(msg.key.remoteJid)) {
            const isAdminCommand = ['getgroupid', 'allowgroup'].includes(text.slice(1).split(' ')[0]);
            const isAdmin = msg.key.participant === config.adminNumber + '@s.whatsapp.net';
            if(!isAdminCommand || !isAdmin) return;
        }

        // Eksekusi command (tetap sama)
        const args = text.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        try {
            const cmd = commands.get(command);
                cmd.client = sock;
            if(cmd) {
                console.log(`Eksekusi command: ${command}`);
                await cmd.execute(connection, msg, args);
            }
        } catch(error) {
            console.error('Error eksekusi command:', error);
            await connection.sendMessage(msg.key.remoteJid, {
                text: '❌ Gagal menjalankan perintah',
                quoted: msg // Tambahkan quoted message agar error reply ke pesan user
            });
        }
    });

    return connection;
}

function scheduleNextReminderCheck() {
    // Hapus timeout sebelumnya
    if(nextReminderTimeout) {
        clearTimeout(nextReminderTimeout);
        nextReminderTimeout = null;
    }

    // Cari reminder terdekat
    const allReminders = Array.from(reminders.values()).flat();
    if(allReminders.length === 0) return;

    const now = Date.now();
    const upcomingReminders = allReminders
        .filter(r => r.timestamp > now)
        .sort((a, b) => a.timestamp - b.timestamp);

    if(upcomingReminders.length === 0) return;

    const nextReminder = upcomingReminders[0];
    const delay = nextReminder.timestamp - now;

    console.log(`Reminder berikutnya dijadwalkan dalam ${delay}ms`);

    nextReminderTimeout = setTimeout(async () => {
        await processReminders();
        scheduleNextReminderCheck();
    }, delay);
}

async function processReminders() {
    console.log('Memproses reminders...');
    const now = Date.now();
    let needsSave = false;

    for(const [groupId, reminderList] of reminders.entries()) {
        const activeReminders = [];
        
        for(const reminder of reminderList) {
            if(now >= reminder.timestamp) {
                try {
                    // Kirim pesan
                    await sock.sendMessage(groupId, {
                        text: `⏰ Pengingat dari @${reminder.creator.split('@')[0]}:\n${reminder.message}`,
                        mentions: [reminder.creator, ...reminder.mentions]
                    });
                    console.log(`Reminder ${reminder.id} terkirim`);
                    needsSave = true;
                } catch(error) {
                    console.error(`Gagal mengirim reminder ${reminder.id}:`, error);
                    activeReminders.push(reminder);
                }
            } else {
                activeReminders.push(reminder);
            }
        }

        // Update daftar reminder
        if(activeReminders.length > 0) {
            reminders.set(groupId, activeReminders);
        } else {
            reminders.delete(groupId);
        }
    }

    if(needsSave) {
        saveReminders();
        sortReminders();
        console.log('Data JSON diperbarui');
    }
}

async function checkAndSendNotifications(sock) {
    try {
        const upcomingEvents = await getAllUpcomingEvents();
        const now = moment().tz(config.timezone);

        for(const event of upcomingEvents) {
            const timeUntilEvent = moment(event.start).diff(now, 'minutes');
            const notificationMinutesBefore = event.notificationMinutesBefore;

            if(timeUntilEvent <= notificationMinutesBefore && timeUntilEvent > 3) {
                const message = `🔔 Pengingat: Acara dari kalender *${event.calendarName}* akan segera dimulai!\n\n${formatEventMessage(event)}`;

                for(const groupId of event.allowedGroups) {
                    try {
                        await sock.sendMessage(groupId, { text: message });
                    } catch(error) {
                        console.error(`Gagal mengirim notifikasi ke grup ${groupId}:`, error);
                    }
                }
            }

            if(timeUntilEvent <= 3 && timeUntilEvent > 0) {
                const reminderMessage = `⏰ Acara dari kalender *${event.calendarName}* akan segera dimulai dalam ${timeUntilEvent} menit!\n\n${formatEventMessage(event)}`;

                for(const groupId of event.allowedGroups) {
                    try {
                        await sock.sendMessage(groupId, { text: reminderMessage });
                    } catch(error) {
                        console.error(`Gagal mengirim notifikasi ke grup ${groupId}:`, error);
                    }
                }
            }
        }
    } catch(error) {
        console.error('Error dalam checkAndSendNotifications:', error);
    }
}

// Fungsi utama
async function startBot() {
    try {
        await connectToWhatsApp();
        console.log('Bot berjalan!');
    } catch(error) {
        console.error('Gagal memulai bot:', error);
        process.exit(1);
    }
}

startBot();
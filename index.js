const { default:  makeWASocket, DisconnectReason, useMultiFileAuthState, downloadContentFromMessage  } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const { loadCommands } = require('./utils/commandLoader');
const config = require('./config.json');
const cron = require('node-cron');
const moment = require('moment-timezone');
const { getAllUpcomingEvents, formatEventMessage } = require('./utils/calendar');
const { loadReminders, reminders, saveReminders, scheduleNextReminder } = require('./utils/reminderUtils');
const { loadScheduledMessages, processScheduledMessages } = require('./utils/scheduledMessageUtils'); // Import
const { getAutoResponsesForGroup } = require('./utils/autoResponseUtils'); // Import fungsi utility
const levenshtein = require('fast-levenshtein'); // Install dengan: npm install fast-levenshtein
const { listManager } = require('./utils/listManager');

function findClosestCommand(input, commands) {
    let minDistance = Infinity;
    let closestCommand = null;
    
    for (const cmd of commands.keys()) {
        const distance = levenshtein.get(input, cmd);
        if (distance < minDistance) {
            minDistance = distance;
            closestCommand = cmd;
        }
    }
    
    return closestCommand;
}

require('dotenv').config();

let sock = null;
let nextReminderTimeout = null;
let cronJob = null;
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

    const { state, saveCreds } = await useMultiFileAuthState('auth_info', { legacy: true });

    const connection = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        logger: pino({ level: 'debug' }),
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        phoneResponseTimeMs: 60000,
        browser: ['Bot Aristotle', 'Chrome', '10.0'], // Use consistent browser signature
        syncFullHistory: false // Disable full history sync which can cause issues
    });


    // Memuat semua perintah
    const commands = await loadCommands();
    
    loadReminders();
    sortReminders();
    scheduleNextReminder(connection);

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
                console.log('Mencoba reconnect dalam 20 detik...'); // Pesan log diubah
                setTimeout(async () => { // Tetap menggunakan setTimeout
                    console.log('Melakukan reconnect...');
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
                                const delay = Math.min(2000 * Math.pow(2, retryCount), 30000) // Exponential backoff max 30 detik
                                console.log(`Menunggu ${delay}ms sebelum mencoba lagi...`);
                                setTimeout(reconnect, delay);
                            } else {
                                console.log('Reconnect gagal setelah maksimum percobaan.');
                            }
                        }
                    };
                    await reconnect();
                }, 20000); // Delay menjadi 20 detik (atau coba 30000 untuk 30 detik)
            }
        } else if (status === 'open') {
            console.log('Bot berhasil terkoneksi!');
            sock = connection;
            
            // Wait a moment to ensure connection is stable before changing status
            setTimeout(async () => {
                try {
                    await updateBotStatus('online');
                    console.log('Status berhasil diubah menjadi online');
                    
                    // Initialize other components only after status is set
                    loadReminders();
                    sortReminders();
                    scheduleNextReminder(sock);
                    loadScheduledMessages();
                    setInterval(() => processScheduledMessages(sock), 60000);
                    
                    // Update cron job
                    if (cronJob) {
                        cronJob.stop();
                    }
                    cronJob = cron.schedule(config.cronSchedule, () => checkAndSendNotifications(sock), {
                        scheduled: true,
                        timezone: config.timezone
                    });
                    console.log('Cron job diatur ulang dengan status koneksi open');
                } catch (error) {
                    console.error('Gagal mengatur komponen setelah koneksi:', error);
                }
            }, 5000);
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
            if (!msg.message) return;

            // Ambil teks perintah dari berbagai sumber, termasuk caption gambar
            const text = (
                msg.message.conversation || 
                msg.message?.extendedTextMessage?.text || 
                msg.message?.imageMessage?.caption || 
                msg.message?.videoMessage?.caption || 
                msg.message?.documentMessage?.caption || 
                msg.message?.audioMessage?.caption || 
                msg.message?.stickerMessage?.caption || 
                msg.message?.buttonsResponseMessage?.selectedButtonId || 
                msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId || 
                ''
            ).trim();
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
                                const nohp = match[1];
                                const fullJid = `${nohp}@s.whatsapp.net`;
                                mentions.push(fullJid);
                                // Ganti mention di teks dengan mention yang bisa di-parse WhatsApp (opsional)
                                processedResponseText = processedResponseText.replace(match[0], `@${nohp}`);
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
        // Eksekusi command (tetap sama)
const args = text.slice(1).trim().split(/ +/);
const command = args.shift().toLowerCase();

try {
    const cmd = commands.get(command);
    
    if (!cmd) {
        const suggestion = findClosestCommand(command, commands);
        let message = '❌ Perintah tidak ditemukan!';
        
        if (suggestion) {
            message += `\n🔍 Mungkin yang kamu maksud: *${suggestion}*`;
        }
        
        await connection.sendMessage(msg.key.remoteJid, { text: message, quoted: msg });
        return;
    }
    
    cmd.client = sock;
    console.log(`Eksekusi command: ${command}`);
    await cmd.execute(connection, msg, args);
    
} catch (error) {
    console.error('Error eksekusi command:', error);
    await connection.sendMessage(msg.key.remoteJid, {
        text: '❌ Gagal menjalankan perintah',
        quoted: msg
    });
}

    });

    return connection;
}

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

async function checkAndSendNotifications(sock) {
    try {
        const upcomingEvents = await getAllUpcomingEvents();
        console.log("Upcoming Events:", upcomingEvents);
        const now = moment().tz(config.timezone);

        for (const event of upcomingEvents) {
            const timeUntilEvent = moment(event.start).diff(now, 'minutes');
            const notificationMinutesBefore = event.notificationMinutesBefore;

            if (timeUntilEvent <= notificationMinutesBefore && timeUntilEvent > 3) {
                const message = `🔔 Pengingat: Acara dari kalender *${event.calendarName}* akan segera dimulai!\n\n${formatEventMessage(event)}`;

                for (const groupId of event.allowedGroups) {
                    try {
                        await sock.sendMessage(groupId, { text: message });
                    } catch (error) {
                        console.error(`Gagal mengirim notifikasi ke grup ${groupId}:`, error);
                    }
                }
            }

            if (timeUntilEvent <= 3 && timeUntilEvent > 0) {
                const reminderMessage = `⏰ Acara dari kalender *${event.calendarName}* akan segera dimulai dalam ${timeUntilEvent} menit!\n\n${formatEventMessage(event)}`;

                for (const groupId of event.allowedGroups) {
                    try {
                        await sock.sendMessage(groupId, { text: reminderMessage });
                    } catch (error) {
                        console.error(`Gagal mengirim notifikasi ke grup ${groupId}:`, error);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error dalam checkAndSendNotifications:', error);
    }
}

// Fungsi utama
async function startBot() {
    try {
        sock = await connectToWhatsApp();
        console.log('Bot berjalan!');
        
        // Wait for connection to be fully open
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkConnection = () => {
            return new Promise((resolve) => {
                const interval = setInterval(() => {
                    attempts++;
                    console.log(`Memeriksa koneksi... (${attempts}/${maxAttempts})`);
                    
                    if (sock && sock.connectionState === 'open') {
                        clearInterval(interval);
                        console.log('Koneksi terbuka sepenuhnya!');
                        resolve(true);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        console.log('Gagal menunggu koneksi terbuka setelah beberapa percobaan.');
                        resolve(false);
                    }
                }, 5000); // Check every 5 seconds
            });
        };
        
        const isConnected = await checkConnection();
        if (isConnected) {
            checkAndSendNotifications(sock);
            if (listManager && typeof listManager.checkExpiredLists === 'function') {
                console.log('listManager initialized successfully:', listManager);
                setInterval(() => {
                    try {
                        listManager.checkExpiredLists();
                        console.log('Checked expired lists');
                    } catch (err) {
                        console.error('Error in checkExpiredLists:', err);
                    }
                }, 60 * 60 * 1000); // Runs every hour
            } else {
                console.error('listManager is not properly initialized or missing checkExpiredLists');
            }
        }
    } catch(error) {
        console.error('Gagal memulai bot:', error);
        process.exit(1);
    }
}

cronJob = cron.schedule(config.cronSchedule, () => {
    if (sock && sock.connectionState === 'open') {
        console.log("Cron triggered at:", moment().tz(config.timezone).format());
        checkAndSendNotifications(sock);
    } else {
        console.log("Cron skipped: Sock not open");
    }
}, {
    scheduled: true,
    timezone: config.timezone
});

startBot()
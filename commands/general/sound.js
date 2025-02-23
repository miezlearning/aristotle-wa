const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const baseURL = 'https://myinstants-api.vercel.app';

// Helper function to send messages
async function sendMessage(sock, remoteJid, message) {
    await sock.sendMessage(remoteJid, { text: message });
}

// List of offensive terms (you should expand this list)
const offensiveTerms = ['dwiki'];

// Function to check if a string contains any offensive terms
function containsOffensiveTerms(text) {
    const lowerCaseText = text.toLowerCase();
    for (const term of offensiveTerms) {
        if (lowerCaseText.includes(term)) {
            return true;
        }
    }
    return false;
}

// Command handler object
const soundCommands = {

    search: async (sock, msg, args) => {
        if (args.length === 0) {
            return sendMessage(sock, msg.key.remoteJid, 'Mohon masukkan kata kunci pencarian. Contoh: !sound search laugh');
        }

        const query = args.join(' '); // Gabungkan argumen untuk pencarian multi-kata
        const url = `${baseURL}/search?q=${encodeURIComponent(query)}`; // Encode the query

        try {
            const response = await axios.get(url);
          let results = response.data.data || response.data; // Access the 'data' array within the response

          if (!Array.isArray(results)) {
              // If 'results' is not an array, make it an empty array
              results = [];
          }
             const validResults = results.filter(sound => sound && sound.title && sound.mp3);

            if (validResults.length === 0) {
                return sendMessage(sock, msg.key.remoteJid, `Tidak ada suara yang ditemukan untuk kata kunci "${query}".`);
            }

            // Check if the search term or any of the sound titles contain offensive terms
            if (containsOffensiveTerms(query)) {
                return sendMessage(sock, msg.key.remoteJid, '❌ Pencarian mengandung istilah sensitif.');
            }

            // Build a numbered list of search results
            let message = `Hasil pencarian untuk "${query}":\n`;
            for (let i = 0; i < validResults.length; i++) {
                const sound = validResults[i];
                message += `${i + 1}. ${sound.title}\n`;
            }
            message += `\nKetik !sound play [nomor] untuk memutar suara tersebut. Contoh: !sound play 1`;

            // Send the list of results to the user
            await sendMessage(sock, msg.key.remoteJid, message);

            // Store the results for later use by the 'play' command (you'll need a way to associate these results with the user)
            // **IMPORTANT**: This is a simplified example. In a real bot, you would need a more robust way to store and retrieve the results,
            // perhaps using a database or a session management system.
           global.searchResults[msg.key.remoteJid] = validResults;

        } catch (error) {
            console.error('Error searching sounds:', error);
            await sendMessage(sock, msg.key.remoteJid, '❌ Gagal mencari suara. Terjadi kesalahan.');
        }
    },
  play: async (sock, msg, args) => {
        if (args.length === 0) {
            return sendMessage(sock, msg.key.remoteJid, 'Mohon masukkan nomor suara yang ingin diputar. Contoh: !sound play 1');
        }

        const soundNumber = parseInt(args[0]);
        if (isNaN(soundNumber) || soundNumber < 1) {
            return sendMessage(sock, msg.key.remoteJid, 'Nomor suara tidak valid.');
        }

        // Retrieve the stored search results for this user
        const results = global.searchResults[msg.key.remoteJid];
        if (!results || results.length===0) {
            return sendMessage(sock, msg.key.remoteJid, 'Mohon lakukan pencarian terlebih dahulu menggunakan !sound search [kata kunci].');
        }

        if (soundNumber > results.length) {
            return sendMessage(sock, msg.key.remoteJid, 'Nomor suara tidak valid (melebihi jumlah hasil).');
        }

        const sound = results[soundNumber - 1]; // Adjust for 0-based indexing
         if (!sound) {
            return sendMessage(sock, msg.key.remoteJid, '❌ Suara tidak ditemukan.');
        }

        // Check if the sound title contains offensive terms
        if (containsOffensiveTerms(sound.title)) {
            return sendMessage(sock, msg.key.remoteJid, '❌ Suara yang dipilih mengandung istilah sensitif.');
        }

        // Download the audio file
        try {
            const audioURL = sound.mp3; // Use data.mp3, not data.url

            const tempDir = os.tmpdir();
            const filename = `sound_${sound.id}.mp3`;
            const filepath = path.join(tempDir, filename);

            const audioResponse = await axios({
                method: 'GET',
                url: audioURL,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(filepath);
            audioResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Send the audio file
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    audio: { url: filepath }, // use the local file path
                    mimetype: 'audio/mpeg'
                });
            } catch (sendError) {
                console.error('Error sending audio:', sendError);
                await sendMessage(sock, msg.key.remoteJid, '❌ Gagal mengirim suara sebagai audio.  Terjadi kesalahan saat mengirim.');
            } finally {
                // Delete the temporary file after sending
                fs.unlink(filepath, (err) => {
                    if (err) {
                        console.error('Error deleting temporary audio file:', err);
                    }
                });
            }
        } catch (downloadError) {
            console.error('Error downloading audio:', downloadError);
            await sendMessage(sock, msg.key.remoteJid, '❌ Gagal mengunduh suara. Terjadi kesalahan saat mengunduh.');
        }
    }
};

module.exports = {
    name: 'sound',
    alias: [],
    category: 'general',
    description: 'Berbagai perintah untuk mencari dan mendapatkan suara dari API.',
    usage: '!sound [search] [kata kunci]',
    permission: 'user',
    async execute(sock, msg, args) {
        if (args.length < 1 ) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: 'Perintah tidak valid. Gunakan !sound [search] [kata kunci] atau !sound play [nomer]'
            });
        }
            const command = args[0].toLowerCase();
            const commandArgs = args.slice(1);

        // Only execute the commands
        if (soundCommands[command]) {
           await soundCommands[command](sock, msg, commandArgs);
        }
        else {
               return await sock.sendMessage(msg.key.remoteJid, {
                   text: 'Tidak ada command'
               });
           }
    }
};
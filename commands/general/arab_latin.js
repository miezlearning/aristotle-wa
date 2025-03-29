const fs = require('fs');

// Kamus transliterasi Arab ke Latin (disesuaikan dengan pelafalan Indonesia)
const transliterationDict = {
    'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'ts', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
    'د': 'd', 'ذ': 'dz', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sy', 'ص': 's',
    'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': '‘', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
    'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
    'ة': 'h', 'ء': "'", 'آ': 'a', 'ى': 'a',
    // Harakat (vokal pendek)
    'َ': 'a', 'ِ': 'i', 'ُ': 'u', 'ْ': '', 'ّ': '', // Sukun dan tasydid
    // Tanwin (vokal panjang)
    'ً': 'an', 'ٍ': 'in', 'ٌ': 'un'
};

// Fungsi untuk mengkonversi teks Arab ke Latin
const arabicToLatin = (arabicText) => {
    let result = '';
    let i = 0;

    while (i < arabicText.length) {
        const char = arabicText[i];

        if (transliterationDict[char]) {
            // Cek tasydid (dobel konsonan)
            if (i + 1 < arabicText.length && arabicText[i + 1] === 'ّ') {
                result += transliterationDict[char] + transliterationDict[char];
                i += 2;
            }
            // Cek harakat atau tanwin
            else if (i + 1 < arabicText.length && ['َ', 'ِ', 'ُ', 'ً', 'ٍ', 'ٌ'].includes(arabicText[i + 1])) {
                result += transliterationDict[char] + transliterationDict[arabicText[i + 1]];
                i += 2;
            }
            // Cek sukun (tanpa vokal)
            else if (i + 1 < arabicText.length && arabicText[i + 1] === 'ْ') {
                result += transliterationDict[char];
                i += 2;
            }
            else {
                result += transliterationDict[char];
                i += 1;
            }
        } else {
            result += char; // Biarkan karakter non-Arab (spasi, tanda baca)
            i += 1;
        }
    }

    // Post-processing untuk pelafalan natural
    result = result.replace(/‘a/g, 'a').replace(/‘i/g, 'i').replace(/‘u/g, 'u');
    return result;
};

module.exports = {
    name: 'arab_latin',
    category: 'utility',
    description: 'Mengkonversi teks Arab ke huruf Latin dengan pelafalan Indonesia.',
    usage: '!arab_latin <teks>',
    permission: 'member',
    async execute(sock, msg, args) {
        const senderName = msg.pushName || 'Seseorang'; // Nama pengirim

        // Cek apakah ada teks yang diberikan
        if (!args.length) {
            const errorMessage = `❌ *${senderName}*, silakan masukkan teks Arab setelah command!\nContoh: *!arab_latin سَالَ دَمْعِي شَوْقًا*`;
            return await sock.sendMessage(msg.key.remoteJid, { text: errorMessage }, { quoted: msg });
        }

        // Gabungkan semua argumen menjadi satu string
        const arabicText = args.join(' ');
        const latinText = arabicToLatin(arabicText);

        // Buat pesan hasil
        const resultMessage = `📝 *Hasil Konversi*\n\n` +
                             `Teks Arab: ${arabicText}\n` +
                             `Latin (Pelafalan Indonesia): ${latinText}\n\n` +
                             `Dikonversi oleh: *${senderName}*`;

        // Kirim pesan balasan
        await sock.sendMessage(msg.key.remoteJid, { text: resultMessage }, { quoted: msg });
    }
};
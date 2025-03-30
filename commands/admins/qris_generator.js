const { createCanvas, loadImage } = require('canvas');
const jsQR = require('jsqr');
const QRCode = require('qrcode');

module.exports = {
    name: 'qris_generator',
    alias: ['qris', 'buatqris'],
    category: 'utility',
    description: 'Generate dynamic QRIS dari static QRIS image',
    usage: '!qris_generator <nominal> <fee_option> [fee_amount]',
    permission: 'everyone',
    async execute(sock, msg, args) {
        try {
            // Cek apakah pesan berisi gambar
            if (!msg.message.imageMessage) {
                await sock.sendMessage(msg.key.remoteJid, { text: 'Harap kirim gambar QRIS statis dengan perintah ini.' });
                return;
            }

            // Validasi jumlah argumen
            if (args.length < 2) {
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: 'Penggunaan: !qris_generator <nominal> <fee_option> [fee_amount]\nContoh: !qris_generator 10000 no' 
                });
                return;
            }

            // Ambil parameter dari args
            const nominal = args[0];
            const feeOption = args[1];
            let feeAmount;
            if (feeOption !== 'no') {
                if (args.length < 3) {
                    await sock.sendMessage(msg.key.remoteJid, { 
                        text: `Harap masukkan fee_amount untuk opsi ${feeOption}. Contoh: !qris_generator 10000 ${feeOption} 5` 
                    });
                    return;
                }
                feeAmount = args[2];
            }

            // Validasi input
            if (isNaN(Number(nominal))) {
                await sock.sendMessage(msg.key.remoteJid, { text: 'Nominal harus berupa angka.' });
                return;
            }
            if (!['no', 'percent', 'rupiah'].includes(feeOption)) {
                await sock.sendMessage(msg.key.remoteJid, { text: 'Fee option harus no, percent, atau rupiah.' });
                return;
            }
            if (feeOption !== 'no' && isNaN(Number(feeAmount))) {
                await sock.sendMessage(msg.key.remoteJid, { text: 'Fee amount harus berupa angka.' });
                return;
            }

            // Unduh gambar QRIS statis
            const buffer = await sock.downloadMediaMessage(msg);

            // Muat gambar ke canvas
            const img = await loadImage(buffer);
            const canvas = createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Ekstrak data QRIS
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCodeData = jsQR(imageData.data, imageData.width, imageData.height);
            if (!qrCodeData) {
                await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal membaca data QRIS dari gambar.' });
                return;
            }
            const qrisData = qrCodeData.data;

            // Konversi ke QRIS dinamis
            const dynamicQRIS = convertQRIS(qrisData, nominal, feeOption, feeAmount);

            // Buat gambar QRIS dinamis
            const qrBuffer = await QRCode.toBuffer(dynamicQRIS);

            // Hitung total
            let total = Number(nominal);
            let feeText = '';
            if (feeOption === 'percent') {
                const fee = total * (Number(feeAmount) / 100);
                total += fee;
                feeText = `${feeAmount}% (Rp ${fee.toLocaleString('id-ID')})`;
            } else if (feeOption === 'rupiah') {
                total += Number(feeAmount);
                feeText = `Rp ${Number(feeAmount).toLocaleString('id-ID')}`;
            }

            // Buat caption
            let caption = `*QRIS Dinamis untuk Pembayaran*\n\n`;
            caption += `Nominal: Rp ${Number(nominal).toLocaleString('id-ID')}\n`;
            if (feeOption !== 'no') {
                caption += `Fee: ${feeText}\n`;
            }
            caption += `Total: Rp ${total.toLocaleString('id-ID')}`;

            // Kirim gambar QRIS dinamis dengan caption
            await sock.sendMessage(msg.key.remoteJid, {
                image: qrBuffer,
                caption: caption
            });

        } catch (error) {
            console.error('Error di qris_generator:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: 'Terjadi kesalahan saat membuat QRIS dinamis.' });
        }
    }
};

// Fungsi untuk mengonversi QRIS statis ke dinamis
function convertQRIS(qris, nominal, feeOption, feeAmount) {
    let tax = '';
    if (feeOption === 'rupiah') {
        tax = '55020256' + String(feeAmount.length).padStart(2, '0') + feeAmount;
    } else if (feeOption === 'percent') {
        tax = '55020357' + String(feeAmount.length).padStart(2, '0') + feeAmount;
    }

    qris = qris.substring(0, qris.length - 4);
    const step1 = qris.replace('010211', '010212');
    const step2 = step1.split('5802ID');
    let uang = '54' + String(nominal.length).padStart(2, '0') + nominal;

    if (!tax) {
        uang += '5802ID';
    } else {
        uang += tax + '5802ID';
    }

    const fix = step2[0] + uang + step2[1];
    const crc = ConvertCRC16(fix);
    return fix + crc;
}

// Fungsi untuk menghitung CRC16
function ConvertCRC16(str) {
    function charCodeAt(str, i) {
        return str.charCodeAt(i);
    }
    let crc = 0xffff;
    const strlen = str.length;
    for (let c = 0; c < strlen; c++) {
        crc ^= charCodeAt(str, c) << 8;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
    }
    let hex = (crc & 0xffff).toString(16).toUpperCase();
    if (hex.length === 3) hex = '0' + hex;
    return hex;
}
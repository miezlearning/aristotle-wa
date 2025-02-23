module.exports = {
    name: 'pilih',
    alias: [],
    category: 'general',
    description: 'Menampilkan daftar pilihan dan membalas sesuai pilihan user.',
    usage: '!pilih',
    permission: 'user',
    async execute(sock, msg, args) {
        const options = [
            'Malka',
            'Bambang',
            'Septian',
            'Joko'
        ];

        let message = 'Silakan pilih salah satu:\n';
        for (let i = 0; i < options.length; i++) {
            message += `${i + 1}. ${options[i]}\n`;
        }
        message += '\nBalas dengan nomor pilihan Anda. Contoh: 1';

        await sock.sendMessage(msg.key.remoteJid, { text: message });
    }
};
module.exports = {
    name: 'help',
    category: 'general',
    alias: ['commands','bantuan'],
    description: 'Menampilkan daftar perintah atau informasi detail perintah tertentu',
    usage: '!help [nama_perintah]',
    permission: 'user',
    async execute(sock, msg, args) {
        const { loadCommands } = require('../../utils/commandLoader');
        const commands = await loadCommands();

        if (args.length > 0) {
            // Menampilkan bantuan untuk perintah spesifik
            const commandName = args[0].toLowerCase();
            const command = commands.get(commandName);

            if (!command) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: `❌ Perintah "${commandName}" tidak ditemukan.`
                });
            }

            let helpText = `*Detail Perintah: ${command.name}*\n\n` +
                `📝 Deskripsi: ${command.description || 'Tidak ada deskripsi tersedia'}\n` +
                `📚 Kategori: ${command.category || 'Tidak ada kategori'}\n` +
                `🔧 Penggunaan: ${command.usage || 'Tidak ada penggunaan yang ditentukan'}\n` +
                `👥 Izin: ${command.permission || 'Tidak ada izin yang ditentukan'}`;

            // Tambahkan alias jika ada
            if (command.alias && command.alias.length > 0) {
                helpText += `\n🔄 Alias: ${command.alias.map(alias => `\`!${alias}\``).join(', ')}`;
            }

            await sock.sendMessage(msg.key.remoteJid, { text: helpText });
        } else {
            // Menampilkan semua perintah berdasarkan kategori
            const categories = new Map();
            const processedCommands = new Set(); // Untuk mencegah duplikasi alias

            for (const [name, command] of commands) {
                // Skip if this command is an alias or has been processed
                if (processedCommands.has(command.name)) continue;
                processedCommands.add(command.name);

                const category = command.category || 'Lainnya';
                if (!categories.has(category)) {
                    categories.set(category, []);
                }
                categories.get(category).push(command);
            }

            let helpText = '*📚 Daftar Perintah Bot*\n\n';

            for (const [category, commandList] of categories) {
                helpText += `*${category.toUpperCase()}*\n`;
                commandList.forEach(command => {
                    const description = command.description || 'Tidak ada deskripsi';
                    let commandText = `• \`!${command.name}\``;
                    
                    // Tambahkan indikator alias jika command memiliki alias
                    if (command.alias && command.alias.length > 0) {
                        if (Array.isArray(command.alias)) {
                            commandText += ` (alias: ${command.alias.map(a => `\`!${a}\``).join(', ')})`;
                        }
                    }
                    
                    helpText += `${commandText}: ${description}\n`;
                });
                helpText += '\n';
            }

            helpText += 'Untuk informasi detail, ketik: `!help <nama_perintah>`';

            await sock.sendMessage(msg.key.remoteJid, { text: helpText });
        }
    }
};
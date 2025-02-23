const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

async function loadCommands() {
    const commands = new Map();
    const commandFolders = fs.readdirSync(path.join(__dirname, "../commands"));

    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(path.join(__dirname, `../commands/${folder}`))
            .filter(file => file.endsWith(".js") || file.endsWith(".cjs"));

        for (const file of commandFiles) {
            const filePath = path.join(__dirname, `../commands/${folder}/${file}`);
            
            let command;
            if (file.endsWith(".js")) {
                command = (await import(pathToFileURL(filePath).href)).default;
            } else {
                command = require(filePath);
            }

            if (command && command.name) {
                // Add the main command
                commands.set(command.name, command);
                
                // If alias exist, add them too
                if (command.alias && Array.isArray(command.alias)) {
                    for (const alias of command.alias) {
                        commands.set(alias, command);
                    }
                }
            }
        }
    }

    return commands;
}

module.exports = { loadCommands };
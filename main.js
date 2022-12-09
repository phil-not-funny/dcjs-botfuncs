const fs = require("fs");
const Discord = require("discord.js");
const { REST } = require("@discordjs/rest");

let config = {};
let latestConfigFile;

let commands = new Map();
let cachedCommands = new Map();

class Botfuncs {
  servers = [];
  latestServersFile;

  // * SERVERS

  /**
   * Initializes, verifies and loads the servers/guilds and other functions
   * @param {String} serversFile The path to the stored servers
   */
  initServers(serversFile) {
    this.latestServersFile = serversFile;
    if (fs.existsSync(serversFile)) {
      try {
        this.servers = JSON.parse(
          fs.readFileSync(serversFile, "utf-8") || "[]"
        );
      } catch (error) {
        console.log(
          "A JSON parsing error occured in " + this.latestServersFile
        );
        console.log("-----STACKTRACE-----");
        console.log(error);
      }
    } else {
      fs.writeFile(serversFile, JSON.stringify(this.servers), () => {});
    }
  }

  /**
   * Saves/Stores the servers to the given file
   * @param {String} serversFile The path to the stored servers
   * @returns {Boolean} whether the operation was successfull
   */
  saveServers(serversFile = this.latestServersFile) {
    if (fs.existsSync(serversFile)) {
      fs.writeFileSync(serversFile, JSON.stringify(this.servers));
      return true;
    }
    return false;
  }

  /**
   * Adds a server to the system (best used in param "onMsg" in the function onMessage)
   * @param {Discord.Guild} guild The server (message.guild)
   * @param {Boolean} nosave whether the servers should not be instantly saved
   * @param {Object} options custom props for the object
   */
  addServer(guild, nosave = false, options) {
    if (!this.getServer(guild.id)) {
      if (!options)
        this.servers.push({
          id: guild.id,
          name: guild.name,
          prefix: config?.prefix,
          other: {
            memberCount: guild.memberCount,
            partnered: guild.partnered,
          },
        });
      else this.servers.push(options);
      if (!nosave) this.saveServers(this.latestServersFile);
    }
  }

  /**
   * Gets the Server from the guildId
   * @param {String | Number} guildId the discord guild id (server identifier)
   * @returns The guild or an empty object
   */
  getServer(guildId) {
    let foundserver;
    this.servers.forEach((server) => {
      if (server.id === guildId) foundserver = server;
    });
    return foundserver;
  }

  /**
   * validates, fixes and updates server props
   * @param {Discord.Client | undefined} client to load the client cache
   */
  validateServers(client = null) {
    this.servers.forEach((server) => {
      if (server.id) {
        if (client) {
          let guild = client.guilds.cache.get(server.id);
          if (guild && server.name !== guild.name) server.name = guild.name;
        }
        if (!server.prefix) server.prefix = "§";
        if (!server.other) server.other = {};
      }
    });
  }

  getServers() {
    return this.servers;
  }

  /**
   * Clears the ENTIRE server storage
   */
  clearServerStorage() {
    if (fs.existsSync(this.latestServersFile)) {
      fs.writeFile(this.latestServersFile, "[]", () => {});
    }
  }

  /**
   *sets a specific server prop
   *
   * @param {String | Number} guildId the discord guild id (server identifier)
   * @param {String} prop the prop
   * @param {any} newValue new prop value
   *
   * @returns {Boolean} whether the operation was successfull or not.
   */
  setServerProp(guildId, prop, newValue) {
    let server = this.getServer(guildId);

    let posInArray = this.servers.indexOf(server);
    Object.defineProperty(server, prop, {
      value: newValue,
      writable: true,
      enumerable: true,
    });

    this.servers[posInArray] = server;
    return this.saveServers(this.latestServersFile);
  }

  /**
   * gets a specific server prop
   *
   * @param {String | Number} guildId the discord guild id (server identifier)
   * @param {String} prop The prop to get
   * @returns The value of the prop
   */
  getServerProp(guildId, prop) {
    let server = this.getServer(guildId);
    if (!server) return;
    let value;
    Object.entries(server).forEach((entry) => {
      if (entry[0] === prop) value = entry[1];
    });
    return value;
  }

  // * CONFIG

  /**
   * Sets the bot's config
   * @param {String} configFile Path to your config file
   */
  setBotConfig(configFile) {
    if (!configFile || !fs.existsSync(configFile)) return;
    latestConfigFile = configFile;
    try {
      config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
    } catch (error) {
      console.log("A JSON parsing error occured in " + latestConfigFile);
    }
  }

  /**
   * gets the bot config
   * @returns The bot config
   */
  getBotConfig(prop) {
    let conf;
    Object.entries(config).forEach((entry) => {
      if (entry[0] === prop) conf = entry[1];
    });
    return conf;
  }

  // * MESSAGE

  /**
   * gets the args of the message (without command!)
   * @param {String} message the message
   * @returns {Array<String>} returns the args
   */
  getMessageArgs(message) {
    let args = message.content
      .slice(this.getBotConfig("prefix").length)
      .trim()
      .split(/ +/g);
    args.shift();
    return args;
  }

  /**
   * returns the command of the message (only command!)
   * @param {String} message the message
   * @returns returns the command
   */
  getMessageCommand(message) {
    return message.content
      .slice(this.getBotConfig("prefix").length)
      .trim()
      .split(/ +/g)[0]
      .toLowerCase();
  }

  /**
   * Ignores messages from unwated users and makes writing commands cleaner when using the param onMsg
   * @param {Discord.Message} message the message
   * @param {Function} onMsg the code to execute for the not excluded. Use the function with these args: (command, args, author, guildId) => {}
   * @param {Function} onRefuse OPTIONAL: the code to execude for the unwanted. (also optional:) Use function with these args: (attemptedCommand, usedPrefix, author, guildId)
   *
   * @typedef {Object} Filter
   * @property {Boolean} filter.wrongPrefix whether people who use the wrong prefix should be ignored (default = true)
   * @property {Array<String>} filter.commands when defined, will ignore every message with an unknown command (default = none)
   *
   * @param {Filter | undefined} filter  filter of the command-refuse (still in work)
   */
  onMessage(message, onMsg, onRefuse, filter) {
    if (message.author.bot) return;
    if (
      (!filter || filter?.wrongPrefix === true) &&
      !(
        message.content.startsWith(this.getBotConfig("prefix")) ||
        message.content.startsWith(
          this.getServerProp(message.guildId, "prefix")
        )
      )
    )
      return onRefuse?.call?.(
        this,
        this.getMessageCommand(message),
        message.content.charAt(0),
        message.author,
        message.guildId
      );

    if (filter?.commands) {
      let found = false;
      filter.commands.forEach((cmd) => {
        if (cmd === this.getMessageCommand(message)) found = true;
      });
      if (!found)
        return onRefuse?.call?.(
          this,
          this.getMessageCommand(message),
          message.content.charAt(0),
          message.author,
          message.guildId
        );
    }
    // command, args, author, guildId, prefix
    onMsg.call(
      this,
      this.getMessageCommand(message),
      this.getMessageArgs(message),
      message.author,
      message.guildId,
      message.content.charAt(0)
    );
  }

  /**
   * Completely automates message handling. Call this method in messageCreate event.
   * it will only execute the right onExecute function to the right command. (setGlobalCommands need to be set!)
   * Anything else will be ignored without a function.
   */
  onMessageAuto(message) {
    if (!commands.length) return;
    commands.forEach((cmd) => {
      try {
        if (this.getMessageCommand(message) === cmd)
          return cmd.onExecute.call(
            this,
            this.getMessageArgs(message),
            author,
            guildId
          );
      } catch (error) {
        console.error(
          "You have not defined an onExecute for the command '" +
            this.getMessageCommand(message) +
            "'!"
        );
      }
    });
  }

  // * INTERACTIONS

  /**
   * PUTS the global commands (set by addGlobalCommand or globalCommandDir)
   * @param {Number} clientId ClientID
   * @param {REST} rest AN instance od discordjs/REST
   */
  async putGlobalCommandsToAPI(clientId, rest) {
    let formattedCommands = [];
    this.getCommands().forEach((cmd) => {
      if (cmd.private) return;
      if (!cmd.name || !cmd.description)
        console.error(`The command ${cmd.name} has no description set!`);
      else {
        let builder = new Discord.SlashCommandBuilder()
          .setName(cmd.name.toLowerCase())
          .setDescription(cmd.description);
        if (cmd.args) {
          cmd.args.forEach((arg) => {
            let argsLambda = (option) => {
              option
                .setName(arg.name)
                .setDescription(arg.description)
                .setRequired(arg.required || false);
              if (arg.choices) {
                arg.choices.forEach((choice) => {
                  option.addChoices({ name: choice, value: choice });
                });
              }
              return option;
            };
            if (!arg.type || arg.type === 3)
              builder.addStringOption(argsLambda);
            else if (arg.type === 4) builder.addIntegerOption(argsLambda);
            else if (arg.type === 6) builder.addUserOption(argsLambda);
          });
        }
        formattedCommands.push(builder.toJSON());
      }
    });
    await rest
      .put(Discord.Routes.applicationCommands(clientId), {
        body: formattedCommands,
      })
      .catch((err) => {
        console.log("An error occured inside putGlobalCommandsToAPI():");
        console.error(err);
      });
  }

  /**
   * Clears all commands registered in the Discord API
   * @param {Number} clientId ClientID
   * @param {REST} rest An instance of discordjs/REST
   */
  async clearGlobalCommandsInAPI(clientId, rest) {
    await rest
      .get(Discord.Routes.applicationCommands(clientId))
      .then((data) => {
        for (const command of data) {
          const deleteUrl = `${Routes.applicationCommands(clientId)}/${
            command.id
          }`;
          rest.delete(deleteUrl);
        }
      })
      .catch((err) => {
        console.log("An error occured inside clearGlobalCommandsInAPI():");
        console.error(err);
      });
  }

  /**
   *
   * @param {Number} clientId ClientID
   * @param {REST} rest An instance od discordjs/REST
   */
  async getGlobalCommandsFromAPI(clientId, rest) {
    let apiCommands = [];
    await rest
      .get(Discord.Routes.applicationCommands(clientId))
      .then((data) => {
        for (const command of data) {
          apiCommands.push(command);
        }
      })
      .catch((err) => {
        console.log("An error occured inside getGlobalCommandsFromAPI():");
        console.error(err);
      });
  }

  /**
   *
   * @param {Discord.Interaction} interaction the interaction
   * @param {Function} onInt a function to execute on interaction
   */
  onInteraction(interaction, onInt) {
    if (!interaction.isCommand()) return false;
    return onInt.call(
      this,
      interaction.commandName,
      interaction.options,
      interaction.user,
      interaction.guildId,
      interaction.member
    );
  }

  /**
   * executes a command, identified by its name
   * @param {String} name The name of the command
   * @param {String | Number} guildId OPTIONAL: The guild if it is a guildCommand
   * @param  {...any} params the parameters for the execute function
   */
  execInteractionCommand(name, guildId, ...params) {
    const cmd = this.getCommands(guildId)?.get(name);
    return cmd.interact.call(this, ...params);
  }

  // * COMMANDS

  /**
   * sets the global commands via an object
   *
   * @typedef Command
   * @property {String} name the name of the command
   * @property {String} description the command description
   * @property {String} pattern the command pattern (e.g: ping <number> <user> [direct|channel] <time>)
   * @property {Function} execute the function to be performed when the command is executed (e.g: (message) => message.reply("Pong!"))
   *
   * @param {Set<Command>} globalCommands the object-array of commands. Object should have the properties name, description, pattern, onExecute.
   */
  setGlobalCommands(globalCommands) {
    cachedCommands.set(globalCommands.name, globalCommands);
    commands = globalCommands;
  }

  /**
   * When you want to have some or every command in a seperate .js file, give them into one dir.
   * Each seperate command file should have **module.exports** set to an object with the properties name, description and execute.
   * See also: Example of seperate command files
   * @param {String} directory The path of the command directory
   */
  setGlobalCommandDir(directory) {
    const commandFiles = fs
      .readdirSync(directory)
      .filter((file) => file.endsWith(".js"));

    commandFiles.forEach((file) => {
      const cmd = require(directory + "/" + file);

      commands.set(cmd.name, cmd);
      cachedCommands.set(cmd.name, cmd);
    });
  }

  /**
   * adds a global command0 via an object
   *
   * @typedef Command
   * @property {String} name the name of the command
   * @property {String} description the command description
   * @property {String} pattern the command pattern (e.g: ping <number> <user> [direct|channel] <time>)
   * @property {Function} execute the function to be performed when the command is executed (e.g: (message) => message.reply("Pong!"))
   *
   * @param {Command} globalCommand the command. Object should have the properties name, description, pattern, onExecute.
   */
  addGlobalCommand(globalCommand) {
    cachedCommands.set(globalCommand.name, globalCommand);
    commands.set(globalCommand.name, globalCommand);
  }

  /**
   * adds a guild command via an object
   *
   * @typedef Command
   * @property {String} name the name of the command
   * @property {String} description the command description
   * @property {String} pattern the command pattern (e.g: ping <number> <user> [direct|channel] <time>)
   * @property {Function} execute the function to be performed when the command is executed (e.g: (message) => message.reply("Pong!"))
   *
   * @param {String | Number} guildId the discord guild id (server identifier)
   * @param {Command} guildCommand the guild command. Object should have the properties name, description, pattern, onExecute.
   * @returns {Boolean} whether the operation was successfull
   */
  addGuildCommand(guildCommand, guildId) {
    let cmdProp = this.getServerProp(guildId, "commands");
    if (cmdProp && guildCommand?.name) {
      if (!cmdProp.includes?.(guildCommand.name)) {
        cmdProp.push(guildCommand.name);
        cachedCommands.set(guildCommand.name, guildCommand);
        this.setServerProp(guildId, "commands", cmdProp);
        return true;
      }
    } else if (guildCommand?.name) {
      cachedCommands.set(guildCommand.name, guildCommand);
      this.setServerProp(guildId, "commands", [guildCommand.name]);
      return true;
    }
    return false;
  }

  /**
   * gets the global or guild commands (leave out param "guildId" for global)
   *
   * @param {String | Number} guildId OPTIONAL: the guildId
   * @returns the command-array
   */
  getCommands(guildId) {
    if (!guildId) return commands;
    else if (this.getServerProp(guildId, "commands")) {
      var tempCommands = commands;
      var i = 0;
      this.getServerProp(guildId, "commands").forEach((cmd) => {
        if (cachedCommands.includes(cmd)) {
          tempCommands.push(cachedCommands.at(i));
        }
        i++;
      });
      return tempCommands;
    }
    return commands;
  }

  /**
   * executes a command, identified by its name
   * @param {String} name The name of the command
   * @param {String | Number} guildId OPTIONAL: The guild if it is a guildCommand
   * @param  {...any} params the parameters for the execute function
   */
  execCommand(name, guildId, ...params) {
    const cmd = this.getCommands(guildId)?.get(name);
    return cmd.execute.call(this, ...params);
  }

  // * FORMATTING

  /**
   * sends a message with a pattern
   *
   * @param {String} reply reply message
   * @param {Discord.Message | Discord.Interaction} message original message/interaction=>(delOriginTimeout > 0 will result in errors)
   * @param {Number | undefined} delTimeout timeout for deleting reply (5000)
   * @param {Boolean | undefined} asAnswer if the repy should be a direct-reply (mention the old message ...)
   * @param {Boolean | undefined} embed embed? (true)
   * @param {Number | undefined} delOriginTimeout delete timeout of original message (0)
   */
  sendMessage(
    reply,
    message,
    delTimeout = 4500,
    asAnswer = false,
    embed = true,
    delOriginTimeout = 0
  ) {
    if (!reply | !message) return;
    if (delOriginTimeout)
      setTimeout(() => {
        message.delete();
      }, delOriginTimeout);

    if (asAnswer) {
      if (!embed) {
        if (delTimeout)
          message.reply(reply).then((message) =>
            setTimeout(() => {
              message.delete();
            }, delTimeout)
          );
        else message.reply(reply);
      } else {
        const embed = new Discord.EmbedBuilder()
          .setColor("#b9d918")
          .setDescription(`**${reply}**`);

        if (delTimeout)
          message.reply({ embeds: [embed] }).then((message) =>
            setTimeout(() => {
              message.delete();
            }, delTimeout)
          );
        else message.reply({ embeds: [embed] });
      }
    } else {
      if (!embed) {
        if (delTimeout)
          message.channel.send(reply).then((message) =>
            setTimeout(() => {
              message.delete();
            }, delTimeout)
          );
        else message.channel.send(reply);
      } else {
        const embed = new Discord.EmbedBuilder()
          .setColor("#b9d918")
          .setDescription(`**${reply}**`);

        if (delTimeout)
          message.channel.send({ embeds: [embed] }).then((message) =>
            setTimeout(() => {
              message.delete();
            }, delTimeout)
          );
        else message.channel.send({ embeds: [embed] });
      }
    }
  }

  /**
   * sends a message with a pattern
   *
   * @param {String} reply reply message
   * @param {Discord.ChatInputCommandInteraction} interaction original interaction
   * @param {Boolen} embed embed? (true)
   * @param {Boolen} ephermal ephermal? (false)
   * @param {Number} delTimeout a timeout to deleting the reply (0 = off)
   * @param {Number} defer whether to defer the reply or not (returns promise)
   */
  sendInteractReply(
    reply,
    interaction,
    embed = true,
    ephemeral = false,
    delTimeout = 0,
    defer = false
  ) {
    if (!reply | !interaction) return;

    if (!embed) {
      if (delTimeout) {
        interaction.reply({ content: reply, ephemeral: ephemeral });
        setTimeout(() => {
          interaction.deleteReply();
        }, delTimeout);
      } else interaction.reply({ content: reply, ephemeral: ephemeral });
    } else {
      const embed = new Discord.EmbedBuilder()
        .setColor("#b9d918")
        .setDescription(`**${reply}**`);

      if (delTimeout) {
        interaction.reply({ embeds: [embed], ephemeral: ephemeral });
        setTimeout(() => {
          interaction.deleteReply();
        }, delTimeout);
      } else interaction.reply({ embeds: [embed], ephemeral: ephemeral });
    }
    if (defer) return interaction.deferReply();
  }
}

module.exports = Botfuncs;

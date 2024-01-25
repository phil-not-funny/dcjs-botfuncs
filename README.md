# Discord.js Botfunctions

### made by phil_not_funny

Discord: phil_not_funny<br/>
Please report bugs to me via discord!

## Description

Since discord likes to torture us with the new discord.js v14, I decided to create this package.<br/>
This package is all about **making bot-writing easier**.<br/>
It mainly focuses on creating server-settings, formatting messages and bot-config.<br/>

## Implementing

Obviously: `npm install discord.js`<br/>

You may **import the functions** by using

```javascript
//      👇 only use when creating another Botfuncs instance
const BotfuncsType = require("dcjs-botfuncs");
const Botfuncs = new BotfuncsType();
```

Making a **bot config and server storage**:

In order to make implementation easier, your bot should have a config file.<br/>
It should at least have the prop "prefix", to set a bot default-prefix, the prop "author" to give credit, and the prop "description" for context.

## Example

Quick example of how to use **dcjs-botfuncs**:

**bot-config.json**:<br/>
A bot default-prefix is the only prop that is required,<br/>
but many people also include their _token_, _client id_, _name_, _description_, ... in their config.<br/>
**Example**:

```json
{
    "prefix": "!",
    "name": "Best Bot!",
    "author": "awesome people",
    "description": "does awesome things",
    "token": "your-token-here",
    "id": "your-application-id-here"
}
```

**index.js**:

```javascript
/* INDEX.JS */

// import/require ...

Botfuncs.setBotConfig(file);  // 👈  file to your bot config
Botfuncs.initServers(file);   // 👈  file to store your servers
Botfuncs.validateServers();   // 👈  validates and updates the server's data (not absolutely necessary)

client.once("ready", () => {
  //ENTIRELY OPTIONAL: set Commands to use them in execCommand() later
  Botfuncs.setGlobalCommandDir("./commandsDirectory");    // 👈 set the directory with all the
  //                                                              commands inside (SEE: seperate command file example)

  const rest = new REST({version: '10'}).token(BOT_TOKEN);
  Botfuncs.putGlobalCommandsToAPI(client.user.id, rest);  // 👈 PUT the global commands on the discord api
  //                                                              and thereby making then slash-commands

  console.log("Bot is now ready");
});

client.on("interactionCreate", async (interaction) => {
  Botfuncs.onInteraction(interaction, (command, options, author, guildId) => {
    if(command === "help") return Botfuncs.execInteractionCommand("healp", guildId, ...params/*👈 your params in the interact() function */)
  })
})

client.on("messageCreate", async (message) => {
  Botfuncs.onMessage(message, (command, args, author, guildId, usedPrefix) => {
    Botfuncs.addServer(message.guildId); // 👈  will store, save and update the server the message was created on
    
    // if(usedPrefix === Botfuncs.getServerProp(guildId, "prefix"))
    //                👆 without filter, onMessage will react to commands using the SERVER-PREFIX AND CONFIG-PREFIX
    if(command === "ping") {
      //👇 "reply", message, deleteTimeout, asEmbed?, deleteReplyTimeout ... (delTimeout & delReplyTimeout: 0 = don't delete )
      return Botfuncs.sendMessage("pong", message, 4000, false, 0);
    } else if(command === "complexCommand") {
      return Botfuncs.execCommand("complexCommand", guildId, ...params /*👈 your params in the execute() function */ );
    }
    // ...
  });
});

// ...
```

Example of a **seperate command file**:

```javascript
module.exports = {
  name: "commandName",                  // 👈 used as identifier
  description: "description",           
  args: [                                                         // 👈 important for slash-commands
    { name: "arg1", description: "descrp1", required: true },
    { name: "arg2", description: "descrp2" },
  ],
  private: false,                       // 👈 if this command should be hidden for the system

  execute(/* EXAMPLE PARAMETERS! Fully Customizable! */ message, args, client, prefix) {
    message.channel.send("I know it's complicated, but you'll get a hang of it!");
  },
  interact(/* EXAMPLE PARAMETERS! Fully Customizable! */ interaction, options) {
    interaction.reply("I know it's complicated, but you'll get a hang of it!");
  }
}
```

## Documentation

### Initializing the bot

---

must use **before discord-client is ready**:

- **initServers(String: serversFile)** Initializes, verifies and loads the servers/guilds and other functions.<br/>
  _serversFile_ - the file of the server storage
- **setBotConfig(String: configFile)** Loads the bot config.<br/>
  _configFile_ - the file to load the config from
- **setGlobalCommands(Command[]: globalCommands)**<br/>
  Sets the global commands via an object. (used for methods: _onMessage_ and _onMessageAuto_)<br/>
  _globalCommands_ - the global commands in form of a Command-array<br/>
  _Command_ should have the properties name, description, pattern, onExecute.

must use upon **messageCreate**:

- **onMessage(Discord.Message: message, Function: onMsg, Function: onRefuse, Object: filter)** <br/>
  Ignores messages from unwated users and makes writing commands cleaner when using the param onMsg.<br/>
  _message_ - the message<br/>
  _onMsg_ - the function to perform when the user used the correct prefix and is not a bot<br/>
  _onRefuse_ - the function to perform when the user did neither of the above<br/>
  _filter_ - filter of the command-refuse (still in work)
- **addServer(String|Number: guildId, Boolean: nosave = false)**<br/>
  Adds a server to the system. (best used in param "onMsg" in the function onMessage)<br/>
  _guildId_ - the id of the guild (used as server identifier)<br/>
  _nosave_ - if it shouldn't save the servers to the file, but rather just add it to the currently running system

should use in context of **commands**:

- **setGlobalCommandDir(String: directory)** <br/>
  When you want to have some or every command in a seperate .js file, give them into one dir.<br/>
  Each seperate command file should have **module.exports** set to an object with the properties name, description and execute.<br/>
  See also: Example of seperate command files.<br/>
  _directory_ - the path of the command directory
- **execCommand(String: name, String|Number: guildId, any[]: params)** executes a command, identified by its name<br/>
  _name_ - the command name (identifier)<br/>
  _guildId_ - the id of the guild - if it is a server-command<br/>
  _...params_ - the params of the execute() function

should use in context of **interactions**:

- **putGlobalCommandsToAPI(Number: clientId, Discord.REST: rest)** creates slash commands out of all your global commands<br/>
  _clientId_ - the client id<br/>
  _rest_ - an instance of REST from @discordjs/rest
- **clearGlobalCommandsInAPI(Number: clientId, Discord.REST: rest)** deletes all the slash commands (not locally)<br/>
  _clientId_ - the client id<br/>
  _rest_ - an instance of REST from @discordjs/rest
- **execInteractionCommand(String: name, Number: guildId, any[]: params)** executes a slash command, identified by its name<br/>
  _name_ - the command name (identifier)<br/>
  _guildId_ - the id of the guild - if it is a server-command<br/>
  _...params_ - the params of the execute() function

good-to-know functions:
- **sendMessage(String: reply, Message: message, Integer: delTimeout, Boolean: asAnswer, Boolean: embed, Integer: delOriginTimeout)**<br/>
  Sends a message with the options listed above
- **sendInteractReply(String: reply, Interaction: interaction, Boolean: embed, Boolean: ephemeral, Integer: delTimeout, Boolean: defer)**<br/>
  Sends an interaction reply the options listed above

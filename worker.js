import { Chalk } from "chalk";
import { parentPort, workerData } from "worker_threads";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// import { ApiServer } from "./apitypes.js";
import { MasonService } from "./mason.js";
import { GameServer } from "./gameserver.js";
import { EnterWorldResponse, ReceiveChatMessageRpc, GameStatusRpc, EntityUpdate, InputRpc } from "./rpctypes.js";

const chalk = new Chalk();
const mason = new MasonService();

const commands = [];
(async () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const basePath = path.join(__dirname, "features");
    for (const file of fs.readdirSync(basePath).filter((file) => file.endsWith(".js"))) {
        const filePath = path.join(basePath, file);
        const commandModule = await import(`file://${filePath}`);
        commands.push(commandModule.default);
    }
})();

let botConfig = {
    id: workerData?.index,
    name: "Bot" + (parentPort ? ` ${workerData?.index}` : ""),
    userKey: workerData?.userKey,
    partyKey: workerData?.partyKey,
    target: -1,
    moving: false,
    following: false,
    looking: false,
    hitting: false,
};

const CODEC_VERSION = 18;
const PLATFORM = "Android";
const VERSION = "5.7.1";
const REGION = "vultr-frankfurt";
const TOURNAMENT = "zcceuduo";
const GAMEMODE = "PrivateDuo";

if (parentPort) {
    console.log = function (...args) {
        const msg = args.map(arg => typeof arg === "string" ? arg : JSON.stringify(arg)).join(' ');
        parentPort.postMessage(`[${botConfig.name}] ${msg}`);
    };
}

mason.on("open", () => {
    mason.setPlatform(PLATFORM);
    mason.setVersion(VERSION);
    mason.setName(botConfig.name);

    if (botConfig.userKey) mason.login(botConfig.userKey);
    mason.setStatus("online");

    if (botConfig.partyKey) {
        mason.joinParty(botConfig.partyKey);
        mason.joinTeamVersion(VERSION);
        if (TOURNAMENT) mason.joinTeamTournamentCode(TOURNAMENT);
        mason.joinTeamGameMode(GAMEMODE);
        mason.joinTeamRegion(REGION);
    } else {
        mason.createParty();
        mason.setPartyVersion(VERSION)
        if (TOURNAMENT) mason.setPartyTournamentCode(TOURNAMENT);
        mason.setPartyGameMode(GAMEMODE);
        mason.setPartyRegion(REGION);
    }
    mason.setReady(true);
})

mason.on("partyJoinServer", (server) => {
    const game = new GameServer(server, PLATFORM, CODEC_VERSION, botConfig.name);
    let response = new EnterWorldResponse();
    let following = -1;

    game.on("EnterWorldResponse", (res) => {
        response = res;
        game.setPlatformRpc(PLATFORM);
        game.startTcpStreamRpc();
        if (botConfig.userKey) game.loginRpc(botConfig.userKey);
        if (botConfig.partyKey) game.joinTeamRpc(botConfig.partyKey, 4);
    });

    game.on("EntityUpdate", (update) => {
        commands.forEach((command) => {
            if (command.onEntityUpdate !== undefined) {
                command.onEntityUpdate(game, botConfig);
            }
        });
    });

    /*
    game.on("GameStatusRpc", (rpc) => {
        if (rpc.status == "Plane") game.parachuteRpc();
    });
    */
    
    game.on("LoginResponseRpc", (rpc) => {
        game.setSkinRpc([
            // { skinId: 1475, slot: 3, subSlot: 0 }, // Costume Pumpkin
            { skinId: 1, slot: 0, subSlot: 0 } // Red Gloves
        ]);
    });

    game.on("ReceiveChatMessageRpc", (rpc) => {
        handleCommand("/", rpc);
    });
    
    parentPort?.on("message", (message) => {
        if (message.type !== "command") return;
        let rpc = new ReceiveChatMessageRpc();
        rpc.displayName = "Console";
        rpc.channel = "Console";
        rpc.message = message.data;
        rpc.uid = -1;
        handleCommand("", rpc);
    });
    
    function handleCommand(prefix, rpc) {
        if (!rpc.message) return;
        const command = rpc.message.indexOf(" ") == -1 ? rpc.message : rpc.message.substring(0, rpc.message.indexOf(" "));
        const args = rpc.message.indexOf(" ") === -1 ? null : rpc.message.substring(rpc.message.indexOf(" ") + 1);
        if (!command || !command.startsWith(prefix)) return;
        const trigger = command.slice(prefix.length).toLowerCase();
        switch (trigger) {
            case "i":
            case "bot": {
                if (!botConfig.id) return;
                if (!args) return;
                let [idsPart, ...commandParts] = args.trim().split(" ");
                let ids = idsPart.split(",").map(Number);
                let command = commandParts.join(" ");
                ids.forEach((id) => {
                    if (isNaN(id) || id < 0) return;
                    if (id == botConfig.id) {
                        console.log(
                            "\n" + 
                            chalk.gray("command:"), chalk.cyan.bold(command) + "\n" +
                            chalk.gray("user:   "), chalk.cyan(rpc.displayName) + "\n" +
                            chalk.gray("uid:    "), chalk.yellow(rpc.uid) + "\n" +
                            chalk.gray("bot:    "), `[${botConfig.name}]` + "\n"
                        );
                        let newRpc = new ReceiveChatMessageRpc();
                        newRpc.displayName = rpc.displayName;
                        newRpc.channel = rpc.channel;
                        newRpc.message = command;
                        newRpc.uid = rpc.uid;
                        handleCommand("", newRpc);
                    }
                });
                break;
            }
            
            case "quit":
            case "exit": {
                parentPort?.close();
                game.close();
                break;
            }
        }
        commands.forEach((c) => {
            if (c.onTrigger !== undefined && c.triggers.includes(trigger)) {
                c.onTrigger(game, botConfig, trigger, args, rpc);
            }
        });
    }
});

/*
mason.on("any", (data) => {
    console.log(data[1]);
});
*/

mason.on("partyStateUpdated", (data) => {
    if (data === "ingame") mason.setIsInRound("true");
});

mason.on("close", () => {
    console.log("Disconnected from mason");
})

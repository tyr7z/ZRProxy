// Import the necessary modules
import { createServer as createHttpsServer } from "https";
import { createServer as createHttpServer } from "http";
import { parse } from "url";
import { randomBytes } from "crypto";
import { inspect } from "util";
import { readFileSync, write, writeFileSync } from "fs";
import { WebSocket, WebSocketServer } from "ws";
import dgram from "dgram";
import * as dotenv from "dotenv";
import { Codec } from "./codec.js"
import { EnterWorldResponse } from "./rpctypes.js";

// Load environment config
dotenv.config();

const customGameServer = {
    ipv4: `${process.env.INGAME_HOST || "127.0.0.1"}:${process.env.INGAME_PORT || "3003"}`,
    ipv6: "[::1]:3003",
    hostname: `${process.env.INGAME_HOST || "127.0.0.1"}:${process.env.INGAME_PORT || "3003"}`,
    hostnameV4: `${process.env.INGAME_HOST || "127.0.0.1"}:${process.env.INGAME_PORT || "3003"}`,
    endpoints: null,
    hostnames: null,
    hostnamesV4: null
};
let originalGameServer = {};

const ingameHttpsServer = createHttpsServer({
    key: readFileSync("privatekey.pem"),
    cert: readFileSync("certificate.pem")
});

const wss = new WebSocketServer({ server: ingameHttpsServer });
wss.on("connection", (ws) => {
    console.log("Client connected to ingame");

    var codec = new Codec();
    let enterWorldResponse = new EnterWorldResponse();

    console.log(`wss://${originalGameServer.hostnameV4}/${originalGameServer.endpoint}`);
    let gameServer = new WebSocket(`wss://${originalGameServer.hostnameV4}/${originalGameServer.endpoint}`);
    gameServer.binaryType = "arraybuffer";
    gameServer.on("open", () => {
        console.log("Game server connected");
        gameServer.send([7, 0]);
    });

    // Handle messages from the game server
    gameServer.on("message", (message) => {
        // console.log("Server to client:", message);

        var payload = new Uint8Array(message);
        switch (payload[0]) {
            /*
            case 0:
                console.log("Incoming PACKET_ENTITY_UPDATE:", payload);
                break;
            */
            case 4:
                console.log("Incoming PACKET_ENTER_WORLD:", payload);
                enterWorldResponse = codec.decodeEnterWorldResponse(payload);
                writeFileSync("enterWorldResponse.json", JSON.stringify(enterWorldResponse, null, 2));

                // Configuration
                const LOCAL_PORT = 1337;
                const REMOTE_HOST = originalGameServer.ipv4;
                const REMOTE_PORT = enterWorldResponse.udpPort;
                let clientInfo = null;

                const proxySocket = dgram.createSocket("udp4");

                proxySocket.on("message", (msg, rinfo) => {
                    const sender = `${rinfo.address}:${rinfo.port}`;
                    const hexString = msg.toString("hex").match(/.{1,2}/g)?.map(byte => byte.toUpperCase()).join(" ");

                    if (rinfo.address === REMOTE_HOST && rinfo.port === REMOTE_PORT) {
                        // Message from server -> client
                        if (!clientInfo) return;
                        console.log(`Server ${sender} -> Client ${clientInfo.address}:${clientInfo.port}:`, hexString);
                        proxySocket.send(msg, clientInfo.port, clientInfo.address);
                    } else {
                        // Message from client -> server
                        clientInfo = rinfo;
                        console.log(`Client ${sender} -> Server ${REMOTE_HOST}:${REMOTE_PORT}:`, hexString);
                        proxySocket.send(msg, REMOTE_PORT, REMOTE_HOST);
                    }
                });

                proxySocket.bind(LOCAL_PORT, () => {
                    console.log(`UDP proxy listening on port ${LOCAL_PORT}`);
                });

                enterWorldResponse.udpPort = LOCAL_PORT;
                payload = codec.encodeEnterWorldResponse(enterWorldResponse);
                break;
            /*
            case 7:
                console.log("Incoming PACKET_PING:", payload);
                break;
            */
            case 9:
                const msg = codec.cryptRpc(payload);
                const hexString = Array.from(msg).map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
                console.log("Outgoing decrypted PACKET_RPC:", hexString);
                break;
        }

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    });

    // Handle messages from the ingame client
    ws.on("message", (message) => {
        // console.log("Client to server:", message);

        var payload = new Uint8Array(message, message.byteOffset, message.byteLength);
        switch (payload[0]) {
            /*
            case 0:
                console.log("Outgoing PACKET_ENTITY_UPDATE:", payload);
                break;
            case 1:
                console.log("Outgoing PACKET_PLAYER_COUNTER_UPDATE:", payload);
                break;
            case 2:
                console.log("Outgoing PACKET_SET_WORLD_DIMENSIONS:", payload);
                break;
            case 3:
                console.log("Outgoing PACKET_INPUT:", payload);
                break;
            */
            case 4:
                console.log("Outgoing PACKET_ENTER_WORLD:", payload);
                const enterWorldRequest = codec.decodeEnterWorldRequest(payload);
                console.log(enterWorldRequest);
                codec.rpcKey = codec.computeRpcKey(enterWorldRequest.version, new TextEncoder().encode("/" + originalGameServer.endpoint), enterWorldRequest.proofOfWork);
                break;
            case 7:
                console.log("Outgoing PACKET_PING:", payload);
                break;
            case 9:
                const msg = codec.cryptRpc(payload);
                const hexString = Array.from(msg).map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
                console.log("Outgoing decrypted PACKET_RPC:", hexString);
                break;
            /*
            case 10:
                console.log("Outgoing PACKET_UDP_CONNECT:", payload);
                break;
            case 11:
                console.log("Outgoing PACKET_UDP_TICK:", payload);
                break;
            case 12:
                console.log("Outgoing PACKET_UDP_ACK_TICK:", payload);
                break;
            case 13:
                console.log("Outgoing PACKET_UDP_PONG:", payload);
                break;
            case 14:
                console.log("Outgoing PACKET_UDP_TICK_WITH_COMPRESSED_UIDS:", payload);
                break;
            case 15:
                console.log("Outgoing PACKET_UDP_FRAGMENT:", payload);
                break;
            case 16:
                console.log("Outgoing PACKET_UDP_CONNECT_1300:", payload);
                break;
            case 17:
                console.log("Outgoing PACKET_UDP_CONNECT_500:", payload);
                break;
            case -1:
                console.log("Outgoing PACKET_UDP_RPC:", payload);
                break;
            */
        }

        if (gameServer.readyState === WebSocket.OPEN) {
            gameServer.send(message);
        }
    });

    // Handle connection close
    ws.on("close", () => {
        console.log("Client disconnected from ingame");
        gameServer.close();
    });

    gameServer.on("close", () => {
        console.log("Game server connection closed");
        ws.close();
    });
});

// Start the server
ingameHttpsServer.listen(
    parseInt(process.env.INGAME_PORT || "3003"),
    process.env.INGAME_HOST || "localhost",
    () => {
        console.log(
            `[${process.env.INGAME_SERVER_NAME || "ZRProxy Ingame"
            }] Ingame is now listening on port ${process.env.INGAME_PORT || "3003"}`
        );
    }
);

// Shared proxied Mason server
const proxiedMason = new WebSocketServer({ noServer: true });

// WebSocket upgrade handler (shared for both HTTP and HTTPS)
function handleUpgrade(server) {
    server.on("upgrade", (req, socket, head) => {
        const { pathname, query } = parse(req.url, true);
        console.log(`Upgrade on ${pathname}`, query);

        if (pathname === "/gateway/" && query.EIO === "4" && query.transport === "websocket") {
            proxiedMason.handleUpgrade(req, socket, head, (ws) => {
                proxiedMason.emit("connection", ws, req);
            });
        } else {
            socket.destroy();
        }
    });
}

function parseSocketIOMessage(message) {
    try {
        // Remove the leading "42" and parse the rest of the message as JSON
        const jsonData = JSON.parse(message.slice(2));

        // Extract the event name and data from the parsed JSON
        const eventName = jsonData[0];
        const eventData = jsonData[1];

        return { eventName, eventData };
    } catch {
        return null;
    }
}

// Handle proxied Mason connections
proxiedMason.on("connection", (clientSocket) => {
    console.log("Client connected to Mason proxy");

    // Connect to the target WebSocket server
    const originalMason = new WebSocket("wss://mason-ipv4.zombsroyale.io/gateway/?EIO=4&transport=websocket");

    /*
    const sid = randomBytes(16).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    // 1. Engine.IO handshake packet
    const handshake = `0${JSON.stringify({
        sid,
        upgrades: [],
        pingInterval: 55000,
        pingTimeout: 120000
    })}`;
    console.log("⬅️ From server: ", handshake);
    clientSocket.send(handshake);

    // 2. Socket.IO connect packet
    console.log("⬅️ From server: ", "40");
    clientSocket.send("40");
    */

    // 3. Handle messages from client
    clientSocket.on("message", (payload) => {
        const msg = payload.toString();
        console.log("➡️ From client:", msg);

        // Forward messages to real Mason
        if (originalMason.readyState === WebSocket.OPEN) {
            originalMason.send(msg);
        }

        /*
        if (msg === "2") { // ping
            console.log("⬅️ From server: ", "3");
            clientSocket.send("3"); // pong
        } else if (msg.startsWith("42")) {
            const { eventName, eventData } = parseSocketIOMessage(msg);
            console.log(`📨 Event: ${eventName}, Data: ${eventData}`);
        } else {
            console.error("❌ Invalid message:", msg);
        }
        */
    });

    // Relay all messages from the original Mason server back to the client
    originalMason.on("message", (payload) => {
        var msg = payload.toString();
        console.log("⬅️ From server: ", msg);

        const parsedMessage = parseSocketIOMessage(msg);
        if (parsedMessage) {
            var { eventName, eventData } = parsedMessage;
            switch (eventName) {
                case "partyJoinServer":
                    originalGameServer = { ...eventData };
                    console.log("Original partyJoinServer:", originalGameServer);
                    eventData = Object.assign(eventData, customGameServer);
                    msg = `42["${eventName}", ${JSON.stringify(eventData)}]`;
                    break;
            }
        }

        if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(msg);
        }
    });

    // Handle errors on both sides
    clientSocket.on("error", (err) => {
        console.error("Client socket error:", err);
    });

    originalMason.on("error", (err) => {
        console.error("Original Mason WebSocket error:", err);
    });

    // Handle closures
    clientSocket.on("close", () => {
        console.log("Client disconnected");
        originalMason.close();
    });

    originalMason.on("close", () => {
        console.log("Disconnected from target server");
        clientSocket.close();
    });
});

/*
// 🔐 HTTPS Mason server
const httpsMasonServer = createHttpsServer({
    key: readFileSync("privatekey.pem"),
    cert: readFileSync("certificate.pem")
});
handleUpgrade(httpsMasonServer);
httpsMasonServer.listen(
    parseInt(process.env.MASON_PORT || "3002"),
    process.env.MASON_HOST || "127.0.0.1",
    () => {
        console.log(
            `[${process.env.MASON_SERVER_NAME || "ZRProxy Mason"
            }] Mason is now listening on https://${process.env.MASON_HOST || "127.0.0.1"}:${process.env.MASON_PORT || "3002"}`
        );
    }
);
*/

// 🌐 HTTP Mason server
const httpMasonServer = createHttpServer();
handleUpgrade(httpMasonServer);
httpMasonServer.listen(
    parseInt(process.env.MASON_PORT || "3002"),
    process.env.MASON_HOST || "127.0.0.1",
    () => {
        console.log(
            `[${process.env.MASON_SERVER_NAME || "ZRProxy Mason"
            }] Mason is now listening on http://${process.env.MASON_HOST || "127.0.0.1"}:${process.env.MASON_PORT || "3002"}`
        );
    }
);

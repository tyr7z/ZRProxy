// Import the necessary modules
import http from "http";
import Socketio from "socket.io";
import https from "https";
import { inspect } from "node:util";
import { readFileSync, writeFileSync } from "fs";
import { WebSocket, WebSocketServer } from "ws";
import * as dotenv from "dotenv";

// Load environment config
dotenv.config();

const customGameServer = {
    ipv4: `${process.env.INGAME_HOST || "127.0.0.1"}:${process.env.INGAME_PORT || "3003"}`,
    ipv6: "[::1]:3003",
    hostname: `127.0.0.1:${process.env.INGAME_PORT || "3003"}`,
    hostnameV4: `127.0.0.1:${process.env.INGAME_PORT || "3003"}`,
    endpoints: null,
    hostnames: null,
    hostnamesV4: null
};
let originalGameServer = {};

const version = 19;
const decoder = new TextDecoder("utf-8");

const ingameHttpsServerOptions = {
    key: readFileSync("privatekey.pem"),
    cert: readFileSync("certificate.pem")
};
const ingameHttpsServer = https.createServer(ingameHttpsServerOptions);

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

const wss = new WebSocketServer({ server: ingameHttpsServer });
wss.on("connection", (ws) => {
    console.log("Client connected to ingame");

    var targetUrlBytes = new TextEncoder().encode("/" + originalGameServer.endpoint);
    var proofOfWork = null;
    var rpcKey = new Uint8Array(8);
    let enterWorldResponse;

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
            case 0:
                console.log("Incoming PACKET_ENTITY_UPDATE:", payload);
                break;
            case 4:
                console.log("Incoming PACKET_ENTER_WORLD:", payload);
                break;
            case 7:
                console.log("Incoming PACKET_PING:", payload);
                break;
            case 9:
                console.log("Incoming decrypted PACKET_RPC:", payload);
                break;
        }
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    });

    // Handle messages from the ingame client
    ws.on("message", (message) => {
        // console.log("Client to server:", message);

        var payload = new Uint8Array(message, message.byteOffset, message.byteLength);
        switch (payload[0]) {
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
            case 4:
                console.log("Outgoing PACKET_ENTER_WORLD:", payload);
                break;
            case 7:
                console.log("Outgoing PACKET_PING:", payload);
                break;
            case 9:
                console.log("Outgoing PACKET_RPC:", payload);
                break;
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

// Create an HTTP server
const server = http.createServer();

// Create a Socket.io server instance
const io = new Socketio(server, { path: "/gateway" });

// Set up a listener for the connection event
io.on("connection", (socket) => {
    console.log("Client connected");

    // Connect to the target WebSocket server
    const mason = new WebSocket("wss://mason-ipv4.zombsroyale.io/gateway/?EIO=4&transport=websocket");

    // Use middleware to intercept and forward all events from the Socket.IO client
    socket.use((packet, next) => {
        const eventName = packet[0];
        const args = packet.slice(1);

        const message = JSON.stringify({
            event: eventName,
            data: args
        });

        const realPacket = "42" + JSON.stringify(packet);

        console.log("Intercepted packet:", realPacket);

        if (mason.readyState === WebSocket.OPEN) {
            mason.send(realPacket);
        }

        // Continue processing the event
        next();
    });

    // Relay all messages from the target WebSocket server back to the Socket.IO client
    mason.on("message", (payload) => {
        const message = payload.toString();
        try {
            if (message.startsWith("42")) {
                // Handle text (JSON) data
                const parsedMessage = parseSocketIOMessage(message);
                let { eventName, eventData } = parsedMessage;
                switch (eventName) {
                    case "partyJoinServer":
                        originalGameServer = { ...eventData };
                        console.log("Original partyJoinServer:", originalGameServer);
                        eventData = Object.assign(eventData, customGameServer);
                        break;
                }
                console.log(`Message from target server: ${eventName}`, eventData);
                socket.emit(eventName, eventData);
            } else {
                console.log(`Raw message from target server: ${message}`);
            }
        } catch (error) {
            console.error("Failed to parse message:", message, error);
        }
    });

    // Handle errors on both sides
    socket.on("error", (err) => {
        console.error("Socket.IO client error:", err);
    });

    mason.on("error", (err) => {
        console.error("Mason WebSocket error:", err);
    });

    // Handle the Socket.IO client disconnecting
    socket.on("disconnect", () => {
        console.log("Socket.IO client disconnected");
        if (mason.readyState === WebSocket.OPEN) {
            mason.close();
        }
    });

    // Handle the target WebSocket server closing
    mason.on("close", () => {
        console.log("Mason server connection closed");
        socket.disconnect(true);
    });
});

// Start the server
server.listen(
    parseInt(process.env.MASON_PORT || "3002"),
    process.env.MASON_HOST || "localhost",
    () => {
        console.log(
            `[${process.env.MASON_SERVER_NAME || "ZRProxy Mason"
            }] Mason is now listening on port ${process.env.MASON_PORT || "3002"}`
        );
    }
);

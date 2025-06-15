// Import the necessary modules
import { createServer as createHttpsServer } from "https";
import { createServer as createHttpServer } from "http";
import { parse } from "url";
import { randomBytes } from "crypto";
import { inspect } from "util";
import { appendFileSync, readFileSync, writeFileSync } from "fs";
import { WebSocket, WebSocketServer } from "ws";
import dgram from "dgram";
import * as dotenv from "dotenv";
import { Codec, PacketId } from "zombslib";

// Load environment config
dotenv.config();
const UDP = false;

let startTime = undefined;

function savePacket(direction, timestamp, payload) {
    if (startTime === undefined) startTime = timestamp;
    const relativeTime = timestamp - startTime;
    const typeByte = direction === "in" ? 0x01 : 0x02;
    const typeBuffer = Buffer.from([typeByte]);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64LE(BigInt(relativeTime));
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(payload.length);
    const dataBuffer = Buffer.from(payload);
    const packetBuffer = Buffer.concat([
        typeBuffer,
        timeBuffer,
        lengthBuffer,
        dataBuffer,
    ]);
    fs.appendFileSync("replay.sav", packetBuffer);
}

function parseReplay() {
    const buffer = fs.readFileSync("replay.sav");
    const packets = [];
    let offset = 0;
    while (offset < buffer.length) {
        const typeByte = buffer.readUInt8(offset);
        const direction = typeByte === 0x01 ? "in" : "out";
        offset += 1;
        const relativeTime = Number(buffer.readBigUInt64LE(offset));
        offset += 8;
        const length = buffer.readUInt32LE(offset);
        offset += 4;
        const data = buffer.slice(offset, offset + length);
        offset += length;
        packets.push({ direction, time: relativeTime, length, data });
    }
    return packets;
}

const customGameServer = {
    ipv4: `${process.env.INGAME_HOST || "127.0.0.1"}:${
        process.env.INGAME_PORT || "3003"
    }`,
    ipv6: "[::1]:3003",
    hostname: `${process.env.INGAME_HOST || "127.0.0.1"}:${
        process.env.INGAME_PORT || "3003"
    }`,
    hostnameV4: `${process.env.INGAME_HOST || "127.0.0.1"}:${
        process.env.INGAME_PORT || "3003"
    }`,
    endpoints: null,
    hostnames: null,
    hostnamesV4: null,
};
let originalGameServer = {};

const ingameHttpsServer = createHttpsServer({
    key: readFileSync("privatekey.pem"),
    cert: readFileSync("certificate.pem"),
});

const wss = new WebSocketServer({ server: ingameHttpsServer });
wss.on("connection", (ws) => {
    console.log("Client connected to ingame");

    let codec = new Codec("../../rpcs/Windows-Rpcs.json");
    let updates = 0;

    console.log(
        `wss://${originalGameServer.hostnameV4}/${originalGameServer.endpoint}`
    );
    let gameServer = new WebSocket(
        `wss://${originalGameServer.hostnameV4}/${originalGameServer.endpoint}`
    );
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
            case PacketId.EntityUpdate:
                const update = codec.decodeEntityUpdate(payload);
                // const player = codec.entityList.get(codec.enterWorldResponse.uid);
                // if (!player) break;
                // console.log(player.tick.firingTick, player.tick.firingSequence);
                updates++;
                if (updates !== 1) break;
                writeFileSync("update.bin", payload);
                console.log(payload);
                console.log("EntityUpdate", update);
                /*
                for (const [key, value] of codec.entityList) {
                    if (key !== codec.enterWorldResponse.uid)
                        codec.entityList.delete(key);
                }
                console.log(codec.entityList);
                payload = codec.encodeEntityUpdate({
                    createdEntities: [codec.enterWorldResponse.uid],
                    tick: update.tick,
                    deletedEntities: [],
                });
                */
                payload = codec.encodeEntityUpdate(update);
                writeFileSync("update-reencoded.bin", payload);
                console.log(payload);
                break;
            case PacketId.PlayerCounterUpdate:
                break;
            case PacketId.SetWorldDimensions:
                break;
            case PacketId.Input:
                break;
            case PacketId.EnterWorld:
                console.log("Incoming PACKET_ENTER_WORLD:", payload);
                codec.enterWorldResponse =
                    codec.decodeEnterWorldResponse(payload);
                writeFileSync(
                    "enterWorldResponse.json",
                    JSON.stringify(codec.enterWorldResponse, null, 2)
                );

                if (!UDP) break;
                const LOCAL_PORT = 1337;
                const REMOTE_HOST = originalGameServer.ipv4;
                const REMOTE_PORT = codec.enterWorldResponse.udpPort;
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

                codec.enterWorldResponse.udpPort = LOCAL_PORT;
                payload = codec.encodeEnterWorldResponse(codec.enterWorldResponse);
                break;
            case PacketId.Ping:
                console.log("Incoming PACKET_PING:", payload);
                break;
            case PacketId.Rpc:
                const decrypedData = codec.cryptRpc(payload);

                // const hexString = Array.from(decrypedData).map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
                // console.log("Incoming decrypted PACKET_RPC:", hexString);

                const definition = codec.enterWorldResponse.rpcs.find(
                    (rpc) => rpc.index === decrypedData[1]
                );

                const rpc = codec.decodeRpc(definition, decrypedData);

                if (rpc !== undefined && rpc.name !== null) {
                    console.log(rpc.name, rpc.data);
                }
                break;
            case PacketId.UdpConnect:
                break;
            case PacketId.UdpTick:
                break;
            case PacketId.UdpAckTick:
                break;
            case PacketId.UdpPong:
                break;
            case PacketId.UdpPingWithCompressedUids:
                break;
            case PacketId.UdpFragment:
                break;
            case PacketId.UdpConnect1300:
                break;
            case PacketId.UdpConnect500:
                break;
            case PacketId.UdpRpc:
                break;
        }

        if (ws.readyState === WebSocket.OPEN) {
            // if (payload[0] === PacketId.EntityUpdate && updates !== 1) return;
            ws.send(payload);
        }
    });

    // Handle messages from the ingame client
    ws.on("message", (message) => {
        // console.log("Client to server:", message);

        var payload = new Uint8Array(
            message,
            message.byteOffset,
            message.byteLength
        );
        switch (payload[0]) {
            case PacketId.EntityUpdate:
                break;
            case PacketId.PlayerCounterUpdate:
                break;
            case PacketId.SetWorldDimensions:
                break;
            case PacketId.Input:
                break;
            case PacketId.EnterWorld:
                console.log("Outgoing PACKET_ENTER_WORLD:", payload);
                const enterWorldRequest =
                    codec.decodeEnterWorldRequest(payload);
                const powResult = codec.validateProofOfWork(
                    enterWorldRequest.proofOfWork,
                    originalGameServer.endpoint
                );
                if (!powResult.valid) {
                    ws.close();
                    return;
                }
                const platform = powResult.platform;
                console.log(platform);
                codec = new Codec(`../../rpcs/${platform}-Rpcs.json`);
                codec.computeRpcKey(
                    enterWorldRequest.version,
                    new TextEncoder().encode("/" + originalGameServer.endpoint),
                    enterWorldRequest.proofOfWork
                );
                break;
            case PacketId.Ping:
                console.log("Outgoing PACKET_PING:", payload);
                break;
            case PacketId.Rpc:
                const decrypedData = codec.cryptRpc(payload);

                // const hexString = Array.from(decrypedData).map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
                // console.log("Outgoing decrypted PACKET_RPC:", hexString);

                const definition = codec.enterWorldResponse.rpcs.find(
                    (rpc) => rpc.index === decrypedData[1]
                );

                const rpc = codec.decodeRpc(definition, decrypedData);

                if (rpc !== undefined && rpc.name !== null) {
                    if (rpc.name !== "InputRpc") console.log(rpc.name, rpc.data);
                }
                break;
            case PacketId.UdpConnect:
                break;
            case PacketId.UdpTick:
                break;
            case PacketId.UdpAckTick:
                break;
            case PacketId.UdpPong:
                break;
            case PacketId.UdpPingWithCompressedUids:
                break;
            case PacketId.UdpFragment:
                break;
            case PacketId.UdpConnect1300:
                break;
            case PacketId.UdpConnect500:
                break;
            case PacketId.UdpRpc:
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
    process.env.INGAME_HOST || "127.0.0.1",
    () => {
        console.log(
            `[${
                process.env.INGAME_SERVER_NAME || "ZRProxy Ingame"
            }] Ingame is now listening on port ${
                process.env.INGAME_PORT || "3003"
            }`
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
        console.log(req.url);

        if (
            pathname === "/gateway/" &&
            query.EIO === "4" &&
            query.transport === "websocket"
        ) {
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
    const originalMason = new WebSocket(
        "wss://mason-ipv4.zombsroyale.io/gateway/?EIO=4&transport=websocket"
    );

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
                    console.log(
                        "Original partyJoinServer:",
                        originalGameServer
                    );
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
            `[${
                process.env.MASON_SERVER_NAME || "ZRProxy Mason"
            }] Mason is now listening on http://${
                process.env.MASON_HOST || "127.0.0.1"
            }:${process.env.MASON_PORT || "3002"}`
        );
    }
);

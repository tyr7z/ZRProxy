// Import the necessary modules
import http from "http";
import Socketio from "socket.io";
import https from "https";
import { readFileSync } from "fs";
import { WebSocket, WebSocketServer } from "ws";
import * as dotenv from "dotenv";

// Load environment config
dotenv.config();

const customGameServer = {
    ipv4: `${process.env.INGAME_HOST || "127.0.0.1"}:${process.env.INGAME_PORT || "3003"}`,
    ipv6: "[::1]:3003",
    hostname: `localhost:${process.env.INGAME_PORT || "3003"}`,
    hostnameV4: `localhost:${process.env.INGAME_PORT || "3003"}`,
    endpoints: null,
    hostnames: null,
    hostnamesV4: null
};
let originalGameServer = {};

const version = 18;

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

const types = {
    "0": "Uint32",
    "1": "Int32",
    "2": "Float",
    "3": "String",
    "4": "Uint64",
    "5": "Int64",
    "6": "Uint16",
    "7": "Int16",
    "8": "Int8",
    "9": "Uint8",
    "10": "VectorUint8",
    "11": "CompressedString"
};

const sizes = {
    "Uint32": 32,
    "Int32": 32,
    "Float": 32,
    "String": -1,
    "Uint64": 64,
    "Int64": 64,
    "Uint16": 16,
    "Int16": 16,
    "Int8": 8,
    "Uint8": 8,
    "VectorUint8": 16,
    "CompressedString": -1
};

const inputRpc = {
    "tick": { id: 875692126, type: "Uint32", value: 0, key: 0xCCED0979 },
    "inputUid": { id: 614051422, type: "Uint32", value: 0, key: 0x2B95FFFE },
    "acknowledgedTickNumber": { id: 0, type: "Uint32", value: 0, key: 0 },
    "isPing": { id: 1305702976, type: "Uint8", value: 0, key: 0xEE11EC24 },
    "hasWorld": { id: 1311631272, type: "Uint8", value: 0, key: 0 },
    "left": { id: 1857689874, type: "Int8", value: 0, key: 0x355EA990 },
    "right": { id: 1725394323, type: "Int8", value: 0, key: 0x858984BB },
    "down": { id: 361218246, type: "Int8", value: 0, key: 0xA2AB132B },
    "up": { id: 365890172, type: "Int8", value: 0, key: 0x67768D9F },
    "space": { id: 4223989018, type: "Int8", value: 0, key: 0x47B5D5F5 },
    "moveDirection": { id: 3209116361, type: "Int16", value: 0, key: 0x2E10E1CE },
    "use": { id: 2486061062, type: "Int8", value: 0, key: 0x6E0E6897 },
    "worldX": { id: 3304954942, type: "Int32", value: 0, key: 0x90FFB48F },
    "worldY": { id: 2881696461, type: "Int32", value: 0, key: 0xA947801E },
    "distance": { id: 1473272673, type: "Uint32", value: 0, key: 0x8A0110F5 },
    "yaw": { id: 3000823997, type: "Uint16", value: 0, key: 0x4441CB65 },
    "mouseDown": { id: 2280622761, type: "Int16", value: 0, key: 0x721A5A92 },
    "mouseMovedWhileDown": { id: 2981660673, type: "Int16", value: 0, key: 0x67CB001 },
    "mouseMoved": { id: 1662839021, type: "Int16", value: 0, key: 0x3523121A },
    "mouseUp": { id: 1035244158, type: "Int8", value: 0, key: 0x8B9A38CC },
    "moveSpeed": { id: 3154201459, type: "Float", value: 0, key: 0xDDD131CD },
    "rightMouseDown": { id: 3576311845, type: "Uint8", value: 0, key: 0x748822CC },
    "unknown_0": { id: 1055678346, type: "Float", value: 0, key: 0x634D6BD7 },
    "unknown_1": { id: 2802416676, type: "Float", value: 0, key: 0x5BCCB63A }
};

function swapEndianness16(val) {
    return ((val & 0xFF) << 8) | ((val >> 8) & 0xFF);
}

function getInputFieldKey(id) {
    switch (id) {
        case 1662839021:
            return 0x3523121A;
        case 3304954942:
            return 0x90FFB48F;
        case 2280622761:
            return 0x721A5A92;
        case 2802416676:
            return 0x5BCCB63A;
        case 3000823997:
            return 0x4441CB65;
        case 4223989018:
            return 0x47B5D5F5;
        case 1857689874:
            return 0x355EA990;
        case 2881696461:
            return 0xA947801E;
        case 1725394323:
            return 0x858984BB;
        case 614051422:
            return 0x2B95FFFE;
        case 3576311845:
            return 0x748822CC;
        case 361218246:
            return 0xA2AB132B;
        case 3209116361:
            return 0x2E10E1CE;
        case 3154201459:
            return 0xDDD131CD;
        case 1035244158:
            return 0x8B9A38CC;
        case 1473272673:
            return 0x8A0110F5;
        case 2981660673:
            return 0x67CB001;
        case 1055678346:
            return 0x634D6BD7;
        case 875692126:
            return 0xCCED0979;
        case 2486061062:
            return 0x6E0E6897;
        case 365890172:
            return 0x67768D9F;
        case 1305702976:
            return 0xEE11EC24;
        // case 1311631272:
        default:
            return 0;
    }
}

function encryptInputField(type, originalValue, key) {
    const mask = (2 ** sizes[type] - 1);
    let realKey = key;
    // if (type === "Uint16" || type === "Int16") {
    //     realKey = swapEndianness16(key);
    // }

    let value = originalValue;
    switch (type) {
        case "Float":
            value = value * 100;
            break;
        case "Int16":
            if (value < 32767) {
                value = value + 65536;
            }
            break;
        case "Int8":
            if (value < 127) {
                value = value + 256;
            }
            break;
    }
    let encrypted = (value ^ realKey) & mask;
    return encrypted;
}

function decryptInputField(type, encrypted, key) {
    const mask = (2 ** sizes[type] - 1);
    let realKey = key;
    if (type === "Uint16" || type === "Int16") {
        realKey = swapEndianness16(key);
    }

    let value = (encrypted ^ realKey) & mask;
    switch (type) {
        case "Float":
            value = value / 100;
            break;
        case "Int16":
            if (value > 32767) {
                value = value - 65536;
            }
            break;
        case "Int8":
            if (value > 127) {
                value = value - 256;
            }
            break;
    }
    return value;
}

function craftInputRpc(inputRpc, enterWorldResponse, rpcKey) {
    const rpcElement = enterWorldResponse.rpcs.find(
        (rpc) => rpc.internalId === 0x3cb524ad
    );
    if (!rpcElement) return;
    const index = rpcElement.index;
    if (!index) return;
    const parameters = rpcElement.parameters;
    if (!parameters) return;
    // console.log(parameters);

    let input = inputRpc;

    let size = 0;
    for (const element of parameters) {
        size += (sizes[types[element.type]] / 8);
    }
    
    const writer = new BinaryWriter(size);
    for (const element of parameters) {
        const field = Object.entries(inputRpc).find(([key, value]) => value.id === element.id);
        if (!field) {
            writer.writeUint8(0);
            console.log(element.id);
            continue;
        }
        // console.log(field[1]);
        let value = (field[1].value) >>> 0;
        input[field[0]].value = value;
        const key = getInputFieldKey(element.id);
        value = encryptInputField(field[1].type, value, key);
        // console.log("decrypted:", decryptInputField(field[1].type, value, key));
        switch (element.type) {
            case 0:
                writer.writeUint32(value);
                break;
            case 1:
                writer.writeInt32(value);
                break;
            case 2:
                writer.writeFloat(value);
                break;
            case 3:
                writer.writeString(value);
                break;
            case 4:
                writer.writeUint64(value);
                break;
            case 5:
                writer.writeInt64(value);
                break;
            case 6:
                writer.writeUint16(value);
                break;
            case 7:
                writer.writeInt16(value);
                break;
            case 8:
                writer.writeUint8(value);
                break;
            case 9:
                writer.writeInt8(value);
                break;
            case 10:
                writer.writeUint8Vector2(value);
                break;
            case 11:
                writer.writeString(value);
                break;
        }
    }
    const inputRpcParameters = new Uint8Array(writer.view.buffer);
    // console.log(inputRpcParameters);
    const body = new BinaryWriter(1 + 4 + inputRpcParameters.length);
    body.writeUint8(9);
    body.writeUint32(index);
    body.writeUint8Array(inputRpcParameters);

    const rpcBytes = new Uint8Array(body.view.buffer);
    const outgoing = new Uint8Array(rpcBytes.length);
    // console.log(rpcBytes);
    outgoing.set(cryptRpc(rpcBytes, rpcKey));
    return outgoing;
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
            case 4:
                enterWorldResponse = decodeEnterWorldResponse(payload);
                console.log(enterWorldResponse);
                break;
        }
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    });

    // Handle messages from the ingame client
    ws.on("message", (message) => {
        // console.log("Client to server:", message);

        var payload = new Uint8Array(message);
        switch (payload[0]) {
            case 0:
                console.log("Incoming PACKET_ENTITY_UPDATE:", payload);
                break;
            case 1:
                console.log("Incoming PACKET_PLAYER_COUNTER_UPDATE:", payload);
                break;
            case 2:
                console.log("Incoming PACKET_SET_WORLD_DIMENSIONS:", payload);
                break;
            case 3:
                console.log("Incoming PACKET_INPUT:", payload);
                break;
            case 4:
                console.log("Incoming PACKET_ENTER_WORLD:", payload);
                console.log("Decoded incoming PACKET_ENTER_WORLD:", decodeEnterWorldRequest(payload));

                proofOfWork = payload.slice(payload.length - 24);
                rpcKey = computeRpcKey(version, targetUrlBytes, proofOfWork);
                console.log(rpcKey);
                break;
            case 7:
                console.log("Incoming PACKET_PING:", payload);
                break;
            case 9:
                const rpcBytes = cryptRpc(payload, rpcKey);
                console.log("Incoming decrypted PACKET_RPC:", rpcBytes);
                const reader = new BinaryReader(rpcBytes);

                // Read packet id to void it
                reader.readUint8();

                const index = reader.readUint32();

                const rpcElement = enterWorldResponse.rpcs.find((rpc) => rpc.index === index);
                if (!rpcElement) break;
                const parameters = rpcElement.parameters;

                if (rpcElement.internalId !== 1018504365) break;
                // console.clear();

                let input = inputRpc;

                for (const element of parameters) {
                    var buffer;
                    var type = types[element.type];
                    switch (element.type) {
                        case 0:
                            buffer = reader.readUint32();
                            break;
                        case 1:
                            buffer = reader.readInt32();
                            break;
                        case 2:
                            buffer = reader.readFloat();
                            break;
                        case 3:
                            buffer = reader.readString();
                            break;
                        case 4:
                            buffer = reader.readUint64();
                            break;
                        case 5:
                            buffer = reader.readInt64();
                            break;
                        case 6:
                            buffer = reader.readUint16();
                            break;
                        case 7:
                            buffer = reader.readInt16();
                            break;
                        case 8:
                            buffer = reader.readUint8();
                            break;
                        case 9:
                            buffer = reader.readInt8();
                            break;
                        case 10:
                            buffer = reader.readUint8Vector2();
                            break;
                        case 11:
                            buffer = reader.readString();
                            break;
                    }
                    let value = buffer >>> 0;
                    const encrypted = value;
                    const field = Object.entries(inputRpc).find(([key, value]) => value.id === element.id);
                    // if (input[field[0]] == "inputUid") value = 0;
                    input[field[0]].value = decryptInputField(type, encrypted, field[1].key);
                    // console.log(`{ "type": "${type}", "id": ${element.id}, "encrypted": "0x${encrypted.toString(16).toUpperCase()}", "value": ${value} },`);
                }
                // console.log(input);
                payload = craftInputRpc(input, enterWorldResponse, rpcKey);
                console.log(message.buffer);
                // console.log(Buffer.from(payload));
                // console.log(message == Buffer.from(payload));
                // console.log(Array.prototype.slice.call(message));
                // console.log(Array.prototype.slice.call(payload));
                // let b = Buffer.alloc(message.buffer.byteLength);
                // let ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
                break;
            case 10:
                console.log("Incoming PACKET_UDP_CONNECT:", payload);
                break;
            case 11:
                console.log("Incoming PACKET_UDP_TICK:", payload);
                break;
            case 12:
                console.log("Incoming PACKET_UDP_ACK_TICK:", payload);
                break;
            case 13:
                console.log("Incoming PACKET_UDP_PONG:", payload);
                break;
            case 14:
                console.log("Incoming PACKET_UDP_TICK_WITH_COMPRESSED_UIDS:", payload);
                break;
            case 15:
                console.log("Incoming PACKET_UDP_FRAGMENT:", payload);
                break;
            case 16:
                console.log("Incoming PACKET_UDP_CONNECT_1300:", payload);
                break;
            case 17:
                console.log("Incoming PACKET_UDP_CONNECT_500:", payload);
                break;
            case -1:
                console.log("Incoming PACKET_UDP_RPC:", payload);
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
        console.error("Target WebSocket error:", err);
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
        console.log("Target server connection closed");
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

function computeRpcKey(codecVersion, targetUrlBytes, proofOfWork) {
    var rpcKey = new Uint8Array(8);
    var v9 = 0;
    var v10 = 0;
    for (var i = 0; ; i = ++v10) {
        if (i >= proofOfWork.length) break;
        var v15 = v10 % rpcKey.length;
        var v8 = proofOfWork[v10];
        rpcKey[v15] ^= v8;
    }
    var v16 = 0;
    var v17 = 0;
    while (v17 < rpcKey.length) {
        var v21 = rpcKey[v16];
        var v22 = codecVersion ^ v21;
        rpcKey[v16] = v22;
        ++v16;
        v17 = v16;
    }
    while (1) {
        if (v9 >= targetUrlBytes.length) break;
        var v26 = v9 % rpcKey.length;
        rpcKey[v26] ^= targetUrlBytes[v9];
        ++v9;
    }
    return rpcKey;
}

function cryptRpc(payload, rpcKey) {
    var rpc = new Uint8Array(payload);
    var v3 = 1;
    var v5 = 0;
    while (1) {
        if (v5 >= rpc.length) break;
        var v6 = v3 % rpcKey.length;
        rpc[v3++] ^= rpcKey[v6];
        v5 = v3;
    }
    return rpc;
}

function decodeEnterWorldRequest(payload) {
    const reader = new BinaryReader(payload, 1);
    const enterWorldRequest = new EnterWorldRequest();
    enterWorldRequest.displayName = reader.readString();
    enterWorldRequest.version = reader.readUint32();
    enterWorldRequest.proofOfWork = reader.readArrayUint8();
    return enterWorldRequest;
}

function decodeEnterWorldResponse(payload) {
    const reader = new BinaryReader(payload, 1);
    const enterWorldResponse = new EnterWorldResponse();
    enterWorldResponse.version = reader.readUint32();
    enterWorldResponse.allowed = reader.readUint32();
    enterWorldResponse.uid = reader.readUint32();
    enterWorldResponse.startingTick = reader.readUint32();
    enterWorldResponse.tickRate = reader.readUint32();
    enterWorldResponse.effectiveTickRate = reader.readUint32();
    enterWorldResponse.players = reader.readUint32();
    enterWorldResponse.maxPlayers = reader.readUint32();
    enterWorldResponse.chatChannel = reader.readUint32();
    enterWorldResponse.effectiveDisplayName = reader.readString();
    enterWorldResponse.x1 = reader.readInt32();
    enterWorldResponse.y1 = reader.readInt32();
    enterWorldResponse.x2 = reader.readInt32();
    enterWorldResponse.y2 = reader.readInt32();
    const entityCount = reader.readUint32();
    for (let i = 0; i < entityCount; i++) {
        const entityMap = new EntityMap();
        entityMap.id = reader.readUint32();
        const attributesCount = reader.readUint32();
        for (let j = 0; j < attributesCount; j++) {
            const entityMapAttribute = new EntityMapAttribute();
            entityMapAttribute.internalType = reader.readUint32();
            entityMapAttribute.type = reader.readUint32();
            // Read values out of reader to void them
            // Can't be bothered to figure out entity maps right now
            switch (entityMapAttribute.type) {
                case 1:
                    reader.readUint32();
                    break;
                case 2:
                    reader.readInt32();
                    break;
                case 3:
                    reader.readInt32();
                    break;
                case 4:
                    reader.readString();
                    break;
                case 5:
                    reader.readVector2();
                    break;
                case 7:
                    reader.readArrayVector2();
                    break;
                case 8:
                    reader.readArrayUint32();
                    break;
                case 9:
                    reader.readUint16();
                    break;
                case 10:
                    reader.readUint8();
                    break;
                case 11:
                    reader.readInt16();
                    break;
                case 12:
                    reader.readInt8();
                    break;
                case 16:
                    reader.readArrayInt32();
                    break;
                case 17:
                    reader.readArrayUint8();
                    break;
            }
            entityMap.attributes.push(entityMapAttribute);
        }
        enterWorldResponse.entities.push(entityMap);
    }
    const rpcCount = reader.readUint32();
    for (let i = 0; i < rpcCount; i++) {
        const rpc = new Rpc();
        rpc.index = i;
        rpc.internalId = reader.readUint32();
        const parameterCount = reader.readUint8();
        rpc.unknownBool1 = reader.readUint8() != 0;
        for (let j = 0; j < parameterCount; j++) {
            const rpcParameter = new RpcParameter();
            rpcParameter.id = reader.readUint32();
            rpcParameter.type = reader.readUint8();
            rpcParameter.internalId = -1;
            rpc.parameters.push(rpcParameter);
        }
        enterWorldResponse.rpcs.push(rpc);
    }
    if (reader.canRead()) {
        enterWorldResponse.mode = reader.readString();
    }
    if (reader.canRead()) {
        enterWorldResponse.map = reader.readString();
    }
    if (reader.canRead()) {
        enterWorldResponse.udpCookie = reader.readUint32();
    }
    if (reader.canRead()) {
        enterWorldResponse.udpPort = reader.readUint32();
    }
    return enterWorldResponse;
}

class EnterWorldRequest {
    constructor() {
        this.displayName = null;
        this.version = null;
        this.proofOfWork = null;
    }
}

class EnterWorldResponse {
    constructor() {
        this.version = null;
        this.allowed = null;
        this.uid = null;
        this.startingTick = null;
        this.tickRate = null;
        this.effectiveTickRate = null;
        this.players = null;
        this.maxPlayers = null;
        this.chatChannel = null;
        this.effectiveDisplayName = null;
        this.x1 = null;
        this.y1 = null;
        this.x2 = null;
        this.y2 = null;
        this.entities = [];
        this.rpcs = [];
        this.mode = null;
        this.map = null;
        this.udpCookie = null;
        this.udpPort = null;
    }
}

class EntityMap {
    constructor() {
        this.id = null;
        this.attributes = [];
    }
}

class EntityMapAttribute {
    constructor() {
        this.internalType = null;
        this.type = null;
    }
}

class Rpc {
    constructor() {
        this.index = null;
        this.internalId = null;
        this.unknownBool1 = null;
        this.parameters = [];
    }
}

class RpcParameter {
    constructor() {
        this.id = null;
        this.type = null;
        this.internalId = null;
    }
}

class BinaryReader {
    constructor(uint8array, offset) {
        this.view = new DataView(uint8array.buffer);
        this.offset = offset || 0;
        this.decoder = new TextDecoder();
    }

    canRead() {
        return this.offset <= this.view.byteLength;
    }

    readUint8() {
        const value = this.view.getUint8(this.offset);
        this.offset++;
        return value;
    }

    readInt32() {
        const value = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readInt64() {
        const value = this.view.getBigInt64(this.offset, true);
        this.offset += 8;
        return value;
    }

    readFloat() {
        const value = this.readUint32();
        return value;
    }

    readUint32() {
        const value = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readUint64() {
        const value = this.view.getBigUint64(this.offset, true);
        this.offset += 8;
        return value;
    }

    readString() {
        const length = this.readUint8();
        let value = "";
        for (let i = 0; i < length; i++) {
            const charCode = this.view.getUint8(this.offset + i);
            value += String.fromCharCode(charCode);
        }
        this.offset += length;
        return value;
    }

    readUint8Vector2() {
        const x = this.readUint8();
        const y = this.readUint8();
        return { x, y };
    }

    readVector2() {
        const x = this.readInt32();
        const y = this.readInt32();
        return { x, y };
    }

    readArrayVector2() {
        const length = this.readInt32();
        const result = [];
        for (let i = 0; i < length; i++) {
            result.push(this.readVector2());
        }
        return result;
    }

    readArrayUint32() {
        const length = this.readInt32();
        const result = new Array(length);
        for (let i = 0; i < length; i++) {
            result[i] = this.readUint32();
        }
        return result;
    }

    readUint16() {
        const value = this.view.getUint16(this.offset);
        this.offset += 2;
        return value;
    }

    readInt16() {
        const value = this.view.getInt16(this.offset);
        this.offset += 2;
        return value;
    }

    readInt8() {
        const value = this.view.getInt8(this.offset);
        this.offset += 1;
        return value;
    }

    readArrayInt32() {
        const length = this.readInt32();
        const result = new Array(length);
        for (let i = 0; i < length; i++) {
            result[i] = this.readInt32();
        }
        return result;
    }

    readArrayUint8() {
        const length = this.readUint8();
        const result = new Array(length);
        for (let i = 0; i < length; i++) {
            result[i] = this.readUint8();
        }
        return result;
    }
}

class BinaryWriter {
    constructor(bufferLength) {
        this.view = new DataView(new ArrayBuffer(bufferLength));
        this.offset = 0;
    }

    checkBufferSize(requiredSize) {
        const newLength = this.offset + requiredSize;
        if (newLength > this.view.byteLength) {
            const newBuffer = new ArrayBuffer(newLength * 2); // Double the buffer size
            const newView = new Uint8Array(newBuffer);
            newView.set(new Uint8Array(this.view.buffer));
            this.view = new DataView(newBuffer);
        }
    }

    writeUint8(value) {
        this.checkBufferSize(1);
        this.view.setUint8(this.offset, value);
        this.offset += 1;
    }

    writeInt32(value) {
        this.checkBufferSize(4);
        this.view.setInt32(this.offset, value, true);
        this.offset += 4;
    }

    writeInt64(value) {
        this.checkBufferSize(8);
        this.view.setBigInt64(this.offset, value, true);
        this.offset += 8;
    }

    writeUint32(value) {
        this.checkBufferSize(4);
        this.view.setUint32(this.offset, value, true);
        this.offset += 4;
    }

    writeUint64(value) {
        this.checkBufferSize(8);
        this.view.setBigUint64(this.offset, value, true);
        this.offset += 8;
    }

    writeFloat(value) {
        this.checkBufferSize(4);
        this.view.setUint32(this.offset, value, true);
        this.offset += 4;
    }

    writeString(value) {
        const length = value.length;
        this.writeUint8(length);
        this.checkBufferSize(length);
        for (let i = 0; i < length; i++) {
            this.view.setUint8(this.offset + i, value.charCodeAt(i));
        }
        this.offset += length;
    }

    writeUint8Vector2(vector) {
        this.writeUint8(vector.x);
        this.writeUint8(vector.y);
    }

    writeVector2(vector) {
        this.writeInt32(vector.x);
        this.writeInt32(vector.y);
    }

    writeArrayVector2(array) {
        this.writeInt32(array.length);
        for (const vector of array) {
            this.writeVector2(vector);
        }
    }

    writeArrayUint32(array) {
        this.writeInt32(array.length);
        for (const value of array) {
            this.writeUint32(value);
        }
    }

    writeUint16(value) {
        this.checkBufferSize(2);
        this.view.setUint16(this.offset, value, true);
        this.offset += 2;
    }

    writeInt16(value) {
        this.checkBufferSize(2);
        this.view.setInt16(this.offset, value, true);
        this.offset += 2;
    }

    writeInt8(value) {
        this.checkBufferSize(1);
        this.view.setInt8(this.offset, value);
        this.offset += 1;
    }

    writeArrayInt32(array) {
        this.writeInt32(array.length);
        for (const value of array) {
            this.writeInt32(value);
        }
    }

    writeArrayUint8(array) {
        this.writeUint8(array.length);
        for (const value of array) {
            this.writeUint8(value);
        }
    }

    writeUint8Array(uint8array) {
        for (const value of uint8array) {
            this.writeUint8(value);
        }
    }

    toArray() {
        return new Uint8Array(this.view.buffer, 0, this.offset);
    }
}

import { WebSocket } from "ws";
import { EventEmitter } from "node:events"
// import { inspect } from "node:util"
import { Chalk } from "chalk";

import { PacketId, ParameterType, SetSkinRpc, InputRpc, DataRpc, SchemaProp } from "./rpctypes.js";
// import { ApiServer } from "./apitypes.js";
import { Codec } from "./codec.js";

const chalk = new Chalk();

export class GameServer extends EventEmitter {
    constructor(server, platform, codecVersion, displayName) {
        super();
        
        this.socket = null;
        this.codec = new Codec();

        const url = `wss://${server.hostnameV4}/${server.endpoint}`;
        console.log(chalk.magenta(url))
        this.socket = new WebSocket(url);
        this.socket.binaryType = "arraybuffer";

        this.socket.on("open", () => {
            // Ping
            this.socket.send(new Uint8Array([7, 0]));
            // EnterWorldRequest
            const pow = this.codec.generateProofOfWork(server.endpoint, platform, server.discreteFourierTransformBias);
            const enterWorldRequest = Buffer.alloc(7 + Buffer.byteLength(displayName) + pow.length);
            enterWorldRequest.writeUint8(4, 0);
            enterWorldRequest.writeUint8(Buffer.byteLength(displayName), 1);
            enterWorldRequest.write(displayName, 2);
            enterWorldRequest.writeUint32LE(codecVersion, 2 + Buffer.byteLength(displayName));
            enterWorldRequest.writeUint8(pow.length, 6 + Buffer.byteLength(displayName));
            enterWorldRequest.set(pow, 7 + Buffer.byteLength(displayName));
            this.socket.send(new Uint8Array(enterWorldRequest));

            this.codec.rpcKey = this.codec.computeRpcKey(codecVersion, new TextEncoder().encode("/" + server.endpoint), pow);
        });
        
        this.socket.on("message", (data) => {
            const view = new DataView(data);
            switch (view.getUint8(0)) {
                case PacketId.EnterWorld: {
                    this.codec.enterWorldResponse = this.codec.decodeEnterWorldResponse(new Uint8Array(data));
                    this.emit("EnterWorldResponse", this.codec.enterWorldResponse);
                    break;
                }
                /*
                case PacketId.Rpc: {
                    const decryptedData = this.codec.cryptRpc(new Uint8Array(data));
                    this.emit("Rpc", decryptedData);

                    const definition = this.codec.enterWorldResponse.rpcs.find((rpc) => rpc.index === decryptedData[1]);
                    switch (definition?.internalId) {
                        case 0x3e546767: {
                            const rpc = this.codec.decodeRpc(definition, [
                                { name: "uid", type: ParameterType.Uint32, key: 0x18c4cd21 },
                                { name: "channel", type: 3, id: 3362587220 },
                                { name: "displayName", type: 3, id: 3359916923 },
                                { name: "message", type: 3, id: 2563118370 }
                            ], decryptedData);
                            this.emit("ReceiveChatMessageRpc", rpc);
                            break;
                        }
                        case 0x74f9807a: {
                            const rpc = this.codec.decodeRpc(definition, [{ name: "json", type: 3 }], decryptedData);
                            this.emit("LoginResponseRpc", rpc);
                            break;
                        }
                        case 0xa240bb6: {
                            const rpc = this.codec.decodeRpc(definition, [
                                { name: "status", type: ParameterType.String },
                                { name: "countDownEndsTick", type: ParameterType.Uint32 }
                            ], decryptedData);
                            this.emit("GameStatusRpc", rpc);
                            break;
                        }
                        case 0xe6c78ca7: {
                            const rpc = this.codec.decodeRpc(definition, [
                                { name: "dataName", type: ParameterType.String },
                                { name: "json", type: ParameterType.CompressedString }
                            ], decryptedData);
                            this.emit("DataRpc", rpc);
                            break;
                        }
                        default: {
                            // console.log(definition?.internalId?.toString(16), this.autoDecodeRpc(definition, decryptedData));
                            break;
                        }
                    }
                    break;
                }
                */
                case PacketId.EntityUpdate: {
                    const entityUpdate = this.codec.decodeEntityUpdate(new Uint8Array(data));
                    // console.log(inspect(entityUpdate, false, null, true));
                    this.emit("EntityUpdate", entityUpdate);
                    break;
                }
            }
        });

        this.socket.on("close", (code) => {
            console.log(chalk.red("Bot disconnected from game server"), `(${code})`);
        });
    }
    
    setPlatformRpc(platform) {
        this.send(
            this.codec.encodeRpc(0xea4ed905, [
                { type: ParameterType.String, value: platform }
            ])
        );
    }

    sendChatMessageRpc(channel, message) {
        this.send(
            this.codec.encodeRpc(0xf05e0cea, [
                { type: ParameterType.String, id: 327657555, value: channel },
                { type: ParameterType.String, id: 917428224, value: message }
            ])
        );
    }

    setEmoteRpc(emote, emote2) {
        this.send(
            this.codec.encodeRpc(0x9cd9984f, [
                { type: ParameterType.Uint32, value: emote, key: 0xb78b33c1 }
            ])
        );
    }

    loginRpc(userKey) {
        this.send(
            this.codec.encodeRpc(0x9486bed9, [
                { type: ParameterType.String, value: userKey }
            ])
        );
    }

    joinTeamRpc(key, players) {
        this.send(
            this.codec.encodeRpc(0xf70a167b, [
                { type: ParameterType.String, value: key },
                { type: ParameterType.Uint32, value: players, key: 0x8c828760 }
            ])
        );
    }

    setSkinRpc(rpcs) {
        this.send(
            this.codec.encodeRpcArray(0x459485c, [
                { name: "skinId", type: ParameterType.Uint32, id: 3673946019, key: 0x2625c214 },
                { name: "slot", type: ParameterType.Uint32, id: 621585565, key: 0x8aba3ed },
                { name: "subSlot", type: ParameterType.Uint32, id: 375384811, key: 0x9c78f6fc }
            ],
            rpcs
        ));
    }

    parachuteRpc() {
        this.send(
            this.codec.encodeRpc(0x123a5197, [])
        );
    }

    // Params aren't needed here
    startTcpStreamRpc() {
        this.send(
            this.codec.encodeRpc(0x45abf85a, [
                { id: 3343112210, value: 0 },
                { id: 2650568001, value: 0 }
            ])
        );
    }

    setBuildingModeRpc(isBuilding) {
        this.send(
            this.codec.encodeRpc(0x19a393bd, [
                { type: ParameterType.Uint8, value: isBuilding, key: 0xf6bfb309 }
            ])
        );
    }

    inputRpc(rpc) {
        this.send(
            this.codec.encodeRpc(0x3cb524ad, [
                { type: ParameterType.Uint32, id: 875692126, value: rpc.tick, key: 0xcced0979 },
                { type: ParameterType.Uint32, id: 614051422, value: rpc.inputUid, key: 0x2b95fffe },
                { type: ParameterType.Uint32, id: 0, value: rpc.acknowledgedTickNumber, key: 0 },
                { type: ParameterType.Int8, id: 1305702976, value: rpc.isPing, key: 0xee11ec24 },
                { type: ParameterType.Int8, id: 1311631272, value: rpc.hasWorld, key: 0 },
                { type: ParameterType.Uint8, id: 1857689874, value: rpc.left, key: 0x355ea990 },
                { type: ParameterType.Uint8, id: 1725394323, value: rpc.right, key: 0x858984bb },
                { type: ParameterType.Uint8, id: 361218246, value: rpc.down, key: 0xa2ab132b },
                { type: ParameterType.Uint8, id: 365890172, value: rpc.up, key: 0x67768d9f },
                { type: ParameterType.Uint8, id: 4223989018, value: rpc.space, key: 0x47b5d5f5 },
                { type: ParameterType.Int16, id: 3209116361, value: rpc.moveDirection, key: 0x2e10e1ce },
                { type: ParameterType.Uint8, id: 2486061062, value: rpc.use, key: 0x6e0e6897 },
                { type: ParameterType.Int32, id: 3304954942, value: rpc.worldX, key: 0x90ffb48f },
                { type: ParameterType.Int32, id: 2881696461, value: rpc.worldY, key: 0xa947801e },
                { type: ParameterType.Uint32, id: 1473272673, value: rpc.distance, key: 0x8a0110f5 },
                { type: ParameterType.Uint16, id: 3000823997, value: rpc.yaw, key: 0x4441cb65 },
                { type: ParameterType.Int16, id: 2280622761, value: rpc.mouseDown, key: 0x721a5a92 },
                { type: ParameterType.Int16, id: 2981660673, value: rpc.mouseMovedWhileDown, key: 0x67cb001 },
                { type: ParameterType.Int16, id: 1662839021, value: rpc.mouseMoved, key: 0x3523121a },
                { type: ParameterType.Uint8, id: 1035244158, value: rpc.mouseUp, key: 0x8b9a38cc },
                { type: ParameterType.Float, id: 3154201459, value: rpc.moveSpeed, key: 0xddd131cd },
                { type: ParameterType.Int8, id: 3576311845, value: rpc.rightMouseDown, key: 0x748822cc },
                { type: ParameterType.Float, id: 1055678346, value: rpc.unknown_0, key: 0x634d6bd7 },
                { type: ParameterType.Float, id: 2802416676, value: rpc.unknown_1, key: 0x5bccb63a }
            ])
        );
    }

    send(data) {
        if (data) this.socket.send(data);
    }

    close() {
        this.socket.close();
    }

    getEntities() {
        return this.codec.entityList;
    }

    getPlayerByName(name) {
        for (const [uid, entity] of this.getEntities()) {
            if (entity.tick?.Name === name) return entity;
        }
        return undefined;
    }

    getEnterWorldResponse() {
        return this.codec.enterWorldResponse;
    }
}

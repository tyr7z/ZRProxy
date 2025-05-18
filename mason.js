import { EventEmitter } from "node:events";
import { WebSocket } from "ws";

export class MasonService extends EventEmitter {
    constructor() {
        super();

        this.socket = new WebSocket(
            "wss://mason-ipv4.zombsroyale.io/gateway/?EIO=4&transport=websocket"
        );

        this.socket.on("error", (err) => {
            this.emit("error", err);
        });

        this.socket.on("open", () => {
            this.emit("open");
        });

        this.socket.on("close", (code, reason) => {
            this.emit("close", code, reason);
        });

        this.socket.on("message", (data, isBinary) => {
            if (!isBinary && data.toString().startsWith("42")) {
                const parsed = JSON.parse(data.toString().slice(2));
                this.emit("any", [parsed[0], parsed[1]]);
                this.emit(parsed[0], parsed[1]);
            }
        });
    }

    close() {
        this.socket.close();
    }

    sendPing() {
        this.socket.send("2");
    }

    acceptFriendRequest(friendCode) {
        this.socket.send(`42["acceptFriendRequest", "${friendCode}"]`);
    }

    setStatus(status) {
        this.socket.send(`42["setStatus", "${status}"]`);
    }

    createParty() {
        this.socket.send(`42["createParty"]`);
    }

    deleteFriend(friendId) {
        this.socket.send(`42["deleteFriend", "${friendId}"]`);
    }

    logout() {
        this.socket.send(`42["logout"]`);
    }

    joinParty(partyKey) {
        this.socket.send(`42["joinParty", "${partyKey}"]`);
    }

    leaveParty() {
        this.socket.send(`42["leaveParty"]`);
    }

    login(userKey) {
        this.socket.send(`42["login", "${userKey}"]`);
    }

    refresh() {
        this.socket.send(`42["refresh"]`);
    }

    rejectFriendRequest(friendCode) {
        this.socket.send(`42["rejectFriendRequest", "${friendCode}"]`);
    }

    restartPartyMatchmaking() {
        this.socket.send(`42["restartPartyMatchmaking"]`);
    }

    sendClanMessage(clanId, message) {
        this.socket.send(`42["sendClanMessage", "${clanId}", "${message}"]`);
    }

    sendFriendRequest(friendCode) {
        this.socket.send(`42["sendFriendRequest", "${friendCode}"]`);
    }

    sendPartyInvite(userId) {
        this.socket.send(`42["sendPartyInvite", "${userId}"]`);
    }

    sendPrivateMessage(friendId, message) {
        this.socket.send(
            `42["sendPrivateMessage", "${friendId}", "${message}"]`
        );
    }

    setIsInRound(inRound) {
        this.socket.send(`42["setIsInRound", "${inRound}"]`);
    }

    setName(name) {
        this.socket.send(`42["setName", "${name}"]`);
    }

    setPartyAutofill(autofill) {
        this.socket.send(`42["setPartyAutofill", "${autofill}"]`);
    }

    setPartyGameMode(gameMode) {
        this.socket.send(`42["setPartyGameMode", "${gameMode}"]`);
    }

    joinTeamGameMode(gameMode) {
        this.socket.send(`42["joinTeamGameMode", "${gameMode}"]`);
    }

    setPartyRegion(region) {
        this.socket.send(`42["setPartyRegion", "${region}"]`);
    }

    joinTeamRegion(region) {
        this.socket.send(`42["joinTeamRegion", "${region}"]`);
    }

    setPartyTournamentCode(code) {
        this.socket.send(`42["setPartyTournamentCode", "${code}"]`);
    }

    joinTeamTournamentCode(code) {
        this.socket.send(`42["joinTeamTournamentCode", "${code}"]`);
    }

    setPartyVersion(version) {
        this.socket.send(`42["setPartyVersion", "${version}"]`);
    }

    joinTeamVersion(version) {
        this.socket.send(`42["joinTeamVersion", "${version}"]`);
    }

    setPlatform(platform) {
        this.socket.send(`42["setPlatform", "${platform}"]`);
    }

    setReady(ready) {
        this.socket.send(`42["setReady", "${ready}"]`);
    }

    setVersion(version) {
        this.socket.send(`42["setVersion", "${version}"]`);
    }
}

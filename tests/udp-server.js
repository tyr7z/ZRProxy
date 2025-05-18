import dgram from "node:dgram";

const server = dgram.createSocket("udp4");

server.on("message", (msg, rinfo) => {
    const hexString = msg.toString("hex").match(/.{1,2}/g)?.map(byte => byte.toUpperCase()).join(" ");

    console.log(`Server got: ${hexString} from ${rinfo.address}:${rinfo.port}`);

    const response = Buffer.from("Message received");
    server.send(response, rinfo.port, rinfo.address, (err) => {
        if (err) console.error(err);
    });
});

server.on("listening", () => {
    const address = server.address();
    console.log(`Server listening on ${address.address}:${address.port}`);
});

server.bind(1337);

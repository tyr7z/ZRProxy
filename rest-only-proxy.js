const http = require("http");
const https = require("https");
const { URL } = require("url");

const PORT = 3001;

const proxy = http.createServer((clientReq, clientRes) => {
    const targetUrl = `https://zombsroyale.io${clientReq.url}`;
    const urlObj = new URL(targetUrl);

    const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: clientReq.method,
        headers: {
            ...clientReq.headers,
            host: urlObj.hostname
        }
    };

    console.log(`→ ${clientReq.method} ${clientReq.url}`);

    const proxyReq = https.request(options, (proxyRes) => {
        console.log(`← ${proxyRes.statusCode} ${clientReq.url}`);
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(clientRes, { end: true });
    });

    proxyReq.on("error", (err) => {
        console.error(`⚠️ Proxy error on ${clientReq.url}`);
        clientRes.destroy();
    });

    clientReq.pipe(proxyReq, { end: true });
});

proxy.listen(PORT, () => {
    console.log(`Proxy server running at http://localhost:${PORT}`);
});

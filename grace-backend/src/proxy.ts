import * as http from "http";
import * as https from "https";
import * as url from "url";

export function createGraceProxyServer(): void {
  const proxyPort = 3333;

  const proxy = http.createServer(
    (clientReq: http.IncomingMessage, clientRes: http.ServerResponse) => {
      if (!clientReq.url || !clientReq.url.startsWith("/http")) {
        clientRes.writeHead(404);
        clientRes.end("Invalid url");
        return;
      }
      const parsedUrl = url.parse(clientReq.url.substring(1));

      clientReq.headers["host"] = parsedUrl.hostname;
      delete clientReq.headers["referer"];
      delete clientReq.headers["origin"];

      console.log(clientReq.headers);

      const options: http.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
        path: parsedUrl.path,
        method: clientReq.method,
        headers: clientReq.headers,
      };

      const targetProtocol = parsedUrl.protocol === "https:" ? https : http;

      const proxyReq = targetProtocol.request(
        { ...options, rejectUnauthorized: false },
        (targetRes: http.IncomingMessage) => {
          let headers = Object.entries(targetRes.headers).filter(
            (x) => !x[0].toLowerCase().startsWith("access-control-allow-")
          );
          headers.push(["Access-Control-Allow-Origin", "*"]);
          headers.push([
            "Access-Control-Allow-Methods",
            "OPTIONS, GET, POST, PUT, DELETE",
          ]);
          headers.push([
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization",
          ]);

          clientRes.writeHead(
            targetRes.statusCode || 500,
            Object.fromEntries(headers)
          );
          targetRes.pipe(clientRes, { end: true });
        }
      );

      clientReq.pipe(proxyReq, { end: true });

      proxyReq.on("error", (err: Error) => {
        console.error("Error in proxy request:", err);
        clientRes.writeHead(500);
        clientRes.end("An error occurred in the proxy server.");
      });
    }
  );

  proxy.listen(proxyPort, () => {
    console.log(`Proxy server is running on http://localhost:${proxyPort}`);
  });
}

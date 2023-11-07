const http = require('http');
const https = require('https');
const webPush = require("web-push");

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.log(
    "You must set the VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY " +
      "environment variables. You can use the following ones:"
  );
  console.log(webPush.generateVAPIDKeys());
  throw Error("no VAPID keys");
}

webPush.setVapidDetails(
  "mailto:florian@zemke.io",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

function read(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req
      .on('data', chunk => body += chunk)
      .on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
  });
}

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "*")

  console.info(req.method, req.url);

  if (req.url === '/favicon.ico') return endWithCode(res, 404);
  if (req.method === 'OPTIONS') return endWithCode(res, 200);

  if (req.url === "/key") {
    res.statusCode = 200;
    res.end(process.env.VAPID_PUBLIC_KEY);
  } else if (req.url === "/sub") {
    // TODO store subscription
    res.statusCode = 201;
  } else if (req.url === "/pub") {
    const payload = await read(req);
    console.info('pub', payload);
    webPush
      .sendNotification(payload.sub, payload.payload)
      .then(() => {
        console.info('success');
        res.statusCode = 201;
      })
      .catch(err => {
        console.error(err);
        res.statusCode = 500;
      });
    res.statusCode = 200;
    res.end();
  } else {
    res.statusCode = 200;
    res.end("web push")
  }
}).listen(3333);


const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
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

function push(sub, notification) {
  webPush
    .sendNotification(sub, JSON.stringify(notification))
    .then(() => console.info('success', notification.endpoint))
    .catch(err => console.error(err, notification.endpoint));
}

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "*");
  console.info(req.method, req.url);

  if (req.url === '/favicon.ico') return endWithCode(res, 404);
  if (req.method === 'OPTIONS') return endWithCode(res, 200);

  if (req.url === "/") {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(fs.readFileSync('./index.html'));
  } else if (req.url === "/manifest.json") {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(fs.readFileSync('./manifest.json'));
  } else if (req.url === "/sw.js") {
    res.writeHead(200, {'Content-Type': 'application/javascript'});
    res.end(fs.readFileSync('./sw.js'));
  } else if (req.url.startsWith("/icons/")) {
    const f = path.join(__dirname, req.url);
    if (fs.existsSync(f)) {
      res.writeHead(200, {'Content-Type': 'image/png'});
      res.end(fs.readFileSync(f));
    } else {
      res.statusCode = 404;
      res.end();
    }
  } else if (req.url === "/key") {
    res.statusCode = 200;
    res.end(process.env.VAPID_PUBLIC_KEY);
  } else if (req.url === "/pub") {
    const {subs, notification} = await read(req);
    console.info('pub', notification);
    for (const sub of subs) {
      console.log('sub:', sub);
      await push(sub, notification);
    }
    console.log('done');
    res.statusCode = 201;
    res.end();
  } else {
    res.statusCode = 200;
    res.end("web push")
  }
}).listen(3333);


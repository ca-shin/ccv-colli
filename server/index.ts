import express from "express";
import compression from "compression";
import type { ServerResponse } from "node:http";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const log = console.log;
const ONE_DAY_CACHE = "public, max-age=86400";
const IMMUTABLE_ASSET_CACHE = "public, max-age=31536000, immutable";

app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  const configuredHosts = [
    process.env.EXPO_PUBLIC_DOMAIN,
    "cashin-ccv-colli.onrender.com",
    "localhost:5000",
    "localhost:5001",
    "localhost:8081",
    "127.0.0.1:5000",
    "127.0.0.1:5001",
    "127.0.0.1:8081",
  ].filter(Boolean) as string[];

  const allowedHosts = new Set(
    configuredHosts.map((host) => host.replace(/^https?:\/\//, "")),
  );

  app.use((req, res, next) => {
    const origin = req.header("origin");

    if (origin) {
      try {
        const originUrl = new URL(origin);
        const requestHost = req.get("host");
        const isSameHost = requestHost && originUrl.host === requestHost;
        const isAllowedHost = allowedHosts.has(originUrl.host);

        if (isSameHost || isAllowedHost) {
          res.header("Access-Control-Allow-Origin", origin);
          res.header("Vary", "Origin");
          res.header("Access-Control-Allow-Credentials", "true");
        }
      } catch {
        // Ignore malformed Origin headers and continue without CORS opt-in.
      }
    }

    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-requested-with");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function sendCachedFile(res: Response, filePath: string, contentType: string): void {
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", ONE_DAY_CACHE);
    res.sendFile(filePath);
  } else {
    res.status(404).end();
  }
}

function setDistStaticCacheHeaders(res: ServerResponse, filePath: string): void {
  const normalizedPath = filePath.split(path.sep).join("/");

  if (normalizedPath.endsWith("/index.html")) {
    res.setHeader("Cache-Control", "no-store");
    return;
  }

  if (
    normalizedPath.includes("/dist/_expo/static/") ||
    normalizedPath.includes("/dist/assets/")
  ) {
    res.setHeader("Cache-Control", IMMUTABLE_ASSET_CACHE);
    return;
  }

  res.setHeader("Cache-Control", ONE_DAY_CACHE);
}

function setupFaviconAndManifest(app: express.Application) {
  const faviconIcoPath = path.resolve(process.cwd(), "dist", "favicon.ico");
  const faviconPath = path.resolve(process.cwd(), "assets", "images", "favicon.png");
  const faviconWebpPath = path.resolve(process.cwd(), "public", "favicon.webp");

  app.get("/favicon.ico", (_req, res) => {
    if (fs.existsSync(faviconIcoPath)) {
      return sendCachedFile(res, faviconIcoPath, "image/x-icon");
    }
    return sendCachedFile(res, faviconPath, "image/png");
  });

  app.get("/favicon.png", (_req, res) => {
    sendCachedFile(res, faviconPath, "image/png");
  });

  app.get("/favicon.webp", (_req, res) => {
    sendCachedFile(res, faviconWebpPath, "image/webp");
  });

  app.get("/sw.js", (_req, res) => {
    const swPath = path.resolve(process.cwd(), "public", "sw.js");
    const isDevelopment = process.env.NODE_ENV !== "production";
    if (isDevelopment) {
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Service-Worker-Allowed", "/");
      return res.send([
        "self.addEventListener('install', function() { self.skipWaiting(); });",
        "self.addEventListener('activate', function(event) {",
        "event.waitUntil(caches.keys().then(function(keys) {",
        "return Promise.all(keys.map(function(key) { return caches.delete(key); }));",
        "}).then(function() { return self.registration.unregister(); }).then(function() { return self.clients.claim(); }));",
        "});",
      ].join(""));
    }

    if (fs.existsSync(swPath)) {
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Service-Worker-Allowed", "/");
      res.sendFile(swPath);
    } else {
      res.status(404).end();
    }
  });

  app.get("/apple-touch-icon.png", (_req, res) => {
    const iconPath = path.resolve(process.cwd(), "assets", "images", "apple-touch-icon.png");
    sendCachedFile(res, iconPath, "image/png");
  });

  app.get("/icon.png", (_req, res) => {
    const iconPath = path.resolve(process.cwd(), "assets", "images", "icon.png");
    sendCachedFile(res, iconPath, "image/png");
  });

  app.get("/site.webmanifest", (_req, res) => {
    const manifest = {
      name: "Camera Con Vista - Colli",
      short_name: "CCV Colli",
      description: "Menu digitale Camera Con Vista - Colli",
      start_url: "/",
      display: "standalone",
      background_color: "#FFF4EA",
      theme_color: "#722F37",
      id: "/",
      scope: "/",
      icons: [
      {
        src: "/favicon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ],
    };
    res.setHeader("Content-Type", "application/manifest+json");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.json(manifest);
  });
}

function setupWebDevProxy(app: express.Application) {
  log("Dev mode: proxying non-API requests to the web dev server on port 8081");

  const webDevProxy = createProxyMiddleware({
    target: "http://localhost:8081",
    changeOrigin: true,
    ws: true,
    on: {
      error: (err, req, res) => {
        log("Web dev proxy error:", (err as Error).message);
        if (res && "status" in res) {
          (res as Response).status(502).send("Web dev server not reachable");
        }
      },
    },
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) return next();
    return webDevProxy(req, res, next);
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "public")));
}

function configureWebServing(app: express.Application) {
  if (process.env.NODE_ENV !== "production") {
    setupWebDevProxy(app);
    return;
  }

  const distPath = path.resolve(process.cwd(), "dist");
  const distIndexPath = path.resolve(distPath, "index.html");
  const hasWebBuild = fs.existsSync(distIndexPath);

  if (hasWebBuild) {
    log("Web build detected — serving web bundle from dist/");
    app.use(express.static(distPath, {
      index: false,
      setHeaders: setDistStaticCacheHeaders,
    }));
    return;
  }

  log("Production web build missing — dist/index.html not found");
  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "public")));
}

function buildPwaIndexHtml(indexHtml: string): string {
  const pwaHead = [
    '<meta name="description" content="Menu digitale Camera Con Vista - Colli" />',
    '<meta name="theme-color" content="#722F37" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    '<meta name="apple-mobile-web-app-title" content="CCV Colli" />',
    '<link rel="icon" type="image/webp" href="/favicon.webp" />',
    '<link rel="alternate icon" type="image/png" href="/favicon.png" />',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
    '<link rel="manifest" href="/site.webmanifest" />',
  ].join("");

  const serviceWorkerScript = [
    "<script>",
    "if('serviceWorker' in navigator){",
    "var r=function(){",
    "var isLocal=location.hostname==='localhost'||location.hostname==='127.0.0.1';",
    "if(isLocal){",
    "navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(reg){reg.unregister();});}).catch(function(){});",
    "if('caches' in window){caches.keys().then(function(keys){keys.forEach(function(key){caches.delete(key);});}).catch(function(){});}",
    "return;",
    "}",
    "navigator.serviceWorker.register('/sw.js').catch(function(){});",
    "};",
    "if(document.readyState==='complete'){r();}else{window.addEventListener('load',r);}",
    "}",
    "</script>",
  ].join("");

  let html = indexHtml.replace("<html lang=\"en\">", "<html lang=\"it\">");
  html = html.replace("<title>Camera Con Vista</title>", "<title>Camera Con Vista - Colli</title>");

  if (!html.includes("/site.webmanifest")) {
    html = html.replace("</head>", `${pwaHead}</head>`);
  }

  if (!html.includes("navigator.serviceWorker.register('/sw.js')")) {
    html = html.replace("</body>", `${serviceWorkerScript}</body>`);
  }

  return html;
}

function setupSpaFallback(app: express.Application) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const distIndexPath = path.resolve(process.cwd(), "dist", "index.html");
  if (fs.existsSync(distIndexPath)) {
    app.use((req: Request, res: Response) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ message: "Not Found" });
      }

      fs.readFile(distIndexPath, "utf8", (err, html) => {
        if (err) {
          return res.status(500).send("Unable to load web app");
        }

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        return res.send(buildPwaIndexHtml(html));
      });
    });
    log("SPA fallback enabled — all non-API routes → dist/index.html");
  }
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

(async () => {
  // Enable gzip compression - reduce payload 70%+
  app.use(compression());
  
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  setupFaviconAndManifest(app);
  configureWebServing(app);

  const server = await registerRoutes(app);

  setupSpaFallback(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();

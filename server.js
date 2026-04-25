import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const INDEX_FILE = path.join(DIST_DIR, 'index.html');
const parsedPort = Number(process.env.PORT);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

const PUBLIC_ENV_KEYS = [
  'VITE_API_BASE_URL',
  'VITE_YANDEX_MAPS_API_KEY',
  'VITE_YANDEX_GEOCODER_API_KEY',
  'VITE_YANDEX_MAPS_LANG',
];

const MIME_BY_EXTENSION = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function getPublicEnv() {
  return PUBLIC_ENV_KEYS.reduce((config, key) => {
    const value = process.env[key]?.trim();

    if (value) {
      config[key] = value;
    }

    return config;
  }, {});
}

function sendRuntimeEnv(response) {
  const script = `window.__WEBMAN_ADMIN_ENV__ = Object.freeze(${JSON.stringify(getPublicEnv())});\n`;

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/javascript; charset=utf-8',
  });
  response.end(script);
}

function sendNotFound(response) {
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Not found');
}

function streamFile(response, filePath, cacheControl) {
  const extension = path.extname(filePath);
  const contentType = MIME_BY_EXTENSION.get(extension) ?? 'application/octet-stream';

  response.writeHead(200, {
    'Cache-Control': cacheControl,
    'Content-Type': contentType,
  });

  createReadStream(filePath).pipe(response);
}

async function resolveStaticFile(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(DIST_DIR, normalizedPath);
  const relativePath = path.relative(DIST_DIR, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  try {
    const fileStats = await stat(filePath);
    return fileStats.isFile() ? filePath : null;
  } catch {
    return null;
  }
}

async function ensureBuildExists() {
  await access(INDEX_FILE);
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    if (requestUrl.pathname === '/env.js') {
      sendRuntimeEnv(response);
      return;
    }

    const staticFile = await resolveStaticFile(requestUrl.pathname);

    if (staticFile) {
      const cacheControl = requestUrl.pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache';

      streamFile(response, staticFile, cacheControl);
      return;
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      streamFile(response, INDEX_FILE, 'no-cache');
      return;
    }

    sendNotFound(response);
  } catch (error) {
    console.error(error);
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Internal server error');
  }
});

await ensureBuildExists();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Webman admin server is listening on port ${PORT}.`);
});

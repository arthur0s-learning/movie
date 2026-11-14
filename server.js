const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const files = {
  "/": { name: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { name: "index.html", type: "text/html; charset=utf-8" },
  "/style.css": { name: "style.css", type: "text/css; charset=utf-8" },
};

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const file = files[pathname];

  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Page introuvable");
    return;
  }

  try {
    const content = await readFile(path.join(__dirname, file.name));
    response.writeHead(200, { "Content-Type": file.type });
    response.end(content);
  } catch (error) {
    console.error(`Impossible de lire ${file.name}:`, error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Erreur lors du chargement de la page");
  }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, "127.0.0.1", () => {
  console.log(`Site disponible sur http://localhost:${port}`);
});

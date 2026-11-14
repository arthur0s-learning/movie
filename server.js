const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { findSearch, saveSearch } = require("./db");

const files = {
  "/": { name: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { name: "index.html", type: "text/html; charset=utf-8" },
  "/style.css": { name: "style.css", type: "text/css; charset=utf-8" },
  "/script.js": { name: "script.js", type: "text/javascript; charset=utf-8" },
};

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, "http://localhost");
  const pathname = requestUrl.pathname;

  if (pathname === "/api/search") {
    const apiHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    };

    if (request.method === "OPTIONS") {
      response.writeHead(204, apiHeaders);
      response.end();
      return;
    }

    if (request.method !== "GET") {
      response.writeHead(405, apiHeaders);
      response.end(JSON.stringify({ Error: "Méthode non autorisée" }));
      return;
    }

    const title = requestUrl.searchParams.get("title")?.trim();
    if (!title || title.length > 200) {
      response.writeHead(400, apiHeaders);
      response.end(JSON.stringify({ Error: "Saisissez un titre de 1 à 200 caractères." }));
      return;
    }

    try {
      const cachedResult = await findSearch(title);
      if (cachedResult) {
        response.writeHead(200, apiHeaders);
        response.end(JSON.stringify(cachedResult));
        return;
      }
    } catch (error) {
      console.error("Impossible de lire la base de recherches:", error);
      response.writeHead(500, apiHeaders);
      response.end(JSON.stringify({ Error: "Impossible de lire la base de recherches." }));
      return;
    }

    const apiKey = process.env.OMDB_API_KEY;
    if (!apiKey) {
      response.writeHead(500, apiHeaders);
      response.end(JSON.stringify({ Error: "La clé OMDb (OMDB_API_KEY) n'est pas configurée." }));
      return;
    }

    try {
      const apiUrl = new URL("https://www.omdbapi.com/");
      apiUrl.searchParams.set("apikey", apiKey);
      apiUrl.searchParams.set("s", title);
      const apiResponse = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
      const data = await apiResponse.json();

      try {
        await saveSearch(title, data);
      } catch (error) {
        console.error("Impossible d'enregistrer le résultat OMDb:", error);
        response.writeHead(500, apiHeaders);
        response.end(JSON.stringify({ Error: "Impossible d'enregistrer le résultat de la recherche." }));
        return;
      }

      response.writeHead(200, apiHeaders);
      response.end(JSON.stringify(data));
    } catch (error) {
      console.error("La requête OMDb a échoué:", error);
      response.writeHead(502, apiHeaders);
      response.end(JSON.stringify({ Error: "Impossible de joindre OMDb pour le moment." }));
    }
    return;
  }

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

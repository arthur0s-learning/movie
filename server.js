const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const {
  findMovieDetails,
  findSearch,
  saveMovieDetails,
  saveSearch,
} = require("./db");

const files = {
  "/": { name: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { name: "index.html", type: "text/html; charset=utf-8" },
  "/style.css": { name: "style.css", type: "text/css; charset=utf-8" },
  "/script.js": { name: "script.js", type: "text/javascript; charset=utf-8" },
};

async function requestOmdb(parameters, apiKey) {
  const apiUrl = new URL("https://www.omdbapi.com/");
  apiUrl.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(parameters)) {
    apiUrl.searchParams.set(key, value);
  }

  const apiResponse = await fetch(apiUrl, {
    signal: AbortSignal.timeout(10000),
  });
  if (!apiResponse.ok) {
    throw new Error(`OMDb a répondu avec le statut ${apiResponse.status}.`);
  }
  return apiResponse.json();
}

async function enrichSearchResults(data, apiKey) {
  if (!Array.isArray(data.Search)) return data;

  const results = [];
  for (let index = 0; index < data.Search.length; index += 5) {
    const batch = data.Search.slice(index, index + 5);
    const enrichedBatch = await Promise.all(
      batch.map(async (summary) => {
        if (summary.Plot && summary.Plot !== "N/A") return summary;

        const cachedDetails = await findMovieDetails(summary.imdbID);
        if (cachedDetails) return cachedDetails;

        if (!apiKey) {
          return {
            ...summary,
            DetailsError: "La clé OMDb n'est pas configurée pour charger les détails.",
          };
        }

        try {
          const details = await requestOmdb(
            { i: summary.imdbID, plot: "full" },
            apiKey,
          );
          if (details.Response === "False") {
            console.error(
              `OMDb n'a pas fourni les détails de ${summary.imdbID}: ${details.Error}`,
            );
            return { ...summary, DetailsError: details.Error };
          }

          await saveMovieDetails(details);
          return details;
        } catch (error) {
          console.error(
            `Impossible de charger les détails de ${summary.imdbID}:`,
            error,
          );
          return {
            ...summary,
            DetailsError: "Les détails complets sont momentanément indisponibles.",
          };
        }
      }),
    );
    results.push(...enrichedBatch);
  }

  return { ...data, Search: results };
}

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

    const page = Number(requestUrl.searchParams.get("page") || 1);
    if (!Number.isInteger(page) || page < 1 || page > 10) {
      response.writeHead(400, apiHeaders);
      response.end(JSON.stringify({ Error: "La page doit être un nombre entier entre 1 et 10." }));
      return;
    }

    const apiKey = process.env.OMDB_API_KEY;
    try {
      let data = await findSearch(title, page);
      const cachedSearch = Boolean(data);
      if (!cachedSearch) {
        if (!apiKey) {
          response.writeHead(500, apiHeaders);
          response.end(
            JSON.stringify({
              Error: "La clé OMDb (OMDB_API_KEY) n'est pas configurée.",
            }),
          );
          return;
        }
        data = await requestOmdb({ s: title, page: String(page) }, apiKey);
      }

      data = await enrichSearchResults(data, apiKey);
      if (!cachedSearch && data.Search?.length) {
        await saveSearch(title, data, page);
      }

      response.writeHead(200, apiHeaders);
      response.end(JSON.stringify(data));
    } catch (error) {
      console.error("Impossible de compléter la recherche:", error);
      response.writeHead(502, apiHeaders);
      response.end(JSON.stringify({ Error: "Impossible de compléter la recherche." }));
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

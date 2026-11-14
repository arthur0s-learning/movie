const { randomUUID } = require("node:crypto");
const { readFile, rename, writeFile } = require("node:fs/promises");
const path = require("node:path");

const databasePath = path.join(__dirname, "db.json");
let pendingWrite = Promise.resolve();

async function readDatabase() {
  const contents = await readFile(databasePath, "utf8");
  const database = JSON.parse(contents);

  if (!database || !Array.isArray(database.searches)) {
    throw new Error("db.json doit contenir une collection searches.");
  }

  return database;
}

async function findSearch(title) {
  const database = await readDatabase();
  const normalizedTitle = title.trim().toLocaleLowerCase("fr");
  const cachedSearch = database.searches.findLast(
    (search) =>
      typeof search.title === "string" &&
      search.title.trim().toLocaleLowerCase("fr") === normalizedTitle &&
      search.result,
  );

  return cachedSearch?.result;
}

function saveSearch(title, result) {
  const write = pendingWrite.then(async () => {
    const database = await readDatabase();
    database.searches.push({
      id: randomUUID(),
      title,
      searchedAt: new Date().toISOString(),
      result,
    });

    const temporaryPath = `${databasePath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(database, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporaryPath, databasePath);
  });

  pendingWrite = write.then(
    () => undefined,
    () => undefined,
  );
  return write;
}

module.exports = { findSearch, saveSearch };

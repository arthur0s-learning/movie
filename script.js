const form = document.querySelector("#search-form");
const input = document.querySelector("#title-query");
const submitButton = form.querySelector('button[type="submit"]');
const results = document.querySelector("#search-results");
const searchButtonLabel = submitButton.querySelector("span");

document.querySelectorAll(".suggestion").forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    input.value = suggestion.dataset.query;
    form.requestSubmit();
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = input.value.trim();
  if (!title) return;

  results.hidden = false;
  results.replaceChildren();
  const status = document.createElement("p");
  status.className = "results-message";
  status.textContent = "On déroule le tapis rouge…";
  results.append(status);
  submitButton.disabled = true;
  searchButtonLabel.textContent = "Recherche…";

  try {
    const apiOrigin =
      window.location.protocol === "file:" ? "http://127.0.0.1:3000" : "";
    const response = await fetch(
      `${apiOrigin}/api/search?title=${encodeURIComponent(title)}`,
    );
    const data = await response.json();

    if (!response.ok || data.Response === "False") {
      throw new Error(data.Error || "La recherche a échoué.");
    }

    if (!data.Search?.length) {
      status.textContent = "Aucun résultat trouvé. Essayez un autre titre.";
      return;
    }

    const heading = document.createElement("div");
    heading.className = "results-heading";
    const headingCopy = document.createElement("div");
    const kicker = document.createElement("p");
    kicker.className = "results-kicker";
    kicker.textContent = "Votre sélection";
    const titleHeading = document.createElement("h2");
    titleHeading.textContent = `Résultats pour « ${title} »`;
    headingCopy.append(kicker, titleHeading);
    const count = document.createElement("span");
    count.className = "results-count";
    count.textContent = `${data.Search.length} titres`;
    heading.append(headingCopy, count);

    const list = document.createElement("ul");
    list.className = "movie-list";
    for (const movie of data.Search) {
      const item = document.createElement("li");
      item.className = "movie-card";
      const poster = document.createElement("div");
      poster.className = "movie-poster movie-poster--missing";
      poster.textContent = "Affiche indisponible";
      if (movie.Poster && movie.Poster !== "N/A") {
        const image = document.createElement("img");
        image.src = movie.Poster;
        image.alt = `Affiche de ${movie.Title}`;
        image.loading = "lazy";
        image.addEventListener(
          "error",
          () => {
            poster.textContent = "Affiche indisponible";
          },
          { once: true },
        );
        image.addEventListener(
          "load",
          () => poster.classList.remove("movie-poster--missing"),
          { once: true },
        );
        poster.replaceChildren(image);
      }

      const details = document.createElement("div");
      details.className = "movie-details";
      const name = document.createElement("strong");
      name.textContent = movie.Title;
      const meta = document.createElement("p");
      meta.textContent = `${movie.Year} · ${movie.Type}`;
      details.append(name, meta);
      item.append(poster, details);
      list.append(item);
    }
    results.replaceChildren(heading, list);
  } catch (error) {
    status.textContent =
      error instanceof TypeError
        ? 'Impossible de joindre le serveur. Lancez « npm run dev », puis réessayez.'
        : error.message;
  } finally {
    submitButton.disabled = false;
    searchButtonLabel.textContent = "Explorer";
  }
});

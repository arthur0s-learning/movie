const form = document.querySelector("#search-form");
const input = document.querySelector("#title-query");
const submitButton = form.querySelector('button[type="submit"]');
const results = document.querySelector("#search-results");
const searchButtonLabel = submitButton.querySelector("span");
let movies = [];
let currentSearchTitle = "";
let currentPage = 1;
let totalPages = 1;
let totalResults = 0;
let activeFilters = null;

document.querySelectorAll(".suggestion").forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    input.value = suggestion.dataset.query;
    form.requestSubmit();
  });
});

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function hasValue(value) {
  return value && value !== "N/A" && value !== "0";
}

function addMetadata(container, label, value) {
  if (!hasValue(value)) return;
  const item = createElement("div", "movie-fact");
  item.append(
    createElement("span", "movie-fact-label", label),
    createElement("span", "movie-fact-value", value),
  );
  container.append(item);
}

function makeSelect(id, label, emptyLabel, values) {
  const wrapper = createElement("label", "filter-control");
  wrapper.append(createElement("span", "filter-label", label));
  const select = document.createElement("select");
  select.id = id;
  select.append(new Option(emptyLabel, ""));
  for (const value of values) select.append(new Option(value, value));
  wrapper.append(select);
  return { wrapper, control: select };
}

function makeInput(id, label, options = {}) {
  const wrapper = createElement("label", "filter-control");
  wrapper.append(createElement("span", "filter-label", label));
  const inputControl = document.createElement("input");
  inputControl.id = id;
  inputControl.type = options.type || "text";
  inputControl.placeholder = options.placeholder || "";
  if (options.min !== undefined) inputControl.min = options.min;
  if (options.max !== undefined) inputControl.max = options.max;
  if (options.step !== undefined) inputControl.step = options.step;
  wrapper.append(inputControl);
  return { wrapper, control: inputControl };
}

function uniqueValues(values) {
  return [...new Set(values.flatMap((value) => (hasValue(value) ? value.split(",") : []))
    .map((value) => value.trim())
    .filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
}

function getYear(movie) {
  const year = Number.parseInt(movie.Year, 10);
  return Number.isFinite(year) ? year : null;
}

function getNumber(value) {
  if (!hasValue(value)) return null;
  const parsed = Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getRating(movie) {
  return getNumber(movie.imdbRating);
}

function getFilteredMovies(filters) {
  const text = filters.text.control.value.trim().toLocaleLowerCase("fr");
  const minYear = getNumber(filters.minYear.control.value);
  const maxYear = getNumber(filters.maxYear.control.value);
  const minRating = getNumber(filters.minRating.control.value);
  const minVotes = getNumber(filters.minVotes.control.value);
  const maxRuntime = getNumber(filters.maxRuntime.control.value);

  const filtered = movies.filter((movie) => {
    const year = getYear(movie);
    const rating = getRating(movie);
    const votes = getNumber(movie.imdbVotes);
    const runtime = getNumber(movie.Runtime);
    const searchable = [
      movie.Title,
      movie.Plot,
      movie.Director,
      movie.Writer,
      movie.Actors,
      movie.Genre,
    ].join(" ").toLocaleLowerCase("fr");
    const includesSelection = (field, selection) =>
      !selection ||
      (hasValue(field) &&
        field.split(",").some((value) => value.trim() === selection));

    return (
      (!text || searchable.includes(text)) &&
      (!filters.type.control.value || movie.Type === filters.type.control.value) &&
      includesSelection(movie.Genre, filters.genre.control.value) &&
      includesSelection(movie.Rated, filters.rated.control.value) &&
      includesSelection(movie.Country, filters.country.control.value) &&
      includesSelection(movie.Language, filters.language.control.value) &&
      (minYear === null || (year !== null && year >= minYear)) &&
      (maxYear === null || (year !== null && year <= maxYear)) &&
      (minRating === null || (rating !== null && rating >= minRating)) &&
      (minVotes === null || (votes !== null && votes >= minVotes)) &&
      (maxRuntime === null || (runtime !== null && runtime <= maxRuntime))
    );
  });

  const sorters = {
    rating: (a, b) => (getRating(b) ?? -1) - (getRating(a) ?? -1),
    votes: (a, b) => (getNumber(b.imdbVotes) ?? -1) - (getNumber(a.imdbVotes) ?? -1),
    "year-desc": (a, b) => (getYear(b) ?? -1) - (getYear(a) ?? -1),
    "year-asc": (a, b) => (getYear(a) ?? Number.MAX_SAFE_INTEGER) - (getYear(b) ?? Number.MAX_SAFE_INTEGER),
    title: (a, b) => a.Title.localeCompare(b.Title, "fr"),
    runtime: (a, b) => (getNumber(a.Runtime) ?? Number.MAX_SAFE_INTEGER) - (getNumber(b.Runtime) ?? Number.MAX_SAFE_INTEGER),
  };
  if (sorters[filters.sort.control.value]) {
    filtered.sort(sorters[filters.sort.control.value]);
  }
  return filtered;
}

function renderMovie(movie) {
  const card = createElement("li", "movie-card");
  const poster = createElement("div", "movie-poster movie-poster--missing", "Affiche indisponible");

  if (hasValue(movie.Poster)) {
    const image = document.createElement("img");
    image.src = movie.Poster;
    image.alt = `Affiche de ${movie.Title}`;
    image.loading = "lazy";
    image.addEventListener("load", () => poster.classList.remove("movie-poster--missing"), {
      once: true,
    });
    image.addEventListener(
      "error",
      () => {
        poster.textContent = "Affiche indisponible";
      },
      { once: true },
    );
    poster.replaceChildren(image);
  }

  const content = createElement("div", "movie-details");
  const topLine = createElement("div", "movie-topline");
  topLine.append(
    createElement("span", "movie-type", `${movie.Year || "Année inconnue"} · ${movie.Type || "Titre"}`),
  );
  if (hasValue(movie.Rated)) topLine.append(createElement("span", "movie-rated", movie.Rated));

  const heading = createElement("div", "movie-heading");
  heading.append(createElement("h3", "movie-title", movie.Title));
  if (hasValue(movie.imdbRating)) {
    const rating = createElement("span", "movie-rating");
    rating.append(createElement("span", "", "★"), ` ${movie.imdbRating}`);
    if (hasValue(movie.imdbVotes)) {
      rating.append(createElement("small", "", ` ${movie.imdbVotes} votes`));
    }
    heading.append(rating);
  }

  content.append(topLine, heading);
  if (hasValue(movie.Plot)) {
    content.append(createElement("p", "movie-plot", movie.Plot));
  }

  if (hasValue(movie.Genre)) {
    const genres = createElement("div", "movie-genres");
    for (const genre of movie.Genre.split(",").map((value) => value.trim())) {
      genres.append(createElement("span", "genre-tag", genre));
    }
    content.append(genres);
  }

  const facts = createElement("div", "movie-facts");
  addMetadata(facts, "Réalisation", movie.Director);
  addMetadata(facts, "Scénario", movie.Writer);
  addMetadata(facts, "Distribution", movie.Actors);
  addMetadata(facts, "Durée", movie.Runtime);
  addMetadata(facts, "Sortie", movie.Released);
  addMetadata(facts, "Pays", movie.Country);
  addMetadata(facts, "Langues", movie.Language);
  addMetadata(facts, "Metascore", movie.Metascore);
  addMetadata(facts, "Récompenses", movie.Awards);
  addMetadata(facts, "Box-office", movie.BoxOffice);
  addMetadata(facts, "Production", movie.Production);
  addMetadata(facts, "DVD", movie.DVD);
  addMetadata(facts, "Saisons", movie.totalSeasons);
  if (Array.isArray(movie.Ratings)) {
    for (const rating of movie.Ratings) {
      addMetadata(facts, rating.Source, rating.Value);
    }
  }
  if (facts.childElementCount) content.append(facts);

  if (movie.DetailsError) {
    content.append(createElement("p", "details-error", movie.DetailsError));
  }
  if (hasValue(movie.imdbID)) {
    const imdbLink = createElement("a", "imdb-link", "Voir sur IMDb ↗");
    imdbLink.href = `https://www.imdb.com/title/${encodeURIComponent(movie.imdbID)}/`;
    imdbLink.target = "_blank";
    imdbLink.rel = "noopener noreferrer";
    content.append(imdbLink);
  }
  if (hasValue(movie.Website)) {
    try {
      const websiteUrl = new URL(movie.Website);
      if (websiteUrl.protocol === "https:" || websiteUrl.protocol === "http:") {
        const websiteLink = createElement("a", "imdb-link", "Site officiel ↗");
        websiteLink.href = websiteUrl.href;
        websiteLink.target = "_blank";
        websiteLink.rel = "noopener noreferrer";
        content.append(websiteLink);
      }
    } catch (error) {
      console.warn(`URL de site officiel invalide pour ${movie.Title}:`, error);
    }
  }

  card.append(poster, content);
  return card;
}

function renderFilteredResults(filters) {
  const filtered = getFilteredMovies(filters);
  const count = results.querySelector(".results-count");
  count.textContent = `${filtered.length} affichés · ${totalResults} résultats · page ${currentPage}/${totalPages}`;

  const list = results.querySelector(".movie-list");
  list.replaceChildren(...filtered.map(renderMovie));
  if (filtered.length === 0) {
    list.append(createElement("li", "results-message", "Aucun film ne correspond à ces filtres."));
  }
}

function getActiveFilterValues() {
  if (!activeFilters) return {};
  return Object.fromEntries(
    Object.entries(activeFilters).map(([name, filter]) => [
      name,
      filter.control.value,
    ]),
  );
}

function renderPagination() {
  const pagination = createElement("nav", "pagination");
  pagination.setAttribute("aria-label", "Pagination des résultats");

  const previous = createElement("button", "pagination-button", "← Précédent");
  previous.type = "button";
  previous.disabled = currentPage === 1;
  previous.addEventListener("click", () => loadSearchPage(currentPage - 1));
  pagination.append(previous);

  const pageNumbers = createElement("div", "pagination-pages");
  for (let page = 1; page <= totalPages; page += 1) {
    const button = createElement("button", "pagination-page", String(page));
    button.type = "button";
    button.setAttribute("aria-label", `Page ${page}`);
    if (page === currentPage) {
      button.classList.add("pagination-page--active");
      button.setAttribute("aria-current", "page");
    }
    button.addEventListener("click", () => loadSearchPage(page));
    pageNumbers.append(button);
  }
  pagination.append(pageNumbers);

  const next = createElement("button", "pagination-button", "Suivant →");
  next.type = "button";
  next.disabled = currentPage === totalPages;
  next.addEventListener("click", () => loadSearchPage(currentPage + 1));
  pagination.append(next);
  return pagination;
}

function renderResults(data, title, page, filterValues = {}) {
  movies = data.Search;
  currentPage = page;
  totalResults = Number(data.totalResults) || movies.length;
  totalPages = Math.max(1, Math.min(10, Math.ceil(totalResults / 10)));
  results.replaceChildren();

  const heading = createElement("div", "results-heading");
  const headingCopy = createElement("div");
  headingCopy.append(
    createElement("p", "results-kicker", "Votre sélection"),
    createElement("h2", "", `Résultats pour « ${title} »`),
  );
  heading.append(
    headingCopy,
    createElement("span", "results-count"),
  );

  const filtersPanel = createElement("div", "filters-panel");
  const filtersTitle = createElement("div", "filters-title");
  filtersTitle.append(
    createElement("h3", "", "Affiner la sélection"),
    createElement("span", "", "Filtrez par les informations disponibles"),
  );
  filtersPanel.append(filtersTitle);

  const filtersGrid = createElement("div", "filters-grid");
  const filters = {
    text: makeInput("filter-text", "Titre, synopsis ou crédits", {
      placeholder: "Rechercher dans les résultats",
    }),
    type: makeSelect(
      "filter-type",
      "Type",
      "Tous les types",
      uniqueValues(movies.map((movie) => movie.Type)),
    ),
    genre: makeSelect(
      "filter-genre",
      "Genre",
      "Tous les genres",
      uniqueValues(movies.map((movie) => movie.Genre)),
    ),
    rated: makeSelect(
      "filter-rated",
      "Classification",
      "Toutes",
      uniqueValues(movies.map((movie) => movie.Rated)),
    ),
    country: makeSelect(
      "filter-country",
      "Pays",
      "Tous les pays",
      uniqueValues(movies.map((movie) => movie.Country)),
    ),
    language: makeSelect(
      "filter-language",
      "Langue",
      "Toutes les langues",
      uniqueValues(movies.map((movie) => movie.Language)),
    ),
    minYear: makeInput("filter-min-year", "Année minimum", {
      type: "number",
      min: "1888",
      max: "2100",
      placeholder: "Ex. 2000",
    }),
    maxYear: makeInput("filter-max-year", "Année maximum", {
      type: "number",
      min: "1888",
      max: "2100",
      placeholder: "Ex. 2025",
    }),
    minRating: makeInput("filter-min-rating", "Note IMDb minimum", {
      type: "number",
      min: "0",
      max: "10",
      step: "0.1",
      placeholder: "0 à 10",
    }),
    minVotes: makeInput("filter-min-votes", "Votes IMDb minimum", {
      type: "number",
      min: "0",
      placeholder: "Ex. 1000",
    }),
    maxRuntime: makeInput("filter-max-runtime", "Durée maximum (min)", {
      type: "number",
      min: "1",
      placeholder: "Ex. 150",
    }),
    sort: makeSelect("filter-sort", "Trier par", "Pertinence", [
      "Note IMDb",
      "Popularité IMDb",
      "Année (récent)",
      "Année (ancien)",
      "Titre (A–Z)",
      "Durée (courte)",
    ]),
  };
  filters.sort.control.options[1].value = "rating";
  filters.sort.control.options[2].value = "votes";
  filters.sort.control.options[3].value = "year-desc";
  filters.sort.control.options[4].value = "year-asc";
  filters.sort.control.options[5].value = "title";
  filters.sort.control.options[6].value = "runtime";

  for (const [name, value] of Object.entries(filterValues)) {
    const control = filters[name]?.control;
    if (!control || !value) continue;
    if (control instanceof HTMLSelectElement && ![...control.options].some((option) => option.value === value)) {
      control.append(new Option(value, value));
    }
    control.value = value;
  }
  activeFilters = filters;

  Object.values(filters).forEach(({ wrapper }) => filtersGrid.append(wrapper));
  filtersPanel.append(filtersGrid);
  const reset = createElement("button", "reset-filters", "Réinitialiser les filtres");
  reset.type = "button";
  reset.addEventListener("click", () => {
    Object.values(filters).forEach(({ control }) => {
      control.value = "";
    });
    renderFilteredResults(filters);
  });
  filtersPanel.append(reset);

  const list = createElement("ul", "movie-list");
  results.append(heading, filtersPanel, list);
  if (totalPages > 1) results.append(renderPagination());
  results.hidden = false;

  for (const { control } of Object.values(filters)) {
    control.addEventListener("input", () => renderFilteredResults(filters));
    control.addEventListener("change", () => renderFilteredResults(filters));
  }
  renderFilteredResults(filters);
}

async function loadSearchPage(page, { showLoading = true } = {}) {
  if (page < 1 || page > totalPages || submitButton.disabled) return;

  const filterValues = getActiveFilterValues();
  const status = createElement(
    "p",
    "results-message",
    `Chargement de la page ${page}…`,
  );
  const apiOrigin =
    window.location.protocol === "file:" ? "http://127.0.0.1:3000" : "";

  if (showLoading) {
    results.replaceChildren(status);
    results.hidden = false;
  }
  results.setAttribute("aria-busy", "true");
  submitButton.disabled = true;
  searchButtonLabel.textContent = "Chargement…";

  try {
    const response = await fetch(
      `${apiOrigin}/api/search?title=${encodeURIComponent(currentSearchTitle)}&page=${page}`,
    );
    const data = await response.json();

    if (!response.ok || data.Response === "False") {
      throw new Error(data.Error || "Le chargement de cette page a échoué.");
    }

    if (!data.Search?.length) {
      results.replaceChildren(
        createElement("p", "results-message", "Aucun résultat sur cette page."),
      );
      return;
    }

    renderResults(data, currentSearchTitle, page, filterValues);
  } catch (error) {
    results.replaceChildren(
      createElement(
        "p",
        "results-message",
        error instanceof TypeError
          ? 'Impossible de joindre le serveur. Lancez « npm run dev », puis réessayez.'
          : error.message,
      ),
    );
  } finally {
    results.setAttribute("aria-busy", "false");
    submitButton.disabled = false;
    searchButtonLabel.textContent = "Explorer";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = input.value.trim();
  if (!title) return;

  currentSearchTitle = title;
  currentPage = 1;
  totalPages = 1;
  totalResults = 0;
  activeFilters = null;
  results.replaceChildren(
    createElement(
      "p",
      "results-message",
      "Recherche des films et de leurs fiches détaillées…",
    ),
  );
  await loadSearchPage(1, { showLoading: false });
});

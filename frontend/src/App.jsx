import { useEffect, useState } from "react";
import {
  createFilm,
  deleteFilm,
  filterFilmsByRating,
  filterFilmsByYear,
  getFilms,
  searchFilms,
  updateFilm,
} from "./api";
import "./App.css";

const emptyForm = {
  title: "",
  year: new Date().getFullYear(),
  genre: "",
  director: "",
  rating: 7,
};

function App() {
  const [films, setFilms] = useState([]);
  const [page, setPage] = useState("library");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [searchTitle, setSearchTitle] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterRating, setFilterRating] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadFilms() {
    setLoading(true);
    setError("");
    try {
      const data = await getFilms();
      setFilms(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Не удалось получить фильмы. Убедись, что FastAPI запущен и CORS настроен.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFilms();
  }, []);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setPage("form");
  }

  function openEditForm(film) {
    setEditingId(film.id);
    setForm({
      title: film.title ?? "",
      year: film.year ?? "",
      genre: film.genre ?? "",
      director: film.director ?? "",
      rating: film.rating ?? 0,
    });
    setError("");
    setPage("form");
  }

  function changeForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: ["year", "rating"].includes(name) ? value : value,
    }));
  }

  async function submitForm(event) {
    event.preventDefault();
    setError("");
    const payload = {
      title: form.title.trim(),
      year: Number(form.year),
      genre: form.genre.trim(),
      director: form.director.trim(),
      rating: Number(form.rating),
    };

    try {
      if (editingId === null) {
        await createFilm(payload);
        showNotice("Фильм успешно добавлен");
      } else {
        await updateFilm(editingId, payload);
        showNotice("Изменения сохранены");
      }
      await loadFilms();
      setPage("library");
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось сохранить фильм. Проверь введённые данные.");
    }
  }

  async function removeFilm(id) {
    if (!window.confirm("Точно удалить этот фильм?")) return;
    try {
      await deleteFilm(id);
      showNotice("Фильм удалён");
      await loadFilms();
    } catch {
      setError("Не удалось удалить фильм.");
    }
  }

  async function runSearch(event) {
    event.preventDefault();
    setError("");
    if (!searchTitle.trim()) {
      await loadFilms();
      return;
    }
    setLoading(true);
    try {
      const data = await searchFilms(searchTitle.trim());
      setFilms(Array.isArray(data) ? data : data ? [data] : []);
    } catch (err) {
      setError(err.response?.data?.detail || "Ошибка поиска.");
      setFilms([]);
    } finally {
      setLoading(false);
    }
  }

  async function runFilters(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result = await getFilms();
      if (filterYear) result = await filterFilmsByYear(Number(filterYear));
      if (filterRating !== "") result = await filterFilmsByRating(Number(filterRating));
      setFilms(Array.isArray(result) ? result : result ? [result] : []);
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось применить фильтр.");
      setFilms([]);
    } finally {
      setLoading(false);
    }
  }

  function resetSearchAndFilters() {
    setSearchTitle("");
    setFilterYear("");
    setFilterRating("");
    loadFilms();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={() => setPage("library")}>
          <span className="brand-mark">F</span>
          <span>Кино<span className="brand-light">тека</span></span>
        </a>
        <nav className="navigation">
          <button className={page === "library" ? "nav-link active" : "nav-link"} onClick={() => setPage("library")}>Фильмы</button>
          <button className={page === "search" ? "nav-link active" : "nav-link"} onClick={() => setPage("search")}>Поиск</button>
          <button className="add-button" onClick={openCreateForm}>＋ Добавить фильм</button>
        </nav>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <p className="eyebrow">ВАША ЛИЧНАЯ КОЛЛЕКЦИЯ</p>
            <h1>Мир кино <span>в одном месте.</span></h1>
            <p className="hero-copy">Сохраняйте любимые фильмы, управляйте коллекцией и находите то, что хочется посмотреть.</p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="film-reel">✦</div>
            <div className="hero-caption">YOUR<br />MOVIE<br />LIBRARY</div>
          </div>
        </section>

        {notice && <div className="notice">{notice}</div>}
        {error && <div className="error-message">{error}</div>}

        {page === "library" && (
          <section>
            <div className="section-heading">
              <div><p className="eyebrow">КОЛЛЕКЦИЯ</p><h2>Все фильмы</h2></div>
              <span className="count-pill">{films.length} фильмов</span>
            </div>
            {loading ? <div className="empty-state">Загружаем фильмы…</div> : films.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">▣</div><h3>Пока здесь пусто</h3><p>Добавь первый фильм в свою коллекцию.</p><button className="primary-button" onClick={openCreateForm}>Добавить фильм</button></div>
            ) : (
              <div className="film-grid">
                {films.map((film) => (
                  <article className="film-card" key={film.id}>
                    <div className="poster">
                      <span className="poster-symbol">✦</span>
                      <span className="poster-year">{film.year}</span>
                      <span className="poster-title">{film.title}</span>
                    </div>
                    <div className="film-info">
                      <div className="film-title-row"><h3>{film.title}</h3><span className="rating">★ {Number(film.rating).toFixed(1)}</span></div>
                      <p className="film-meta">{film.genre} <span>•</span> {film.director}</p>
                      <div className="card-actions">
                        <button className="text-button" onClick={() => openEditForm(film)}>Изменить</button>
                        <button className="text-button danger" onClick={() => removeFilm(film.id)}>Удалить</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {page === "form" && (
          <section className="panel form-panel">
            <div className="section-heading"><div><p className="eyebrow">КОЛЛЕКЦИЯ</p><h2>{editingId === null ? "Новый фильм" : "Редактирование фильма"}</h2></div></div>
            <form className="film-form" onSubmit={submitForm}>
              <label>Название фильма<input name="title" value={form.title} onChange={changeForm} placeholder="Например, Интерстеллар" required maxLength="150" /></label>
              <div className="form-row">
                <label>Год выпуска<input name="year" type="number" min="1888" max="2100" value={form.year} onChange={changeForm} required /></label>
                <label>Рейтинг<input name="rating" type="number" min="0" max="10" step="0.1" value={form.rating} onChange={changeForm} required /></label>
              </div>
              <label>Жанр<input name="genre" value={form.genre} onChange={changeForm} placeholder="Фантастика" required /></label>
              <label>Режиссёр<input name="director" value={form.director} onChange={changeForm} placeholder="Кристофер Нолан" required /></label>
              <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setPage("library")}>Отмена</button><button className="primary-button" type="submit">{editingId === null ? "Добавить фильм" : "Сохранить изменения"}</button></div>
            </form>
          </section>
        )}

        {page === "search" && (
          <section className="panel">
            <div className="section-heading"><div><p className="eyebrow">ПОИСК ПО КОЛЛЕКЦИИ</p><h2>Найти фильм</h2></div></div>
            <form className="search-form" onSubmit={runSearch}>
              <label>Название фильма<input value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)} placeholder="Введите название…" /></label>
              <button className="primary-button" type="submit">Найти</button>
            </form>
            <div className="filter-divider"><span>ИЛИ ОТФИЛЬТРУЙТЕ</span></div>
            <form className="filter-form" onSubmit={runFilters}>
              <label>Год выпуска<input type="number" min="1888" max="2100" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} placeholder="Например, 2014" /></label>
              <label>Минимальный рейтинг<input type="number" min="0" max="10" step="0.1" value={filterRating} onChange={(e) => setFilterRating(e.target.value)} placeholder="Например, 8" /></label>
              <button className="primary-button" type="submit">Применить фильтр</button>
            </form>
            <button className="text-button reset-button" onClick={resetSearchAndFilters}>Сбросить и показать все фильмы</button>
            <div className="search-results">
              <div className="results-label">РЕЗУЛЬТАТЫ · {films.length}</div>
              {films.map((film) => <div className="result-row" key={film.id}><div><strong>{film.title}</strong><p>{film.year} · {film.genre} · {film.director}</p></div><span className="rating">★ {Number(film.rating).toFixed(1)}</span></div>)}
              {!loading && films.length === 0 && <p className="muted">Ничего не найдено.</p>}
            </div>
          </section>
        )}
      </main>
      <footer className="footer">КИНОТЕКА <span>·</span> Учебный проект REST API + React</footer>
    </div>
  );
}

export default App;

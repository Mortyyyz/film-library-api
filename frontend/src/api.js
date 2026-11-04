import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: { "Content-Type": "application/json" },
});

export async function getFilms(params = {}) {
  const { data } = await api.get("/films", { params });
  return data;
}

export async function createFilm(film) {
  const { data } = await api.post("/films", film);
  return data;
}

export async function updateFilm(id, film) {
  const { data } = await api.put(`/films/${id}`, film);
  return data;
}

export async function deleteFilm(id) {
  const { data } = await api.delete(`/films/${id}`);
  return data;
}

export async function searchFilms(title) {
  const { data } = await api.get(`/films/search/${encodeURIComponent(title)}`);
  return data;
}

export async function filterFilmsByYear(year) {
  const { data } = await api.get(`/films/filter/year/${year}`);
  return data;
}

export async function filterFilmsByRating(minRating) {
  const { data } = await api.get(`/films/filter/rating/${minRating}`);
  return data;
}

from contextlib import closing
import sqlite3
from typing import Optional, Literal

from fastapi import FastAPI, HTTPException, Query, Path
from pydantic import BaseModel, Field, ConfigDict

DATABASE = "films.db"

app = FastAPI(
    title="API фильмотеки",
    description="REST API для хранения, поиска и фильтрации фильмов.",
    version="1.0.0",
)


def get_connection():
    """Создаёт соединение с SQLite и возвращает строки в формате словаря."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


@app.on_event("startup")
def create_database():
    """Создаёт таблицу при первом запуске приложения."""
    with closing(get_connection()) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS films (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                year INTEGER NOT NULL CHECK(year >= 1888 AND year <= 2100),
                genre TEXT NOT NULL,
                director TEXT NOT NULL,
                rating REAL NOT NULL CHECK(rating >= 0 AND rating <= 10)
            )
            """
        )
        conn.commit()


class FilmCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200, description="Название фильма")
    year: int = Field(ge=1888, le=2100, description="Год выпуска")
    genre: str = Field(min_length=1, max_length=100)
    director: str = Field(min_length=1, max_length=150)
    rating: float = Field(ge=0, le=10, description="Рейтинг от 0 до 10")


class FilmUpdate(FilmCreate):
    pass


class Film(FilmCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


def row_to_dict(row):
    return dict(row) if row is not None else None


@app.get("/films", response_model=list[Film], tags=["Фильмы"])
def get_films(
    title: Optional[str] = Query(None, description="Часть названия фильма"),
    year: Optional[int] = Query(None, ge=1888, le=2100),
    min_rating: Optional[float] = Query(None, ge=0, le=10),
    max_rating: Optional[float] = Query(None, ge=0, le=10),
    sort_by: Literal["title", "year", "rating"] = Query("title"),
    order: Literal["asc", "desc"] = Query("asc"),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Список фильмов с поиском, фильтрацией, сортировкой и пагинацией."""
    if min_rating is not None and max_rating is not None and min_rating > max_rating:
        raise HTTPException(status_code=422, detail="min_rating не может быть больше max_rating")

    sql = "SELECT * FROM films WHERE 1=1"
    params = []

    if title:
        sql += " AND title LIKE ? COLLATE NOCASE"
        params.append(f"%{title}%")
    if year is not None:
        sql += " AND year = ?"
        params.append(year)
    if min_rating is not None:
        sql += " AND rating >= ?"
        params.append(min_rating)
    if max_rating is not None:
        sql += " AND rating <= ?"
        params.append(max_rating)

    # Имена столбцов и направление сортировки ограничены Literal, а не вводятся произвольно.
    sql += f" ORDER BY {sort_by} {order.upper()} LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with closing(get_connection()) as conn:
        rows = conn.execute(sql, params).fetchall()
    return [row_to_dict(row) for row in rows]


@app.get("/films/stats", tags=["Статистика"])
def get_stats():
    """Возвращает количество фильмов и средний рейтинг."""
    with closing(get_connection()) as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS total, ROUND(AVG(rating), 2) AS average_rating FROM films"
        ).fetchone()
    return {
        "total_films": row["total"],
        "average_rating": row["average_rating"] if row["average_rating"] is not None else 0,
    }


@app.get("/films/search/{title}", response_model=list[Film], tags=["Поиск и фильтрация"])
def search_films(title: str = Path(min_length=1, max_length=200)):
    """Ищет фильмы, в названии которых встречается переданная строка."""
    with closing(get_connection()) as conn:
        rows = conn.execute(
            "SELECT * FROM films WHERE title LIKE ? COLLATE NOCASE ORDER BY title",
            (f"%{title}%",),
        ).fetchall()
    return [row_to_dict(row) for row in rows]


@app.get("/films/filter/year/{year}", response_model=list[Film], tags=["Поиск и фильтрация"])
def filter_films_by_year(year: int = Path(ge=1888, le=2100)):
    """Возвращает фильмы указанного года выпуска."""
    with closing(get_connection()) as conn:
        rows = conn.execute(
            "SELECT * FROM films WHERE year = ? ORDER BY title", (year,)
        ).fetchall()
    return [row_to_dict(row) for row in rows]


@app.get(
    "/films/filter/rating/{min_rating}",
    response_model=list[Film],
    tags=["Поиск и фильтрация"],
)
def filter_films_by_rating(min_rating: float = Path(ge=0, le=10)):
    """Возвращает фильмы с рейтингом не ниже указанного."""
    with closing(get_connection()) as conn:
        rows = conn.execute(
            "SELECT * FROM films WHERE rating >= ? ORDER BY rating DESC",
            (min_rating,),
        ).fetchall()
    return [row_to_dict(row) for row in rows]


@app.get("/films/{film_id}", response_model=Film, tags=["Фильмы"])
def get_film(film_id: int = Path(ge=1)):
    """Возвращает один фильм по идентификатору."""
    with closing(get_connection()) as conn:
        row = conn.execute("SELECT * FROM films WHERE id = ?", (film_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Фильм не найден")
    return row_to_dict(row)


@app.post("/films", response_model=Film, status_code=201, tags=["Фильмы"])
def create_film(film: FilmCreate):
    """Добавляет новый фильм."""
    with closing(get_connection()) as conn:
        cursor = conn.execute(
            """
            INSERT INTO films (title, year, genre, director, rating)
            VALUES (?, ?, ?, ?, ?)
            """,
            (film.title.strip(), film.year, film.genre.strip(), film.director.strip(), film.rating),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM films WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row_to_dict(row)


@app.put("/films/{film_id}", response_model=Film, tags=["Фильмы"])
def update_film(film_id: int, film: FilmUpdate):
    """Полностью обновляет данные фильма."""
    with closing(get_connection()) as conn:
        existing = conn.execute("SELECT id FROM films WHERE id = ?", (film_id,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Фильм не найден")

        conn.execute(
            """
            UPDATE films
            SET title = ?, year = ?, genre = ?, director = ?, rating = ?
            WHERE id = ?
            """,
            (
                film.title.strip(), film.year, film.genre.strip(),
                film.director.strip(), film.rating, film_id
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM films WHERE id = ?", (film_id,)).fetchone()
    return row_to_dict(row)


@app.delete("/films/{film_id}", status_code=204, tags=["Фильмы"])
def delete_film(film_id: int):
    """Удаляет фильм по идентификатору."""
    with closing(get_connection()) as conn:
        cursor = conn.execute("DELETE FROM films WHERE id = ?", (film_id,))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Фильм не найден")

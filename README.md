# API фильмотеки

REST API на Python + FastAPI + SQLite для лабораторной работы (вариант 5).

## Запуск

1. Установите Python 3.10 или новее.
2. Откройте терминал в папке проекта.
3. Создайте виртуальное окружение (необязательно, но рекомендуется):

   Windows:
   ```powershell
   py -m venv .venv
   .venv\Scripts\activate
   ```

   Linux/macOS:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

4. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```
5. Запустите приложение:
   ```bash
   uvicorn main:app --reload
   ```
6. Откройте Swagger UI: http://127.0.0.1:8000/docs

База `films.db` и таблица `films` создаются автоматически при старте приложения.

## Поля фильма

- `id` — уникальный идентификатор;
- `title` — название;
- `year` — год выпуска (1888–2100);
- `genre` — жанр;
- `director` — режиссёр;
- `rating` — рейтинг от 0 до 10.

## Эндпоинты

| Метод | URL | Назначение |
|---|---|---|
| GET | `/films` | Список, фильтры, сортировка, пагинация |
| GET | `/films/{film_id}` | Фильм по ID |
| POST | `/films` | Создание |
| PUT | `/films/{film_id}` | Полное обновление |
| DELETE | `/films/{film_id}` | Удаление |
| GET | `/films/search/{title}` | Поиск по названию |
| GET | `/films/filter/year/{year}` | Фильтр по году |
| GET | `/films/filter/rating/{min_rating}` | Фильтр по минимальному рейтингу |
| GET | `/films/stats` | Количество фильмов и средний рейтинг |

## Пример создания фильма

Запрос `POST /films`, тело JSON:

```json
{
  "title": "Интерстеллар",
  "year": 2014,
  "genre": "Фантастика",
  "director": "Кристофер Нолан",
  "rating": 8.7
}
```

## Примеры запросов

- `GET /films?year=2014`
- `GET /films?min_rating=8&sort_by=rating&order=desc`
- `GET /films?title=интер&limit=5&offset=0`
- `GET /films/filter/year/2014`
- `GET /films/filter/rating/8`
- `GET /films/stats`

## Проверка ошибок

- Неизвестный ID возвращает `404 Not Found`.
- Некорректные данные (например, рейтинг 12 или год 1700) возвращают `422 Unprocessable Entity`.
- `DELETE` успешно удаляет запись и возвращает статус `204 No Content`.

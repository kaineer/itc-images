# itc-images

Docker-образы и mock-серверы для локальной разработки ITC-проектов.

| Папка | Назначение |
|-------|------------|
| [`rag-graph-mock`](./rag-graph-mock) | Mock API для фронтенда rag-graph |

## Make

```bash
make rag.backend   # поднять mock backend rag-graph (:8000)
make clean         # остановить все моки из списка MOCKS
```

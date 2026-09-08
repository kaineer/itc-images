# itc-images

Docker-образы для mock-серверов для локальной разработки ITC-проектов.

| Папка | Назначение |
|-------|------------|
| [`rag-graph-mock`](./rag-graph-mock) | Mock API для фронтенда rag-graph (:8000) |
| [`police_ai-mock`](./police_ai-mock) | Mock API для police_ai (:3000) |

## Make

```bash
make rag.backend      # mock rag-graph (:8000)
make police.backend   # mock police_ai (:3000)
make clean            # остановить все моки из списка MOCKS
```

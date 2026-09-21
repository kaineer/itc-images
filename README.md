# itc-images

Docker-образы для mock-серверов для локальной разработки ITC-проектов.

| Папка | Назначение |
|-------|------------|
| [`rag-graph-mock`](./rag-graph-mock) | Mock API для фронтенда rag-graph (:8000) |
| [`police_ai-mock`](./police_ai-mock) | Mock API для police_ai (:3000) |
| [`game-mock`](./game-mock) | Mock API для talent-id game (:8080) |
| [`mock-maps`](./mock-maps) | Mock API для maps.ai / Excursion GPT (:8080) |

## Make

```bash
make rag.backend      # mock rag-graph (:8000)
make police.backend   # mock police_ai (:3000)
make game.backend     # mock talent-id game (:8080)
make maps.backend     # mock maps.ai / Excursion GPT (:8080)
make clean            # остановить все моки из списка MOCKS
```

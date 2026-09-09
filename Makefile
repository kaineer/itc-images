CBC ?= podman-compose

# Каталоги с compose.yaml — clean гасит все из списка
MOCKS := rag-graph-mock police_ai-mock game-mock

.PHONY: rag.backend police.backend game.backend clean

rag.backend:
	$(CBC) -f ./rag-graph-mock/compose.yaml up -d --build

police.backend:
	$(CBC) -f ./police_ai-mock/compose.yaml up -d --build

game.backend:
	$(CBC) -f ./game-mock/compose.yaml up -d --build

clean:
	@for m in $(MOCKS); do \
		$(CBC) -f ./$$m/compose.yaml down; \
	done

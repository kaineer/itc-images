CBC ?= podman-compose

# Каталоги с compose.yaml — clean гасит все из списка
MOCKS := rag-graph-mock

.PHONY: rag.backend clean

rag.backend:
	$(CBC) -f ./rag-graph-mock/compose.yaml up -d --build

clean:
	@for m in $(MOCKS); do \
		$(CBC) -f ./$$m/compose.yaml down; \
	done

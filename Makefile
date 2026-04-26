.PHONY: dev api web build test e2e docker-up docker-down

dev:
	@mkdir -p data
	@echo "Starting Go API at http://127.0.0.1:8080"
	@go run ./cmd/server & api_pid=$$!; \
	trap 'kill $$api_pid 2>/dev/null || true' INT TERM EXIT; \
	echo "Starting Vite web at http://127.0.0.1:5173"; \
	npm --prefix web run dev

api:
	@mkdir -p data
	go run ./cmd/server

web:
	npm --prefix web run dev

build:
	npm --prefix web run build

test:
	go test ./...
	npm --prefix web test

e2e:
	npm --prefix web run test:e2e

docker-up:
	docker compose -f deploy/compose.yml up --build

docker-down:
	docker compose -f deploy/compose.yml down

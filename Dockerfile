FROM node:24-alpine AS web-build
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/index.html web/jsconfig.json web/postcss.config.js web/tailwind.config.js web/vite.config.js ./
COPY web/src ./src
RUN npm run build

FROM golang:1.26-alpine AS api-build
WORKDIR /app
RUN apk add --no-cache build-base
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN go test ./...
RUN go build -o /out/homelab-dashboard ./cmd/server

FROM alpine:3.22
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app && mkdir -p /data && chown -R app:app /data
COPY --from=api-build /out/homelab-dashboard /app/homelab-dashboard
COPY --from=web-build /app/dist /app/dist
COPY web/src/assets/config.json /app/web/src/assets/config.json
ENV HOMELAB_DB_PATH=/data/homelab.db
ENV HOMELAB_SEED_PATH=/app/web/src/assets/config.json
ENV HOMELAB_STATIC_DIR=/app/dist
ENV PORT=8080
EXPOSE 8080
USER app
CMD ["/app/homelab-dashboard"]

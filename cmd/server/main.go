package main

import (
	"log"
	"net/http"
	"os"

	"github.com/zouzonghua/homelab-dashboard/internal/api"
	"github.com/zouzonghua/homelab-dashboard/internal/config"
	"github.com/zouzonghua/homelab-dashboard/internal/store"
)

func main() {
	seed, err := config.LoadSeedFromEnv()
	if err != nil {
		log.Fatalf("read seed config: %v", err)
	}

	st, err := store.Open(envOrDefault("HOMELAB_DB_PATH", "data/homelab.db"), seed)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer st.Close()

	addr := ":" + envOrDefault("PORT", "8080")
	staticDir := envOrDefault("HOMELAB_STATIC_DIR", "web/dist")

	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, api.NewServer(st, staticDir)); err != nil {
		log.Fatal(err)
	}
}

func envOrDefault(name, fallback string) string {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}
	return value
}

package api

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/zouzonghua/homelab-dashboard/internal/config"
	"github.com/zouzonghua/homelab-dashboard/internal/store"
)

func NewServer(st *store.Store, staticDir string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/config", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			getConfig(w, r, st)
		case http.MethodPut:
			putConfig(w, r, st)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.Handle("/", StaticFallbackHandler(staticDir))
	return mux
}

func StaticFallbackHandler(staticDir string) http.Handler {
	files := http.FileServer(http.Dir(staticDir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Clean(r.URL.Path)
		fullPath := filepath.Join(staticDir, path)
		if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
			files.ServeHTTP(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
	})
}

func getConfig(w http.ResponseWriter, r *http.Request, st *store.Store) {
	cfg, err := st.LoadConfig(r.Context())
	if err != nil {
		http.Error(w, "load config", http.StatusInternalServerError)
		return
	}
	writeJSON(w, cfg)
}

func putConfig(w http.ResponseWriter, r *http.Request, st *store.Store) {
	var cfg config.Config
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&cfg); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	if err := st.ReplaceConfig(r.Context(), cfg); err != nil {
		http.Error(w, "save config", http.StatusInternalServerError)
		return
	}
	writeJSON(w, cfg)
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		http.Error(w, "encode JSON", http.StatusInternalServerError)
	}
}

package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	htmlpkg "html"
	"io"
	"log"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/zouzonghua/homelab-dashboard/internal/config"
	"github.com/zouzonghua/homelab-dashboard/internal/icon"
	"github.com/zouzonghua/homelab-dashboard/internal/monitor"
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
	mux.HandleFunc("/api/status", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		getStatus(w, r, st)
	})
	mux.HandleFunc("/api/status/stream", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		getStatusStream(w, r, st)
	})
	mux.HandleFunc("/api/icon", getIcon)
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

func getStatus(w http.ResponseWriter, r *http.Request, st *store.Store) {
	results, err := loadStatusResults(r.Context(), st, os.Getenv("HOMELAB_DEBUG_STATUS") == "1")
	if err != nil {
		http.Error(w, "load config", http.StatusInternalServerError)
		return
	}
	writeJSON(w, results)
}

func getStatusStream(w http.ResponseWriter, r *http.Request, st *store.Store) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	debug := os.Getenv("HOMELAB_DEBUG_STATUS") == "1"
	writeSnapshot := func() bool {
		results, err := loadStatusResults(r.Context(), st, debug)
		if err != nil {
			log.Printf("[status] stream load failed: %v", err)
			return false
		}
		if err := writeStatusEvent(w, results); err != nil {
			log.Printf("[status] stream write failed: %v", err)
			return false
		}
		flusher.Flush()
		return true
	}

	if !writeSnapshot() {
		return
	}

	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			if !writeSnapshot() {
				return
			}
		}
	}
}

func loadStatusResults(ctx context.Context, st *store.Store, debug bool) (map[string]monitor.Result, error) {
	cfg, err := st.LoadConfig(ctx)
	if err != nil {
		return nil, err
	}

	checker := monitor.NewChecker(3 * time.Second)
	results := map[string]monitor.Result{}
	if debug {
		log.Printf("[status] checking services")
	}
	for _, category := range cfg.Items {
		for _, service := range category.List {
			if !service.MonitorEnabled {
				if debug {
					log.Printf("[status] skip name=%q enabled=false url=%q", service.Name, service.URL)
				}
				continue
			}
			monitorURL := service.MonitorURL
			if monitorURL == "" {
				monitorURL = service.URL
			}
			result := checker.Check(ctx, service.Name, monitorURL)
			results[service.Name] = result
			if debug {
				log.Printf(
					"[status] name=%q target=%q status=%s code=%d duration_ms=%d error=%q",
					service.Name,
					monitorURL,
					result.Status,
					result.Code,
					result.ResponseTimeMs,
					result.Error,
				)
			}
		}
	}
	return results, nil
}

func writeStatusEvent(w io.Writer, results map[string]monitor.Result) error {
	data, err := json.Marshal(results)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "event: status\ndata: %s\n\n", data)
	return err
}

func getIcon(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	rawURL := r.URL.Query().Get("url")
	if rawURL == "" {
		http.Error(w, "url is required", http.StatusBadRequest)
		return
	}
	cacheDir := os.Getenv("HOMELAB_ICON_CACHE_DIR")
	if cacheDir == "" {
		cacheDir = filepath.Join("data", "icons")
	}
	fetcher := icon.NewFetcher(cacheDir, 3*time.Second)
	result, err := fetcher.Fetch(r.Context(), rawURL)
	if err != nil {
		writeFallbackIcon(w, rawURL, r.URL.Query().Get("name"))
		return
	}
	contentType := result.ContentType
	if contentType == "" {
		contentType = mime.TypeByExtension(filepath.Ext(result.Path))
	}
	if contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	w.Header().Set("Cache-Control", "public, max-age=86400")
	http.ServeFile(w, r, result.Path)
}

func writeFallbackIcon(w http.ResponseWriter, rawURL string, name string) {
	initial := fallbackInitial(rawURL, name)
	seed := hashString(name + ":" + rawURL)
	background := fmt.Sprintf("hsl(%d 68%% 42%%)", seed%360)
	svg := fmt.Sprintf(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%s"/><text x="32" y="40" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="28" font-weight="700" fill="#ffffff">%s</text></svg>`,
		background,
		htmlpkg.EscapeString(initial),
	)
	w.Header().Set("Content-Type", "image/svg+xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	_, _ = w.Write([]byte(svg))
}

func fallbackInitial(rawURL string, name string) string {
	source := strings.TrimSpace(name)
	if source == "" {
		if parsed, err := url.Parse(rawURL); err == nil {
			source = strings.TrimPrefix(parsed.Hostname(), "www.")
		}
	}
	if source == "" {
		return "?"
	}
	r, _ := utf8.DecodeRuneInString(source)
	return string(unicode.ToUpper(r))
}

func hashString(value string) int {
	hash := 0
	for _, r := range value {
		hash = ((hash << 5) - hash) + int(r)
		hash &= 0x7fffffff
	}
	return hash
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		http.Error(w, "encode JSON", http.StatusInternalServerError)
	}
}

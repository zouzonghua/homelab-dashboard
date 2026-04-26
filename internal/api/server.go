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
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	openapi "github.com/zouzonghua/homelab-dashboard/api"
	"github.com/zouzonghua/homelab-dashboard/internal/config"
	"github.com/zouzonghua/homelab-dashboard/internal/icon"
	"github.com/zouzonghua/homelab-dashboard/internal/monitor"
	"github.com/zouzonghua/homelab-dashboard/internal/store"
)

func NewServer(st *store.Store, staticDir string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/openapi.yaml", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
			return
		}
		getOpenAPI(w, r)
	})
	mux.HandleFunc("/api/docs", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
			return
		}
		getAPIDocs(w, r)
	})
	mux.HandleFunc("/api/v1/dashboard", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
			return
		}
		getDashboard(w, r, st)
	})
	mux.HandleFunc("/api/v1/export", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
			return
		}
		exportConfig(w, r, st)
	})
	mux.HandleFunc("/api/v1/import", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
			return
		}
		importConfig(w, r, st)
	})
	mux.HandleFunc("/api/v1/audit-logs", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
			return
		}
		listAuditLogs(w, r, st)
	})
	mux.HandleFunc("/api/v1/categories", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			listCategories(w, r, st)
		case http.MethodPost:
			createCategory(w, r, st)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
		}
	})
	mux.HandleFunc("/api/v1/categories/", func(w http.ResponseWriter, r *http.Request) {
		categoryID, ok := parseIDFromPath(w, r.URL.Path, "/api/v1/categories/")
		if !ok {
			return
		}
		switch r.Method {
		case http.MethodGet:
			getCategory(w, r, st, categoryID)
		case http.MethodPatch:
			updateCategory(w, r, st, categoryID)
		case http.MethodDelete:
			deleteCategory(w, r, st, categoryID)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
		}
	})
	mux.HandleFunc("/api/v1/services", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			listServices(w, r, st)
		case http.MethodPost:
			createService(w, r, st)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
		}
	})
	mux.HandleFunc("/api/v1/services/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/icon") {
			serviceID, ok := parseIDFromPath(w, strings.TrimSuffix(r.URL.Path, "/icon"), "/api/v1/services/")
			if !ok {
				return
			}
			if r.Method != http.MethodGet {
				writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
				return
			}
			getV1ServiceIcon(w, r, st, serviceID)
			return
		}
		serviceID, ok := parseIDFromPath(w, r.URL.Path, "/api/v1/services/")
		if !ok {
			return
		}
		switch r.Method {
		case http.MethodGet:
			getService(w, r, st, serviceID)
		case http.MethodPatch:
			updateService(w, r, st, serviceID)
		case http.MethodDelete:
			deleteService(w, r, st, serviceID)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
		}
	})
	mux.HandleFunc("/api/v1/status", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
			return
		}
		getV1Status(w, r, st)
	})
	mux.HandleFunc("/api/v1/status/stream", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
			return
		}
		getV1StatusStream(w, r, st)
	})
	mux.Handle("/", StaticFallbackHandler(staticDir))
	return mux
}

func getOpenAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/yaml; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	_, _ = w.Write(openapi.OpenAPIYAML)
}

func getAPIDocs(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = io.WriteString(w, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Homelab Dashboard API</title>
  <style>
    body { margin: 0; background: #f8fafc; color: #0f172a; }
  </style>
</head>
<body>
  <redoc spec-url="/api/openapi.yaml"></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>`)
}

func StaticFallbackHandler(staticDir string) http.Handler {
	files := http.FileServer(http.Dir(staticDir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			writeError(w, http.StatusNotFound, "not_found", "resource not found", nil)
			return
		}
		path := filepath.Clean(r.URL.Path)
		fullPath := filepath.Join(staticDir, path)
		if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
			files.ServeHTTP(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
	})
}

func getDashboard(w http.ResponseWriter, r *http.Request, st *store.Store) {
	dashboard, err := st.LoadDashboard(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "load dashboard", nil)
		return
	}
	writeJSON(w, dashboard)
}

func exportConfig(w http.ResponseWriter, r *http.Request, st *store.Store) {
	cfg, err := st.LoadConfig(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "export config", nil)
		return
	}
	w.Header().Set("Content-Disposition", `attachment; filename="homelab-dashboard-config.json"`)
	writeJSON(w, cfg)
}

func importConfig(w http.ResponseWriter, r *http.Request, st *store.Store) {
	before, _ := st.LoadConfig(r.Context())
	var cfg config.Config
	if !decodeRequest(w, r, &cfg) {
		return
	}
	if err := st.ReplaceConfig(r.Context(), cfg); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_config", "invalid config", nil)
		return
	}
	imported, err := st.LoadConfig(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "load imported config", nil)
		return
	}
	writeAuditLog(r, st, config.AuditLogCreate{
		Action:       "config.import",
		ResourceType: "config",
		ResourceID:   "1",
		Summary:      "导入仪表盘配置",
		BeforeJSON:   mustJSON(before),
		AfterJSON:    mustJSON(imported),
	})
	writeJSON(w, imported)
}

func listAuditLogs(w http.ResponseWriter, r *http.Request, st *store.Store) {
	limit, offset := parsePagination(r, 50, 200)
	query := config.AuditLogQuery{
		Action:       strings.TrimSpace(r.URL.Query().Get("action")),
		ResourceType: strings.TrimSpace(r.URL.Query().Get("resourceType")),
		ResourceID:   strings.TrimSpace(r.URL.Query().Get("resourceId")),
		Limit:        limit,
		Offset:       offset,
	}
	total, err := st.CountAuditLogs(r.Context(), query)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "count audit logs", nil)
		return
	}
	logs, err := st.ListAuditLogs(r.Context(), query)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "load audit logs", nil)
		return
	}
	writeJSON(w, config.AuditLogListResponse{
		Data:       logs,
		Pagination: newPagination(limit, offset, total, len(logs)),
	})
}

func listCategories(w http.ResponseWriter, r *http.Request, st *store.Store) {
	limit, offset := parsePagination(r, 100, 200)
	categories, err := st.ListCategories(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "load categories", nil)
		return
	}
	total := len(categories)
	categories = pageSlice(categories, limit, offset)
	writeJSON(w, config.CategoryListResponse{
		Data:       categories,
		Pagination: newPagination(limit, offset, total, len(categories)),
	})
}

func getCategory(w http.ResponseWriter, r *http.Request, st *store.Store, id int64) {
	category, err := st.GetCategory(r.Context(), id)
	writeResourceResult(w, category, err)
}

func createCategory(w http.ResponseWriter, r *http.Request, st *store.Store) {
	var category config.CategoryResource
	if !decodeRequest(w, r, &category) {
		return
	}
	if fields := validateCategory(category); len(fields) > 0 {
		writeError(w, http.StatusUnprocessableEntity, "validation", "validation failed", fields)
		return
	}
	created, err := st.CreateCategory(r.Context(), category)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "create category", nil)
		return
	}
	writeAuditLog(r, st, config.AuditLogCreate{
		Action:       "category.create",
		ResourceType: "category",
		ResourceID:   strconv.FormatInt(created.ID, 10),
		Summary:      fmt.Sprintf("创建分类 %s", created.Name),
		AfterJSON:    mustJSON(created),
	})
	writeJSONStatus(w, http.StatusCreated, created)
}

func updateCategory(w http.ResponseWriter, r *http.Request, st *store.Store, id int64) {
	before, beforeErr := st.GetCategory(r.Context(), id)
	if beforeErr != nil {
		writeStoreError(w, beforeErr)
		return
	}
	var patch config.CategoryResourcePatch
	if !decodeRequest(w, r, &patch) {
		return
	}
	if fields := validateCategoryPatch(patch); len(fields) > 0 {
		writeError(w, http.StatusUnprocessableEntity, "validation", "validation failed", fields)
		return
	}
	updated, err := st.UpdateCategory(r.Context(), id, patch)
	if err == nil {
		writeAuditLog(r, st, config.AuditLogCreate{
			Action:       "category.update",
			ResourceType: "category",
			ResourceID:   strconv.FormatInt(id, 10),
			Summary:      fmt.Sprintf("更新分类 %s", updated.Name),
			BeforeJSON:   mustJSON(before),
			AfterJSON:    mustJSON(updated),
		})
	}
	writeResourceResult(w, updated, err)
}

func deleteCategory(w http.ResponseWriter, r *http.Request, st *store.Store, id int64) {
	before, beforeErr := st.GetCategory(r.Context(), id)
	if beforeErr != nil {
		writeStoreError(w, beforeErr)
		return
	}
	if err := st.DeleteCategory(r.Context(), id); err != nil {
		writeStoreError(w, err)
		return
	}
	writeAuditLog(r, st, config.AuditLogCreate{
		Action:       "category.delete",
		ResourceType: "category",
		ResourceID:   strconv.FormatInt(id, 10),
		Summary:      fmt.Sprintf("删除分类 %s", before.Name),
		BeforeJSON:   mustJSON(before),
	})
	w.WriteHeader(http.StatusNoContent)
}

func listServices(w http.ResponseWriter, r *http.Request, st *store.Store) {
	limit, offset := parsePagination(r, 100, 200)
	var (
		services []config.ServiceResource
		err      error
	)
	if rawCategoryID := strings.TrimSpace(r.URL.Query().Get("categoryId")); rawCategoryID != "" {
		categoryID, parseErr := strconv.ParseInt(rawCategoryID, 10, 64)
		if parseErr != nil || categoryID <= 0 {
			writeError(w, http.StatusBadRequest, "invalid_query", "invalid categoryId", nil)
			return
		}
		services, err = st.ListServicesByCategory(r.Context(), categoryID)
	} else {
		services, err = st.ListServices(r.Context())
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "load services", nil)
		return
	}
	total := len(services)
	services = pageSlice(services, limit, offset)
	writeJSON(w, config.ServiceListResponse{
		Data:       services,
		Pagination: newPagination(limit, offset, total, len(services)),
	})
}

func getService(w http.ResponseWriter, r *http.Request, st *store.Store, id int64) {
	service, err := st.GetService(r.Context(), id)
	writeResourceResult(w, service, err)
}

func getV1ServiceIcon(w http.ResponseWriter, r *http.Request, st *store.Store, id int64) {
	service, err := st.GetService(r.Context(), id)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	serveIcon(w, r, service.URL, service.Name)
}

func createService(w http.ResponseWriter, r *http.Request, st *store.Store) {
	var service config.ServiceResource
	if !decodeRequest(w, r, &service) {
		return
	}
	if fields := validateService(service); len(fields) > 0 {
		writeError(w, http.StatusUnprocessableEntity, "validation", "validation failed", fields)
		return
	}
	created, err := st.CreateService(r.Context(), service)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeAuditLog(r, st, config.AuditLogCreate{
		Action:       "service.create",
		ResourceType: "service",
		ResourceID:   strconv.FormatInt(created.ID, 10),
		Summary:      fmt.Sprintf("创建服务 %s", created.Name),
		AfterJSON:    mustJSON(created),
	})
	writeJSONStatus(w, http.StatusCreated, created)
}

func updateService(w http.ResponseWriter, r *http.Request, st *store.Store, id int64) {
	before, beforeErr := st.GetService(r.Context(), id)
	if beforeErr != nil {
		writeStoreError(w, beforeErr)
		return
	}
	var patch config.ServiceResourcePatch
	if !decodeRequest(w, r, &patch) {
		return
	}
	if fields := validateServicePatch(patch); len(fields) > 0 {
		writeError(w, http.StatusUnprocessableEntity, "validation", "validation failed", fields)
		return
	}
	updated, err := st.UpdateService(r.Context(), id, patch)
	if err == nil {
		writeAuditLog(r, st, config.AuditLogCreate{
			Action:       "service.update",
			ResourceType: "service",
			ResourceID:   strconv.FormatInt(id, 10),
			Summary:      fmt.Sprintf("更新服务 %s", updated.Name),
			BeforeJSON:   mustJSON(before),
			AfterJSON:    mustJSON(updated),
		})
	}
	writeResourceResult(w, updated, err)
}

func deleteService(w http.ResponseWriter, r *http.Request, st *store.Store, id int64) {
	before, beforeErr := st.GetService(r.Context(), id)
	if beforeErr != nil {
		writeStoreError(w, beforeErr)
		return
	}
	if err := st.DeleteService(r.Context(), id); err != nil {
		writeStoreError(w, err)
		return
	}
	writeAuditLog(r, st, config.AuditLogCreate{
		Action:       "service.delete",
		ResourceType: "service",
		ResourceID:   strconv.FormatInt(id, 10),
		Summary:      fmt.Sprintf("删除服务 %s", before.Name),
		BeforeJSON:   mustJSON(before),
	})
	w.WriteHeader(http.StatusNoContent)
}

func getV1Status(w http.ResponseWriter, r *http.Request, st *store.Store) {
	results, err := loadV1StatusResults(r.Context(), st)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "load status", nil)
		return
	}
	writeJSON(w, results)
}

func getV1StatusStream(w http.ResponseWriter, r *http.Request, st *store.Store) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "internal_error", "streaming unsupported", nil)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	writeSnapshot := func() bool {
		results, err := loadV1StatusResults(r.Context(), st)
		if err != nil {
			log.Printf("[status] v1 stream load failed: %v", err)
			return false
		}
		if err := writeStatusEvent(w, results); err != nil {
			log.Printf("[status] v1 stream write failed: %v", err)
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

func loadV1StatusResults(ctx context.Context, st *store.Store) (map[string]monitor.Result, error) {
	services, err := st.ListServices(ctx)
	if err != nil {
		return nil, err
	}

	checker := monitor.NewChecker(3 * time.Second)
	results := map[string]monitor.Result{}
	for _, service := range services {
		if !service.MonitorEnabled {
			continue
		}
		monitorURL := service.MonitorURL
		if monitorURL == "" {
			monitorURL = service.URL
		}
		result := checker.Check(ctx, service.Name, monitorURL)
		results[strconv.FormatInt(service.ID, 10)] = result
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

func serveIcon(w http.ResponseWriter, r *http.Request, rawURL string, name string) {
	cacheDir := os.Getenv("HOMELAB_ICON_CACHE_DIR")
	if cacheDir == "" {
		cacheDir = filepath.Join("data", "icons")
	}
	fetcher := icon.NewFetcher(cacheDir, 3*time.Second)
	result, err := fetcher.Fetch(r.Context(), rawURL)
	if err != nil {
		writeFallbackIcon(w, rawURL, name)
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
	writeJSONStatus(w, http.StatusOK, value)
}

func writeJSONStatus(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		http.Error(w, "encode JSON", http.StatusInternalServerError)
	}
}

func decodeRequest(w http.ResponseWriter, r *http.Request, value any) bool {
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(value); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "invalid JSON", nil)
		return false
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "invalid_json", "invalid JSON", nil)
		return false
	}
	return true
}

func parseIDFromPath(w http.ResponseWriter, path string, prefix string) (int64, bool) {
	raw := strings.TrimPrefix(path, prefix)
	if raw == "" || strings.Contains(raw, "/") {
		writeError(w, http.StatusNotFound, "not_found", "resource not found", nil)
		return 0, false
	}
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusNotFound, "not_found", "resource not found", nil)
		return 0, false
	}
	return id, true
}

func parseQueryInt(r *http.Request, name string, fallback int) int {
	raw := strings.TrimSpace(r.URL.Query().Get(name))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func parsePagination(r *http.Request, defaultLimit int, maxLimit int) (int, int) {
	limit := parseQueryInt(r, "limit", defaultLimit)
	if limit <= 0 {
		limit = defaultLimit
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	offset := parseQueryInt(r, "offset", 0)
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

func newPagination(limit int, offset int, total int, pageSize int) config.Pagination {
	return config.Pagination{
		Limit:   limit,
		Offset:  offset,
		Total:   total,
		HasMore: offset+pageSize < total,
	}
}

func pageSlice[T any](items []T, limit int, offset int) []T {
	if offset >= len(items) {
		return []T{}
	}
	end := offset + limit
	if end > len(items) {
		end = len(items)
	}
	return items[offset:end]
}

func writeAuditLog(r *http.Request, st *store.Store, entry config.AuditLogCreate) {
	entry.RequestID = r.Header.Get("X-Request-Id")
	entry.UserAgent = r.UserAgent()
	entry.IPAddress = clientIP(r)
	if _, err := st.CreateAuditLog(r.Context(), entry); err != nil {
		log.Printf("[audit] write failed action=%q resource=%q id=%q: %v", entry.Action, entry.ResourceType, entry.ResourceID, err)
	}
}

func clientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		return strings.TrimSpace(strings.Split(forwarded, ",")[0])
	}
	if realIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); realIP != "" {
		return realIP
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func mustJSON(value any) string {
	data, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(data)
}

func validateCategory(category config.CategoryResource) map[string]string {
	fields := map[string]string{}
	if strings.TrimSpace(category.Name) == "" {
		fields["name"] = "required"
	}
	if strings.TrimSpace(category.Icon) == "" {
		fields["icon"] = "required"
	}
	return emptyNil(fields)
}

func validateCategoryPatch(patch config.CategoryResourcePatch) map[string]string {
	fields := map[string]string{}
	if patch.Name != nil && strings.TrimSpace(*patch.Name) == "" {
		fields["name"] = "required"
	}
	if patch.Icon != nil && strings.TrimSpace(*patch.Icon) == "" {
		fields["icon"] = "required"
	}
	if patch.Order != nil && *patch.Order < 0 {
		fields["order"] = "must be greater than or equal to 0"
	}
	return emptyNil(fields)
}

func validateService(service config.ServiceResource) map[string]string {
	fields := map[string]string{}
	if service.CategoryID <= 0 {
		fields["categoryId"] = "required"
	}
	if strings.TrimSpace(service.Name) == "" {
		fields["name"] = "required"
	}
	if strings.TrimSpace(service.URL) == "" {
		fields["url"] = "required"
	}
	if strings.TrimSpace(service.Target) == "" {
		fields["target"] = "required"
	}
	return emptyNil(fields)
}

func validateServicePatch(patch config.ServiceResourcePatch) map[string]string {
	fields := map[string]string{}
	if patch.CategoryID != nil && *patch.CategoryID <= 0 {
		fields["categoryId"] = "required"
	}
	if patch.Order != nil && *patch.Order < 0 {
		fields["order"] = "must be greater than or equal to 0"
	}
	if patch.Name != nil && strings.TrimSpace(*patch.Name) == "" {
		fields["name"] = "required"
	}
	if patch.URL != nil && strings.TrimSpace(*patch.URL) == "" {
		fields["url"] = "required"
	}
	if patch.Target != nil && strings.TrimSpace(*patch.Target) == "" {
		fields["target"] = "required"
	}
	return emptyNil(fields)
}

func writeResourceResult[T any](w http.ResponseWriter, value T, err error) {
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, value)
}

func writeStoreError(w http.ResponseWriter, err error) {
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "resource not found", nil)
		return
	}
	writeError(w, http.StatusInternalServerError, "internal_error", "request failed", nil)
}

func writeError(w http.ResponseWriter, status int, code string, message string, fields map[string]string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	type fieldError struct {
		Field   string `json:"field"`
		Message string `json:"message"`
	}
	var fieldErrors []fieldError
	if len(fields) > 0 {
		keys := make([]string, 0, len(fields))
		for field := range fields {
			keys = append(keys, field)
		}
		sort.Strings(keys)
		for _, field := range keys {
			fieldErrors = append(fieldErrors, fieldError{Field: field, Message: fields[field]})
		}
	}
	response := struct {
		Code    string       `json:"code"`
		Message string       `json:"message"`
		Fields  []fieldError `json:"fields,omitempty"`
	}{
		Code:    code,
		Message: message,
		Fields:  fieldErrors,
	}
	_ = json.NewEncoder(w).Encode(response)
}

func emptyNil(fields map[string]string) map[string]string {
	if len(fields) == 0 {
		return nil
	}
	return fields
}

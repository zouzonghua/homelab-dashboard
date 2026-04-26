package api

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/zouzonghua/homelab-dashboard/internal/config"
	"github.com/zouzonghua/homelab-dashboard/internal/store"
)

func TestRemovedAPIRoutesReturnNotFound(t *testing.T) {
	handler, cleanup := newTestHandler(t, apiSampleConfig("current"))
	defer cleanup()

	for _, route := range []struct {
		method string
		path   string
	}{
		{method: http.MethodGet, path: "/api/config"},
		{method: http.MethodPut, path: "/api/config"},
		{method: http.MethodGet, path: "/api/status"},
		{method: http.MethodGet, path: "/api/status/stream"},
		{method: http.MethodGet, path: "/api/icon"},
	} {
		req := httptest.NewRequest(route.method, route.path, nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("%s %s status = %d, want %d", route.method, route.path, rec.Code, http.StatusNotFound)
		}
		assertJSONError(t, rec, "not_found")
	}
}

func TestGetV1DashboardReturnsSettings(t *testing.T) {
	handler, cleanup := newTestHandler(t, apiSampleConfig("v1 dashboard"))
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/v1/dashboard status = %d, want %d", rec.Code, http.StatusOK)
	}

	var got struct {
		Date    string `json:"date"`
		Title   string `json:"title"`
		Columns int    `json:"columns"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got.Title != "v1 dashboard" || got.Columns != 4 {
		t.Fatalf("dashboard = %#v", got)
	}
}

func TestGetV1ExportReturnsCurrentConfig(t *testing.T) {
	handler, cleanup := newTestHandler(t, apiSampleConfig("export current"))
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/export", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/v1/export status = %d, want %d", rec.Code, http.StatusOK)
	}
	if rec.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("content type = %q, want application/json", rec.Header().Get("Content-Type"))
	}

	var got config.Config
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode export: %v", err)
	}
	if got.Title != "export current" || got.Columns != "4" || len(got.Items) != 1 || got.Items[0].List[0].Name != "One" {
		t.Fatalf("export config = %#v", got)
	}
}

func TestPutV1ImportReplacesConfig(t *testing.T) {
	handler, cleanup := newTestHandler(t, apiSampleConfig("before import"))
	defer cleanup()

	body := `{
		"date":"2026-04-26",
		"title":"after import",
		"columns":"2",
		"items":[
			{
				"name":"Imported",
				"icon":"fa-solid fa-server",
				"list":[
					{"name":"Grafana","logo":"grafana.png","url":"https://grafana.example","target":"_blank","monitorUrl":"https://grafana.example/health","monitorEnabled":true}
				]
			}
		]
	}`
	req := httptest.NewRequest(http.MethodPut, "/api/v1/import", strings.NewReader(body))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("PUT /api/v1/import status = %d, want %d, body = %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/export", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/v1/export after import status = %d, want %d", rec.Code, http.StatusOK)
	}

	var got config.Config
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode export after import: %v", err)
	}
	if got.Title != "after import" || got.Columns != "2" || len(got.Items) != 1 || got.Items[0].Name != "Imported" {
		t.Fatalf("imported config = %#v", got)
	}
	if got.Items[0].List[0].Name != "Grafana" || !got.Items[0].List[0].MonitorEnabled {
		t.Fatalf("imported service = %#v", got.Items[0].List[0])
	}
}

func TestV1CategoryAndServiceCRUD(t *testing.T) {
	handler, cleanup := newTestHandler(t, apiSampleConfig("v1 resources"))
	defer cleanup()

	categoryID := createCategoryViaAPI(t, handler, "Apps")
	serviceID := createServiceViaAPI(t, handler, categoryID, "Grafana")

	patchCategory := strings.NewReader(`{"name":"Infra"}`)
	req := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/api/v1/categories/%d", categoryID), patchCategory)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("PATCH category status = %d, want %d, body = %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	patchService := strings.NewReader(`{"name":"Metrics","monitorEnabled":false}`)
	req = httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/api/v1/services/%d", serviceID), patchService)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("PATCH service status = %d, want %d, body = %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/services", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET services status = %d, want %d", rec.Code, http.StatusOK)
	}
	var services []struct {
		ID             int64  `json:"id"`
		Name           string `json:"name"`
		MonitorEnabled bool   `json:"monitorEnabled"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&services); err != nil {
		t.Fatalf("decode services: %v", err)
	}
	if !containsService(services, serviceID, "Metrics", false) {
		t.Fatalf("services did not include patched service: %#v", services)
	}

	req = httptest.NewRequest(http.MethodDelete, fmt.Sprintf("/api/v1/services/%d", serviceID), nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("DELETE service status = %d, want %d", rec.Code, http.StatusNoContent)
	}

	req = httptest.NewRequest(http.MethodDelete, fmt.Sprintf("/api/v1/categories/%d", categoryID), nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("DELETE category status = %d, want %d", rec.Code, http.StatusNoContent)
	}
}

func TestV1DeleteCategoryCascadesServices(t *testing.T) {
	handler, cleanup := newTestHandler(t, apiSampleConfig("cascade"))
	defer cleanup()

	categoryID := createCategoryViaAPI(t, handler, "Apps")
	serviceID := createServiceViaAPI(t, handler, categoryID, "Grafana")

	req := httptest.NewRequest(http.MethodDelete, fmt.Sprintf("/api/v1/categories/%d", categoryID), nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("DELETE category status = %d, want %d", rec.Code, http.StatusNoContent)
	}

	req = httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/services/%d", serviceID), nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("GET cascaded service status = %d, want %d", rec.Code, http.StatusNotFound)
	}
	assertJSONError(t, rec, "not_found")
}

func TestGetV1StatusReturnsResultsKeyedByServiceID(t *testing.T) {
	monitored := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer monitored.Close()

	seed := apiSampleConfig("v1 status")
	seed.Items[0].List[0].MonitorEnabled = true
	seed.Items[0].List[0].MonitorURL = monitored.URL
	handler, cleanup := newTestHandler(t, seed)
	defer cleanup()

	serviceID := firstServiceID(t, handler)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/status", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/v1/status status = %d, want %d", rec.Code, http.StatusOK)
	}

	var got map[string]struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got[fmt.Sprint(serviceID)].Status != "up" {
		t.Fatalf("status = %#v, want service id %d up", got, serviceID)
	}
	if _, ok := got["One"]; ok {
		t.Fatalf("v1 status should not be keyed by service name: %#v", got)
	}
}

func TestGetV1StatusStreamEmitsResultsKeyedByServiceID(t *testing.T) {
	monitored := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer monitored.Close()

	seed := apiSampleConfig("v1 status stream")
	seed.Items[0].List[0].MonitorEnabled = true
	seed.Items[0].List[0].MonitorURL = monitored.URL
	handler, cleanup := newTestHandler(t, seed)
	defer cleanup()

	serviceID := firstServiceID(t, handler)
	server := httptest.NewServer(handler)
	defer server.Close()

	resp, err := server.Client().Get(server.URL + "/api/v1/status/stream")
	if err != nil {
		t.Fatalf("GET /api/v1/status/stream error = %v", err)
	}
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	var lines []string
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			break
		}
		lines = append(lines, line)
	}
	if err := scanner.Err(); err != nil {
		t.Fatalf("read stream: %v", err)
	}

	var got map[string]struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal([]byte(strings.TrimPrefix(lines[1], "data: ")), &got); err != nil {
		t.Fatalf("decode status event: %v", err)
	}
	if got[fmt.Sprint(serviceID)].Status != "up" {
		t.Fatalf("stream status = %#v, want service id %d up", got, serviceID)
	}
}

func TestV1JSONErrors(t *testing.T) {
	handler, cleanup := newTestHandler(t, apiSampleConfig("errors"))
	defer cleanup()

	cases := []struct {
		name   string
		method string
		path   string
		body   string
		status int
		code   string
	}{
		{name: "invalid json", method: http.MethodPost, path: "/api/v1/categories", body: `{"name":`, status: http.StatusBadRequest, code: "invalid_json"},
		{name: "validation", method: http.MethodPost, path: "/api/v1/categories", body: `{"name":"","icon":"x"}`, status: http.StatusUnprocessableEntity, code: "validation"},
		{name: "not found", method: http.MethodGet, path: "/api/v1/categories/999999", status: http.StatusNotFound, code: "not_found"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if rec.Code != tc.status {
				t.Fatalf("status = %d, want %d, body = %s", rec.Code, tc.status, rec.Body.String())
			}
			assertJSONError(t, rec, tc.code)
		})
	}
}

func TestGetV1ServiceIconUsesStoredServiceURL(t *testing.T) {
	service := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/":
			w.Header().Set("Content-Type", "text/html")
			_, _ = w.Write([]byte(`<link rel="icon" href="/favicon.svg">`))
		case "/favicon.svg":
			w.Header().Set("Content-Type", "image/svg+xml")
			_, _ = w.Write([]byte(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer service.Close()

	seed := apiSampleConfig("v1 icon")
	seed.Items[0].List[0].URL = service.URL
	handler, cleanup := newTestHandler(t, seed)
	defer cleanup()
	serviceID := firstServiceID(t, handler)

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/services/%d/icon", serviceID), nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET v1 service icon status = %d, want %d, body = %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if rec.Header().Get("Content-Type") != "image/svg+xml" {
		t.Fatalf("content type = %q, want image/svg+xml", rec.Header().Get("Content-Type"))
	}
}

func TestGetV1ServiceIconFallsBackToGeneratedSVG(t *testing.T) {
	service := httptest.NewServer(http.NotFoundHandler())
	defer service.Close()

	seed := apiSampleConfig("icon fallback")
	seed.Items[0].List[0].URL = service.URL
	handler, cleanup := newTestHandler(t, seed)
	defer cleanup()
	serviceID := firstServiceID(t, handler)

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/services/%d/icon", serviceID), nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET v1 service icon fallback status = %d, want %d, body = %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if rec.Header().Get("Content-Type") != "image/svg+xml; charset=utf-8" {
		t.Fatalf("content type = %q, want image/svg+xml; charset=utf-8", rec.Header().Get("Content-Type"))
	}
	if !strings.Contains(rec.Body.String(), ">O<") {
		t.Fatalf("fallback icon does not contain service initial: %s", rec.Body.String())
	}
}

func TestGetOpenAPIContract(t *testing.T) {
	handler, cleanup := newTestHandler(t, apiSampleConfig("contract"))
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/api/openapi.yaml", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/openapi.yaml status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/yaml; charset=utf-8" {
		t.Fatalf("content type = %q, want application/yaml; charset=utf-8", got)
	}
	if body := rec.Body.String(); !strings.Contains(body, "openapi: 3.1.0") || !strings.Contains(body, "/api/v1/dashboard:") {
		t.Fatalf("openapi body did not include expected contract markers: %s", body)
	}
}

func TestGetAPIDocsPage(t *testing.T) {
	handler, cleanup := newTestHandler(t, apiSampleConfig("docs"))
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/api/docs", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/docs status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Content-Type"); got != "text/html; charset=utf-8" {
		t.Fatalf("content type = %q, want text/html; charset=utf-8", got)
	}
	if body := rec.Body.String(); !strings.Contains(body, "Homelab Dashboard API") || !strings.Contains(body, "/api/openapi.yaml") {
		t.Fatalf("docs body did not include expected markers: %s", body)
	}
}

func newTestHandler(t *testing.T, seed config.Config) (http.Handler, func()) {
	t.Helper()
	st, err := store.Open(filepath.Join(t.TempDir(), "homelab.db"), seed)
	if err != nil {
		t.Fatalf("store.Open() error = %v", err)
	}
	return NewServer(st, t.TempDir()), func() {
		if err := st.Close(); err != nil {
			t.Fatalf("store.Close() error = %v", err)
		}
	}
}

func apiSampleConfig(title string) config.Config {
	return config.Config{
		Date:    "2022-09-07",
		Title:   title,
		Columns: "4",
		Items: []config.Category{
			{
				Name: "Group",
				Icon: "icon",
				List: []config.Service{
					{Name: "One", Logo: "one.png", URL: "https://one.example", Target: "_blank"},
				},
			},
		},
	}
}

func createCategoryViaAPI(t *testing.T, handler http.Handler, name string) int64 {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/categories", strings.NewReader(fmt.Sprintf(`{"name":%q,"icon":"icon"}`, name)))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("POST category status = %d, want %d, body = %s", rec.Code, http.StatusCreated, rec.Body.String())
	}
	var got struct {
		ID int64 `json:"id"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode category: %v", err)
	}
	return got.ID
}

func createServiceViaAPI(t *testing.T, handler http.Handler, categoryID int64, name string) int64 {
	t.Helper()
	body := fmt.Sprintf(`{"categoryId":%d,"name":%q,"logo":"logo.png","url":"https://service.example","target":"_blank","monitorEnabled":true}`, categoryID, name)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/services", strings.NewReader(body))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("POST service status = %d, want %d, body = %s", rec.Code, http.StatusCreated, rec.Body.String())
	}
	var got struct {
		ID int64 `json:"id"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode service: %v", err)
	}
	return got.ID
}

func firstServiceID(t *testing.T, handler http.Handler) int64 {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/services", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET services status = %d, want %d", rec.Code, http.StatusOK)
	}
	var services []struct {
		ID int64 `json:"id"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&services); err != nil {
		t.Fatalf("decode services: %v", err)
	}
	if len(services) == 0 {
		t.Fatal("expected at least one service")
	}
	return services[0].ID
}

func containsService(services []struct {
	ID             int64  `json:"id"`
	Name           string `json:"name"`
	MonitorEnabled bool   `json:"monitorEnabled"`
}, id int64, name string, monitorEnabled bool) bool {
	for _, service := range services {
		if service.ID == id && service.Name == name && service.MonitorEnabled == monitorEnabled {
			return true
		}
	}
	return false
}

func assertJSONError(t *testing.T, rec *httptest.ResponseRecorder, code string) {
	t.Helper()
	var got struct {
		Code    string `json:"code"`
		Message string `json:"message"`
		Fields  []struct {
			Field   string `json:"field"`
			Message string `json:"message"`
		} `json:"fields,omitempty"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode error response: %v; body = %s", err, rec.Body.String())
	}
	if got.Code != code || got.Message == "" {
		t.Fatalf("error response = %#v, want code %q with message", got, code)
	}
}

package api

import (
	"bufio"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/zouzonghua/homelab-dashboard/internal/config"
	"github.com/zouzonghua/homelab-dashboard/internal/store"
)

func TestGetConfigReturnsCurrentConfig(t *testing.T) {
	handler, cleanup := newTestHandler(t, apiSampleConfig("current"))
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/config status = %d, want %d", rec.Code, http.StatusOK)
	}

	var got config.Config
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got.Title != "current" || len(got.Items) != 1 || got.Items[0].List[0].Name != "One" {
		t.Fatalf("unexpected config: %#v", got)
	}
}

func TestPutConfigPersistsUpdate(t *testing.T) {
	handler, cleanup := newTestHandler(t, apiSampleConfig("old"))
	defer cleanup()

	update := apiSampleConfig("new")
	update.Items[0].List[0].Name = "Updated Service"
	body, err := json.Marshal(update)
	if err != nil {
		t.Fatalf("marshal update: %v", err)
	}

	putReq := httptest.NewRequest(http.MethodPut, "/api/config", bytes.NewReader(body))
	putReq.Header.Set("Content-Type", "application/json")
	putRec := httptest.NewRecorder()
	handler.ServeHTTP(putRec, putReq)
	if putRec.Code != http.StatusOK {
		t.Fatalf("PUT /api/config status = %d, want %d", putRec.Code, http.StatusOK)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	getRec := httptest.NewRecorder()
	handler.ServeHTTP(getRec, getReq)

	var got config.Config
	if err := json.NewDecoder(getRec.Body).Decode(&got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got.Title != "new" || got.Items[0].List[0].Name != "Updated Service" {
		t.Fatalf("config was not persisted: %#v", got)
	}
}

func TestPutConfigRejectsInvalidJSON(t *testing.T) {
	handler, cleanup := newTestHandler(t, apiSampleConfig("old"))
	defer cleanup()

	req := httptest.NewRequest(http.MethodPut, "/api/config", bytes.NewBufferString(`{"title":`))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("PUT invalid JSON status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestGetStatusReturnsEnabledServiceStatus(t *testing.T) {
	monitored := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer monitored.Close()

	seed := apiSampleConfig("status")
	seed.Items[0].List[0].MonitorEnabled = true
	seed.Items[0].List[0].MonitorURL = monitored.URL
	handler, cleanup := newTestHandler(t, seed)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/status status = %d, want %d", rec.Code, http.StatusOK)
	}

	var got map[string]struct {
		Status string `json:"status"`
		Code   int    `json:"code"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got["One"].Status != "up" {
		t.Fatalf("status = %#v, want One up", got)
	}
}

func TestGetStatusStreamEmitsStatusEvent(t *testing.T) {
	monitored := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer monitored.Close()

	seed := apiSampleConfig("status stream")
	seed.Items[0].List[0].MonitorEnabled = true
	seed.Items[0].List[0].MonitorURL = monitored.URL
	handler, cleanup := newTestHandler(t, seed)
	defer cleanup()

	server := httptest.NewServer(handler)
	defer server.Close()

	resp, err := server.Client().Get(server.URL + "/api/status/stream")
	if err != nil {
		t.Fatalf("GET /api/status/stream error = %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("GET /api/status/stream status = %d, want %d", resp.StatusCode, http.StatusOK)
	}
	if contentType := resp.Header.Get("Content-Type"); !strings.Contains(contentType, "text/event-stream") {
		t.Fatalf("content type = %q, want text/event-stream", contentType)
	}

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
	if len(lines) < 2 || lines[0] != "event: status" || !strings.HasPrefix(lines[1], "data: ") {
		t.Fatalf("unexpected SSE frame: %#v", lines)
	}

	var got map[string]struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal([]byte(strings.TrimPrefix(lines[1], "data: ")), &got); err != nil {
		t.Fatalf("decode status event: %v", err)
	}
	if got["One"].Status != "up" {
		t.Fatalf("stream status = %#v, want One up", got)
	}
}

func TestGetIconReturnsDiscoveredIcon(t *testing.T) {
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

	handler, cleanup := newTestHandler(t, apiSampleConfig("icon"))
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/api/icon?url="+service.URL, nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/icon status = %d, want %d, body = %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if rec.Header().Get("Content-Type") != "image/svg+xml" {
		t.Fatalf("content type = %q, want image/svg+xml", rec.Header().Get("Content-Type"))
	}
}

func TestGetIconFallsBackToGeneratedSVG(t *testing.T) {
	service := httptest.NewServer(http.NotFoundHandler())
	defer service.Close()

	handler, cleanup := newTestHandler(t, apiSampleConfig("icon fallback"))
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/api/icon?url="+service.URL+"&name=Jellyfin", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/icon fallback status = %d, want %d, body = %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if rec.Header().Get("Content-Type") != "image/svg+xml; charset=utf-8" {
		t.Fatalf("content type = %q, want image/svg+xml; charset=utf-8", rec.Header().Get("Content-Type"))
	}
	if !strings.Contains(rec.Body.String(), ">J<") {
		t.Fatalf("fallback icon does not contain service initial: %s", rec.Body.String())
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

package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
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

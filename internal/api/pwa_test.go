package api

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestManifestContentType(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "manifest.webmanifest"), []byte(`{"name":"Homelab"}`), 0600); err != nil {
		t.Fatal(err)
	}
	response := httptest.NewRecorder()
	StaticFallbackHandler(dir).ServeHTTP(response, httptest.NewRequest("GET", "/manifest.webmanifest", nil))
	if response.Code != 200 {
		t.Fatalf("status = %d", response.Code)
	}
	if got := response.Header().Get("Content-Type"); got != "application/manifest+json" {
		t.Fatalf("content type = %q", got)
	}
}

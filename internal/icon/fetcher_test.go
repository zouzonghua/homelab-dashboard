package icon

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestFetcherDiscoversLinkedIcon(t *testing.T) {
	var iconHits int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/":
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			_, _ = w.Write([]byte(`<html><head><link rel="icon" href="/assets/app.svg"></head></html>`))
		case "/assets/app.svg":
			iconHits++
			w.Header().Set("Content-Type", "image/svg+xml")
			_, _ = w.Write([]byte(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	fetcher := NewFetcher(t.TempDir(), 2*time.Second)
	icon, err := fetcher.Fetch(context.Background(), server.URL)
	if err != nil {
		t.Fatalf("Fetch() error = %v", err)
	}
	if icon.ContentType != "image/svg+xml" {
		t.Fatalf("content type = %q, want image/svg+xml", icon.ContentType)
	}
	if iconHits != 1 {
		t.Fatalf("icon hits = %d, want 1", iconHits)
	}

	cached, err := fetcher.Fetch(context.Background(), server.URL)
	if err != nil {
		t.Fatalf("Fetch() cached error = %v", err)
	}
	if cached.Path != icon.Path {
		t.Fatalf("cached path = %q, want %q", cached.Path, icon.Path)
	}
	if iconHits != 1 {
		t.Fatalf("icon hits after cached fetch = %d, want 1", iconHits)
	}
}

func TestFetcherFallsBackToFavicon(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/":
			w.Header().Set("Content-Type", "text/html")
			_, _ = w.Write([]byte(`<html><head></head></html>`))
		case "/favicon.ico":
			w.Header().Set("Content-Type", "image/x-icon")
			_, _ = w.Write([]byte("icon"))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	fetcher := NewFetcher(t.TempDir(), 2*time.Second)
	icon, err := fetcher.Fetch(context.Background(), server.URL+"/some/page")
	if err != nil {
		t.Fatalf("Fetch() error = %v", err)
	}
	if icon.ContentType != "image/x-icon" {
		t.Fatalf("content type = %q, want image/x-icon", icon.ContentType)
	}
}

func TestFetcherRejectsUnsupportedScheme(t *testing.T) {
	fetcher := NewFetcher(t.TempDir(), 2*time.Second)
	if _, err := fetcher.Fetch(context.Background(), "file:///tmp/icon.png"); err == nil {
		t.Fatal("Fetch() error = nil, want error")
	}
}

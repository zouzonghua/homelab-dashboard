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

func TestFetcherResolvesRelativeIconFromFinalPageURL(t *testing.T) {
	var rightIconHits int
	var wrongIconHits int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/":
			http.Redirect(w, r, "/ui/", http.StatusFound)
		case "/ui/":
			w.Header().Set("Content-Type", "text/html")
			_, _ = w.Write([]byte(`<link rel="icon" href="assets/app.svg">`))
		case "/ui/assets/app.svg":
			rightIconHits++
			w.Header().Set("Content-Type", "image/svg+xml")
			_, _ = w.Write([]byte(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`))
		case "/assets/app.svg":
			wrongIconHits++
			http.NotFound(w, r)
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
	if rightIconHits != 1 {
		t.Fatalf("right icon hits = %d, want 1", rightIconHits)
	}
	if wrongIconHits != 0 {
		t.Fatalf("wrong icon hits = %d, want 0", wrongIconHits)
	}
}

func TestFetcherTriesNextLinkedIconWhenFirstCandidateFails(t *testing.T) {
	var goodIconHits int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/":
			w.Header().Set("Content-Type", "text/html")
			_, _ = w.Write([]byte(`
				<link rel="icon" href="/missing.ico">
				<link rel="icon" type="image/png" href="/good.png">
			`))
		case "/good.png":
			goodIconHits++
			w.Header().Set("Content-Type", "image/png")
			_, _ = w.Write([]byte("png"))
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
	if icon.ContentType != "image/png" {
		t.Fatalf("content type = %q, want image/png", icon.ContentType)
	}
	if goodIconHits != 1 {
		t.Fatalf("good icon hits = %d, want 1", goodIconHits)
	}
}

func TestFetcherAcceptsImageExtensionWhenContentTypeIsMissing(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/":
			w.Header().Set("Content-Type", "text/html")
			_, _ = w.Write([]byte(`<link rel="icon" href="/favicon.ico">`))
		case "/favicon.ico":
			w.Header()["Content-Type"] = []string{""}
			_, _ = w.Write([]byte("ico"))
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
	if icon.ContentType != "image/x-icon" {
		t.Fatalf("content type = %q, want image/x-icon", icon.ContentType)
	}
}

func TestFetcherFollowsMetaRefreshAndParsesForbiddenLuciIcon(t *testing.T) {
	var logoHits int
	var pngHits int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/":
			w.Header().Set("Content-Type", "text/html")
			_, _ = w.Write([]byte(`<meta http-equiv="refresh" content="0; URL=cgi-bin/luci/">`))
		case "/cgi-bin/luci/":
			w.Header().Set("Content-Type", "text/html; charset=UTF-8")
			w.WriteHeader(http.StatusForbidden)
			_, _ = w.Write([]byte(`
				<link rel="icon" href="/luci-static/bootstrap/logo_48.png" sizes="48x48">
				<link rel="icon" href="/luci-static/bootstrap/logo.svg" sizes="any">
			`))
		case "/luci-static/bootstrap/logo_48.png":
			pngHits++
			w.Header().Set("Content-Type", "image/png")
			_, _ = w.Write([]byte("png"))
		case "/luci-static/bootstrap/logo.svg":
			logoHits++
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
	if logoHits != 1 {
		t.Fatalf("logo hits = %d, want 1", logoHits)
	}
	if pngHits != 0 {
		t.Fatalf("png hits = %d, want 0", pngHits)
	}
}

func TestFetcherRejectsUnsupportedScheme(t *testing.T) {
	fetcher := NewFetcher(t.TempDir(), 2*time.Second)
	if _, err := fetcher.Fetch(context.Background(), "file:///tmp/icon.png"); err == nil {
		t.Fatal("Fetch() error = nil, want error")
	}
}

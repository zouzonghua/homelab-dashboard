package icon

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/net/html"
)

const maxIconBytes = 512 * 1024

type Icon struct {
	Path        string
	ContentType string
}

type Fetcher struct {
	cacheDir string
	client   *http.Client
}

func NewFetcher(cacheDir string, timeout time.Duration) *Fetcher {
	return &Fetcher{
		cacheDir: cacheDir,
		client: &http.Client{
			Timeout: timeout,
		},
	}
}

func (f *Fetcher) Fetch(ctx context.Context, rawURL string) (Icon, error) {
	pageURL, err := parseHTTPURL(rawURL)
	if err != nil {
		return Icon{}, err
	}
	if err := os.MkdirAll(f.cacheDir, 0o755); err != nil {
		return Icon{}, err
	}
	if cached, ok := f.cachedIcon(rawURL); ok {
		return cached, nil
	}

	iconURL, err := f.discoverIconURL(ctx, pageURL)
	if err != nil || iconURL == nil {
		iconURL = pageURL.ResolveReference(&url.URL{Path: "/favicon.ico"})
	}
	return f.fetchAndCacheIcon(ctx, rawURL, iconURL)
}

func parseHTTPURL(rawURL string) (*url.URL, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("unsupported URL scheme %q", parsed.Scheme)
	}
	if parsed.Host == "" {
		return nil, errors.New("URL host is required")
	}
	return parsed, nil
}

func (f *Fetcher) discoverIconURL(ctx context.Context, pageURL *url.URL) (*url.URL, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pageURL.String(), nil)
	if err != nil {
		return nil, err
	}
	resp, err := f.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		return nil, fmt.Errorf("page status %d", resp.StatusCode)
	}
	contentType := resp.Header.Get("Content-Type")
	if contentType != "" && !strings.Contains(contentType, "text/html") {
		return nil, nil
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxIconBytes))
	if err != nil {
		return nil, err
	}
	href := findIconHref(body)
	if href == "" {
		return nil, nil
	}
	iconURL, err := url.Parse(href)
	if err != nil {
		return nil, err
	}
	return pageURL.ResolveReference(iconURL), nil
}

func findIconHref(body []byte) string {
	doc, err := html.Parse(bytes.NewReader(body))
	if err != nil {
		return ""
	}
	var href string
	var walk func(*html.Node)
	walk = func(node *html.Node) {
		if href != "" {
			return
		}
		if node.Type == html.ElementNode && node.Data == "link" {
			rel := attr(node, "rel")
			if isIconRel(rel) {
				href = attr(node, "href")
				return
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(doc)
	return href
}

func isIconRel(rel string) bool {
	for _, part := range strings.Fields(strings.ToLower(rel)) {
		if part == "icon" || part == "apple-touch-icon" || part == "shortcut" {
			return true
		}
	}
	return false
}

func attr(node *html.Node, name string) string {
	for _, attr := range node.Attr {
		if strings.EqualFold(attr.Key, name) {
			return attr.Val
		}
	}
	return ""
}

func (f *Fetcher) fetchAndCacheIcon(ctx context.Context, cacheKey string, iconURL *url.URL) (Icon, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, iconURL.String(), nil)
	if err != nil {
		return Icon{}, err
	}
	resp, err := f.client.Do(req)
	if err != nil {
		return Icon{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		return Icon{}, fmt.Errorf("icon status %d", resp.StatusCode)
	}
	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	if !strings.HasPrefix(contentType, "image/") {
		return Icon{}, fmt.Errorf("icon content type %q is not an image", contentType)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxIconBytes))
	if err != nil {
		return Icon{}, err
	}
	path := filepath.Join(f.cacheDir, cacheName(cacheKey, contentType, iconURL.Path))
	if err := os.WriteFile(path, body, 0o644); err != nil {
		return Icon{}, err
	}
	return Icon{Path: path, ContentType: contentType}, nil
}

func (f *Fetcher) cachedIcon(cacheKey string) (Icon, bool) {
	matches, err := filepath.Glob(filepath.Join(f.cacheDir, cacheHash(cacheKey)+".*"))
	if err != nil || len(matches) == 0 {
		return Icon{}, false
	}
	contentType := mime.TypeByExtension(filepath.Ext(matches[0]))
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	return Icon{Path: matches[0], ContentType: contentType}, true
}

func cacheName(cacheKey string, contentType string, sourcePath string) string {
	exts, _ := mime.ExtensionsByType(contentType)
	if len(exts) > 0 {
		return cacheHash(cacheKey) + exts[0]
	}
	ext := filepath.Ext(sourcePath)
	if ext == "" {
		ext = ".ico"
	}
	return cacheHash(cacheKey) + ext
}

func cacheHash(cacheKey string) string {
	hash := sha256.Sum256([]byte(cacheKey))
	return hex.EncodeToString(hash[:])
}

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

	iconURLs := f.discoverIconURLs(ctx, pageURL, 0)
	iconURLs = append(iconURLs, pageURL.ResolveReference(&url.URL{Path: "/favicon.ico"}))
	var lastErr error
	for _, iconURL := range iconURLs {
		icon, err := f.fetchAndCacheIcon(ctx, rawURL, iconURL)
		if err == nil {
			return icon, nil
		}
		lastErr = err
	}
	if lastErr != nil {
		return Icon{}, lastErr
	}
	return Icon{}, errors.New("icon not found")
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

func (f *Fetcher) discoverIconURLs(ctx context.Context, pageURL *url.URL, depth int) []*url.URL {
	if depth > 2 {
		return nil
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pageURL.String(), nil)
	if err != nil {
		return nil
	}
	resp, err := f.client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 500 {
		return nil
	}
	contentType := resp.Header.Get("Content-Type")
	if contentType != "" && !strings.Contains(contentType, "text/html") {
		return nil
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxIconBytes))
	if err != nil {
		return nil
	}
	baseURL := resp.Request.URL
	candidates := resolveIconHrefs(baseURL, findIconHrefs(body))
	if len(candidates) > 0 {
		return candidates
	}
	if refreshURL := findMetaRefreshURL(body); refreshURL != "" {
		if parsed, err := url.Parse(refreshURL); err == nil {
			return f.discoverIconURLs(ctx, baseURL.ResolveReference(parsed), depth+1)
		}
	}
	return nil
}

func resolveIconHrefs(baseURL *url.URL, hrefs []string) []*url.URL {
	var urls []*url.URL
	seen := map[string]bool{}
	for _, href := range hrefs {
		iconURL, err := url.Parse(href)
		if err != nil {
			continue
		}
		resolved := baseURL.ResolveReference(iconURL)
		if seen[resolved.String()] {
			continue
		}
		seen[resolved.String()] = true
		urls = append(urls, resolved)
	}
	return urls
}

func findIconHrefs(body []byte) []string {
	doc, err := html.Parse(bytes.NewReader(body))
	if err != nil {
		return nil
	}
	var svgIconHrefs []string
	var iconHrefs []string
	var appleHrefs []string
	var walk func(*html.Node)
	walk = func(node *html.Node) {
		if node.Type == html.ElementNode && node.Data == "link" {
			rel := attr(node, "rel")
			href := attr(node, "href")
			if href != "" && isIconRel(rel) {
				if isAppleTouchIconRel(rel) {
					appleHrefs = append(appleHrefs, href)
				} else if strings.EqualFold(filepath.Ext(href), ".svg") {
					svgIconHrefs = append(svgIconHrefs, href)
				} else {
					iconHrefs = append(iconHrefs, href)
				}
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(doc)
	hrefs := append(svgIconHrefs, iconHrefs...)
	return append(hrefs, appleHrefs...)
}

func isIconRel(rel string) bool {
	for _, part := range strings.Fields(strings.ToLower(rel)) {
		if part == "icon" || part == "apple-touch-icon" || part == "shortcut" {
			return true
		}
	}
	return false
}

func isAppleTouchIconRel(rel string) bool {
	for _, part := range strings.Fields(strings.ToLower(rel)) {
		if part == "apple-touch-icon" {
			return true
		}
	}
	return false
}

func findMetaRefreshURL(body []byte) string {
	doc, err := html.Parse(bytes.NewReader(body))
	if err != nil {
		return ""
	}
	var refreshURL string
	var walk func(*html.Node)
	walk = func(node *html.Node) {
		if refreshURL != "" {
			return
		}
		if node.Type == html.ElementNode && node.Data == "meta" && strings.EqualFold(attr(node, "http-equiv"), "refresh") {
			refreshURL = parseMetaRefreshURL(attr(node, "content"))
			return
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(doc)
	return refreshURL
}

func parseMetaRefreshURL(content string) string {
	for _, part := range strings.Split(content, ";") {
		part = strings.TrimSpace(part)
		key, value, ok := strings.Cut(part, "=")
		if ok && strings.EqualFold(strings.TrimSpace(key), "url") {
			return strings.Trim(strings.TrimSpace(value), `"'`)
		}
	}
	return ""
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
	contentType := strings.TrimSpace(resp.Header.Get("Content-Type"))
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = iconContentTypeFromPath(iconURL.Path)
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

func iconContentTypeFromPath(path string) string {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".ico":
		return "image/x-icon"
	case ".svg":
		return "image/svg+xml"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	default:
		return "application/octet-stream"
	}
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

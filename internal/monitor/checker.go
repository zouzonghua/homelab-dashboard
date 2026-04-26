package monitor

import (
	"context"
	"net/http"
	"time"
)

const (
	StatusUp   = "up"
	StatusDown = "down"
)

type Result struct {
	Name           string    `json:"name"`
	Status         string    `json:"status"`
	Method         string    `json:"method"`
	Code           int       `json:"code"`
	ResponseTimeMs int64     `json:"responseTimeMs"`
	CheckedAt      time.Time `json:"checkedAt"`
	Error          string    `json:"error,omitempty"`
}

type Checker struct {
	client *http.Client
}

func NewChecker(timeout time.Duration) *Checker {
	return &Checker{
		client: &http.Client{Timeout: timeout},
	}
}

func (c *Checker) Check(ctx context.Context, name string, targetURL string) Result {
	startedAt := time.Now()
	result := Result{
		Name:      name,
		Status:    StatusDown,
		CheckedAt: startedAt.UTC(),
	}

	code, err := c.request(ctx, http.MethodHead, targetURL)
	if err == nil && !shouldFallbackToGet(code) {
		result.Method = http.MethodHead
		result.Code = code
		result.ResponseTimeMs = time.Since(startedAt).Milliseconds()
		result.Status = statusFromCode(code)
		return result
	}

	code, err = c.request(ctx, http.MethodGet, targetURL)
	result.Method = http.MethodGet
	result.ResponseTimeMs = time.Since(startedAt).Milliseconds()
	if err != nil {
		result.Error = err.Error()
		return result
	}
	result.Code = code
	result.Status = statusFromCode(code)
	return result
}

func (c *Checker) request(ctx context.Context, method string, targetURL string) (int, error) {
	req, err := http.NewRequestWithContext(ctx, method, targetURL, nil)
	if err != nil {
		return 0, err
	}
	resp, err := c.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	return resp.StatusCode, nil
}

func statusFromCode(code int) string {
	if code >= 200 && code < 400 {
		return StatusUp
	}
	if code == http.StatusUnauthorized || code == http.StatusForbidden {
		return StatusUp
	}
	return StatusDown
}

func shouldFallbackToGet(code int) bool {
	return code == http.StatusMethodNotAllowed || code == http.StatusNotImplemented
}

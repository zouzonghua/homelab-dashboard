package monitor

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestCheckerReportsUpForSuccessfulHead(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodHead {
			t.Fatalf("method = %s, want HEAD", r.Method)
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	checker := NewChecker(2 * time.Second)
	result := checker.Check(context.Background(), "Service", server.URL)

	if result.Status != StatusUp {
		t.Fatalf("status = %s, want %s, error = %s", result.Status, StatusUp, result.Error)
	}
	if result.ResponseTimeMs <= 0 {
		t.Fatalf("response time = %d, want positive", result.ResponseTimeMs)
	}
}

func TestCheckerFallsBackToGetWhenHeadIsNotAllowed(t *testing.T) {
	var gotGet bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodHead {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if r.Method == http.MethodGet {
			gotGet = true
			w.WriteHeader(http.StatusOK)
			return
		}
		t.Fatalf("unexpected method: %s", r.Method)
	}))
	defer server.Close()

	checker := NewChecker(2 * time.Second)
	result := checker.Check(context.Background(), "Service", server.URL)

	if result.Status != StatusUp {
		t.Fatalf("status = %s, want %s, error = %s", result.Status, StatusUp, result.Error)
	}
	if !gotGet {
		t.Fatal("expected GET fallback")
	}
}

func TestCheckerFallsBackToGetWhenHeadIsNotImplemented(t *testing.T) {
	var gotGet bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodHead {
			w.WriteHeader(http.StatusNotImplemented)
			return
		}
		if r.Method == http.MethodGet {
			gotGet = true
			w.WriteHeader(http.StatusOK)
			return
		}
		t.Fatalf("unexpected method: %s", r.Method)
	}))
	defer server.Close()

	checker := NewChecker(2 * time.Second)
	result := checker.Check(context.Background(), "Service", server.URL)

	if result.Status != StatusUp {
		t.Fatalf("status = %s, want %s, error = %s", result.Status, StatusUp, result.Error)
	}
	if !gotGet {
		t.Fatal("expected GET fallback")
	}
}

func TestCheckerTreatsUnauthorizedAsUp(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	checker := NewChecker(2 * time.Second)
	result := checker.Check(context.Background(), "Service", server.URL)

	if result.Status != StatusUp {
		t.Fatalf("status = %s, want %s", result.Status, StatusUp)
	}
	if result.Code != http.StatusUnauthorized {
		t.Fatalf("code = %d, want %d", result.Code, http.StatusUnauthorized)
	}
}

func TestCheckerReportsDownForServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	checker := NewChecker(2 * time.Second)
	result := checker.Check(context.Background(), "Service", server.URL)

	if result.Status != StatusDown {
		t.Fatalf("status = %s, want %s", result.Status, StatusDown)
	}
}

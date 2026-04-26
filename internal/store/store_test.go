package store

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"

	"github.com/zouzonghua/homelab-dashboard/internal/config"
)

func TestOpenCreatesSchema(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "homelab.db")

	store, err := Open(dbPath, config.Config{})
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer store.Close()

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	defer db.Close()

	for _, table := range []string{"configs", "categories", "services"} {
		var name string
		err = db.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, table).Scan(&name)
		if err != nil {
			t.Fatalf("expected table %s to exist: %v", table, err)
		}
	}
}

func TestLoadConfigSeedsEmptyDatabase(t *testing.T) {
	ctx := context.Background()
	seed := sampleConfig("seed title")

	store, err := Open(filepath.Join(t.TempDir(), "homelab.db"), seed)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer store.Close()

	got, err := store.LoadConfig(ctx)
	if err != nil {
		t.Fatalf("LoadConfig() error = %v", err)
	}

	assertConfigEqual(t, got, seed)
}

func TestReplaceConfigPersistsOrderAndValues(t *testing.T) {
	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), "homelab.db")
	replacement := config.Config{
		Date:    "2026-04-26",
		Title:   "updated",
		Columns: "2",
		Items: []config.Category{
			{
				Name: "First",
				Icon: "first-icon",
				List: []config.Service{
					{Name: "B", Logo: "b.png", URL: "https://b.example", Target: "_self"},
					{Name: "A", Logo: "a.png", URL: "https://a.example", Target: "_blank"},
				},
			},
			{
				Name: "Second",
				Icon: "second-icon",
				List: []config.Service{
					{Name: "C", Logo: "c.png", URL: "https://c.example", Target: "_blank"},
				},
			},
		},
	}

	store, err := Open(dbPath, sampleConfig("original"))
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	if err := store.ReplaceConfig(ctx, replacement); err != nil {
		t.Fatalf("ReplaceConfig() error = %v", err)
	}
	store.Close()

	reopened, err := Open(dbPath, sampleConfig("unused seed"))
	if err != nil {
		t.Fatalf("Open() reopen error = %v", err)
	}
	defer reopened.Close()

	got, err := reopened.LoadConfig(ctx)
	if err != nil {
		t.Fatalf("LoadConfig() error = %v", err)
	}

	assertConfigEqual(t, got, replacement)
}

func sampleConfig(title string) config.Config {
	return config.Config{
		Date:    "2022-09-07",
		Title:   title,
		Columns: "4",
		Items: []config.Category{
			{
				Name: "Media",
				Icon: "fa-solid fa-photo-film",
				List: []config.Service{
					{Name: "Jellyfin", Logo: "assets/icons/jellyfin.png", URL: "http://example.test", Target: "_blank"},
				},
			},
		},
	}
}

func assertConfigEqual(t *testing.T, got, want config.Config) {
	t.Helper()
	if got.Date != want.Date || got.Title != want.Title || got.Columns != want.Columns {
		t.Fatalf("config header mismatch\ngot:  %#v\nwant: %#v", got, want)
	}
	if len(got.Items) != len(want.Items) {
		t.Fatalf("items length = %d, want %d", len(got.Items), len(want.Items))
	}
	for i := range want.Items {
		if got.Items[i].Name != want.Items[i].Name || got.Items[i].Icon != want.Items[i].Icon {
			t.Fatalf("item %d mismatch\ngot:  %#v\nwant: %#v", i, got.Items[i], want.Items[i])
		}
		if len(got.Items[i].List) != len(want.Items[i].List) {
			t.Fatalf("item %d list length = %d, want %d", i, len(got.Items[i].List), len(want.Items[i].List))
		}
		for j := range want.Items[i].List {
			if got.Items[i].List[j] != want.Items[i].List[j] {
				t.Fatalf("service %d.%d mismatch\ngot:  %#v\nwant: %#v", i, j, got.Items[i].List[j], want.Items[i].List[j])
			}
		}
	}
}

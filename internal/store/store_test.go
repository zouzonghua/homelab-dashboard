package store

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"testing"
	"time"

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

	for _, table := range []string{"schema_migrations", "configs", "categories", "services", "audit_logs"} {
		var name string
		err = db.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, table).Scan(&name)
		if err != nil {
			t.Fatalf("expected table %s to exist: %v", table, err)
		}
	}
}

func ptr(value string) *string {
	return &value
}

func boolPtr(value bool) *bool {
	return &value
}

func TestOpenRunsMigrationsIdempotently(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "homelab.db")

	first, err := Open(dbPath, config.Config{})
	if err != nil {
		t.Fatalf("first Open() error = %v", err)
	}
	if err := first.Close(); err != nil {
		t.Fatalf("first Close() error = %v", err)
	}

	second, err := Open(dbPath, config.Config{})
	if err != nil {
		t.Fatalf("second Open() error = %v", err)
	}
	defer second.Close()

	var count int
	if err := second.db.QueryRow(`SELECT COUNT(*) FROM schema_migrations`).Scan(&count); err != nil {
		t.Fatalf("query schema_migrations: %v", err)
	}
	if count == 0 {
		t.Fatal("expected applied migrations to be recorded")
	}
}

func TestDashboardColumnsAreIntegerAndSeedConfigStillWorks(t *testing.T) {
	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), "homelab.db")
	replacement := sampleConfig("dashboard")
	replacement.Columns = "3"

	store, err := Open(dbPath, config.Config{})
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer store.Close()

	if err := store.ReplaceConfig(ctx, replacement); err != nil {
		t.Fatalf("ReplaceConfig() error = %v", err)
	}

	var columnType string
	if err := store.db.QueryRow(`SELECT type FROM pragma_table_info('configs') WHERE name = 'columns'`).Scan(&columnType); err != nil {
		t.Fatalf("query columns type: %v", err)
	}
	if columnType != "INTEGER" {
		t.Fatalf("configs.columns type = %q, want INTEGER", columnType)
	}

	dashboard, err := store.LoadDashboard(ctx)
	if err != nil {
		t.Fatalf("LoadDashboard() error = %v", err)
	}
	if dashboard.Columns != 3 {
		t.Fatalf("dashboard columns = %d, want 3", dashboard.Columns)
	}

	seedConfig, err := store.LoadConfig(ctx)
	if err != nil {
		t.Fatalf("LoadConfig() error = %v", err)
	}
	if seedConfig.Columns != "3" {
		t.Fatalf("seed config columns = %q, want 3", seedConfig.Columns)
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
					{Name: "B", Logo: "b.png", URL: "https://b.example", Target: "_self", MonitorEnabled: true, MonitorURL: "https://health.example"},
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

func TestListCategoriesDoesNotReenterSQLiteConnection(t *testing.T) {
	store, err := Open(filepath.Join(t.TempDir(), "homelab.db"), sampleConfig("seed"))
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer store.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	categories, err := store.ListCategories(ctx)
	if err != nil {
		t.Fatalf("ListCategories() error = %v", err)
	}
	if len(categories) != 1 || categories[0].Name != "Media" {
		t.Fatalf("categories = %#v", categories)
	}
}

func TestCategoryAndServiceResourcesCRUD(t *testing.T) {
	ctx := context.Background()
	store, err := Open(filepath.Join(t.TempDir(), "homelab.db"), sampleConfig("resources"))
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer store.Close()

	category, err := store.CreateCategory(ctx, config.CategoryResource{Name: "Apps", Icon: "apps"})
	if err != nil {
		t.Fatalf("CreateCategory() error = %v", err)
	}
	if category.ID == 0 {
		t.Fatal("category ID was not assigned")
	}

	service, err := store.CreateService(ctx, config.ServiceResource{
		CategoryID:     category.ID,
		Name:           "Grafana",
		Logo:           "grafana.png",
		URL:            "https://grafana.example",
		Target:         "_blank",
		MonitorURL:     "https://grafana.example/health",
		MonitorEnabled: true,
	})
	if err != nil {
		t.Fatalf("CreateService() error = %v", err)
	}
	if service.ID == 0 {
		t.Fatal("service ID was not assigned")
	}

	renamedCategory, err := store.UpdateCategory(ctx, category.ID, config.CategoryResourcePatch{Name: ptr("Infra")})
	if err != nil {
		t.Fatalf("UpdateCategory() error = %v", err)
	}
	if renamedCategory.Name != "Infra" || renamedCategory.Icon != "apps" {
		t.Fatalf("updated category = %#v", renamedCategory)
	}

	updatedService, err := store.UpdateService(ctx, service.ID, config.ServiceResourcePatch{Name: ptr("Metrics"), MonitorEnabled: boolPtr(false)})
	if err != nil {
		t.Fatalf("UpdateService() error = %v", err)
	}
	if updatedService.Name != "Metrics" || updatedService.MonitorEnabled {
		t.Fatalf("updated service = %#v", updatedService)
	}

	if err := store.DeleteCategory(ctx, category.ID); err != nil {
		t.Fatalf("DeleteCategory() error = %v", err)
	}
	if _, err := store.GetService(ctx, service.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("GetService() after category delete error = %v, want ErrNotFound", err)
	}
}

func TestAuditLogsAppendAndList(t *testing.T) {
	ctx := context.Background()
	store, err := Open(filepath.Join(t.TempDir(), "homelab.db"), sampleConfig("audit"))
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer store.Close()

	first, err := store.CreateAuditLog(ctx, config.AuditLogCreate{
		Action:       "category.create",
		ResourceType: "category",
		ResourceID:   "1",
		Summary:      "创建分类 Media",
		AfterJSON:    `{"name":"Media"}`,
	})
	if err != nil {
		t.Fatalf("CreateAuditLog() first error = %v", err)
	}
	second, err := store.CreateAuditLog(ctx, config.AuditLogCreate{
		Action:       "service.update",
		ResourceType: "service",
		ResourceID:   "2",
		Summary:      "更新服务 Jellyfin",
		BeforeJSON:   `{"name":"Jellyfin"}`,
		AfterJSON:    `{"name":"Jellyfin 2"}`,
	})
	if err != nil {
		t.Fatalf("CreateAuditLog() second error = %v", err)
	}

	logs, err := store.ListAuditLogs(ctx, config.AuditLogQuery{Limit: 10})
	if err != nil {
		t.Fatalf("ListAuditLogs() error = %v", err)
	}
	if len(logs) != 2 {
		t.Fatalf("logs length = %d, want 2", len(logs))
	}
	if logs[0].ID != second.ID || logs[1].ID != first.ID {
		t.Fatalf("logs order = %#v, want newest first", logs)
	}
	if logs[0].ActorType != "local" || logs[0].Action != "service.update" || string(logs[0].Before) == "" {
		t.Fatalf("latest audit log = %#v", logs[0])
	}

	filtered, err := store.ListAuditLogs(ctx, config.AuditLogQuery{ResourceType: "category", Limit: 10})
	if err != nil {
		t.Fatalf("ListAuditLogs() filtered error = %v", err)
	}
	if len(filtered) != 1 || filtered[0].Action != "category.create" {
		t.Fatalf("filtered logs = %#v", filtered)
	}
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

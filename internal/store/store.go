package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	_ "modernc.org/sqlite"

	"github.com/zouzonghua/homelab-dashboard/internal/config"
)

var ErrNotFound = errors.New("not found")

type Store struct {
	db   *sql.DB
	seed config.Config
}

func Open(path string, seed config.Config) (*Store, error) {
	if path != "" && path != ":memory:" {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return nil, err
		}
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		db.Close()
		return nil, err
	}

	store := &Store{db: db, seed: seed}
	if err := store.createSchema(context.Background()); err != nil {
		db.Close()
		return nil, err
	}

	return store, nil
}

func (s *Store) LoadConfig(ctx context.Context) (config.Config, error) {
	empty, err := s.isEmpty(ctx)
	if err != nil {
		return config.Config{}, err
	}
	if empty {
		if err := s.ReplaceConfig(ctx, s.seed); err != nil {
			return config.Config{}, err
		}
	}

	var cfg config.Config
	var columns int
	err = s.db.QueryRowContext(ctx, `SELECT date, title, columns FROM configs WHERE id = 1`).Scan(&cfg.Date, &cfg.Title, &columns)
	if err != nil {
		return config.Config{}, err
	}
	cfg.Columns = strconv.Itoa(columns)

	rows, err := s.db.QueryContext(ctx, `SELECT id, name, icon FROM categories ORDER BY order_idx`)
	if err != nil {
		return config.Config{}, err
	}

	type categoryRow struct {
		id   int64
		item config.Category
	}
	var categories []categoryRow
	for rows.Next() {
		var category categoryRow
		if err := rows.Scan(&category.id, &category.item.Name, &category.item.Icon); err != nil {
			return config.Config{}, err
		}
		categories = append(categories, category)
	}
	if err := rows.Err(); err != nil {
		return config.Config{}, err
	}
	if err := rows.Close(); err != nil {
		return config.Config{}, err
	}

	for _, category := range categories {
		services, err := s.loadServices(ctx, category.id)
		if err != nil {
			return config.Config{}, err
		}
		category.item.List = services
		cfg.Items = append(cfg.Items, category.item)
	}

	return cfg, nil
}

func (s *Store) ReplaceConfig(ctx context.Context, cfg config.Config) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, stmt := range []string{
		`DELETE FROM services`,
		`DELETE FROM categories`,
		`DELETE FROM configs`,
	} {
		if _, err := tx.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	columns := 0
	if strings.TrimSpace(cfg.Columns) != "" {
		var err error
		columns, err = strconv.Atoi(strings.TrimSpace(cfg.Columns))
		if err != nil {
			return err
		}
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO configs (id, date, title, columns) VALUES (1, ?, ?, ?)`, cfg.Date, cfg.Title, columns); err != nil {
		return err
	}

	for i, item := range cfg.Items {
		result, err := tx.ExecContext(ctx, `INSERT INTO categories (order_idx, name, icon) VALUES (?, ?, ?)`, i, item.Name, item.Icon)
		if err != nil {
			return err
		}
		categoryID, err := result.LastInsertId()
		if err != nil {
			return err
		}
		for j, service := range item.List {
			_, err := tx.ExecContext(
				ctx,
				`INSERT INTO services (category_id, order_idx, name, logo, url, target, monitor_url, monitor_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				categoryID,
				j,
				service.Name,
				service.Logo,
				service.URL,
				service.Target,
				service.MonitorURL,
				service.MonitorEnabled,
			)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) createSchema(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS schema_migrations (
	version INTEGER PRIMARY KEY,
	applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS configs (
	id INTEGER PRIMARY KEY,
	date TEXT NOT NULL,
	title TEXT NOT NULL,
	columns INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	order_idx INTEGER NOT NULL,
	name TEXT NOT NULL,
	icon TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS services (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	category_id INTEGER NOT NULL,
	order_idx INTEGER NOT NULL,
	name TEXT NOT NULL,
	logo TEXT NOT NULL,
	url TEXT NOT NULL,
	target TEXT NOT NULL,
	monitor_url TEXT NOT NULL DEFAULT '',
	monitor_enabled INTEGER NOT NULL DEFAULT 0,
	FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);`)
	if err != nil {
		return err
	}
	for _, migration := range []struct {
		version int
		run     func(context.Context) error
	}{
		{version: 1, run: s.ensureConfigColumnsInteger},
		{version: 2, run: s.ensureServiceColumns},
	} {
		if err := migration.run(ctx); err != nil {
			return err
		}
		if _, err := s.db.ExecContext(ctx, `INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)`, migration.version); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) isEmpty(ctx context.Context) (bool, error) {
	var count int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM configs`).Scan(&count); err != nil {
		return false, err
	}
	return count == 0, nil
}

func (s *Store) loadServices(ctx context.Context, categoryID int64) ([]config.Service, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT name, logo, url, target, monitor_url, monitor_enabled FROM services WHERE category_id = ? ORDER BY order_idx`,
		categoryID,
	)
	if err != nil {
		return nil, fmt.Errorf("load services: %w", err)
	}
	defer rows.Close()

	var services []config.Service
	for rows.Next() {
		var service config.Service
		if err := rows.Scan(&service.Name, &service.Logo, &service.URL, &service.Target, &service.MonitorURL, &service.MonitorEnabled); err != nil {
			return nil, err
		}
		services = append(services, service)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if services == nil {
		return []config.Service{}, nil
	}
	return services, nil
}

func (s *Store) ensureServiceColumns(ctx context.Context) error {
	columns, err := s.serviceColumns(ctx)
	if err != nil {
		return err
	}
	for _, migration := range []struct {
		name string
		sql  string
	}{
		{name: "monitor_url", sql: `ALTER TABLE services ADD COLUMN monitor_url TEXT NOT NULL DEFAULT ''`},
		{name: "monitor_enabled", sql: `ALTER TABLE services ADD COLUMN monitor_enabled INTEGER NOT NULL DEFAULT 0`},
	} {
		if columns[migration.name] {
			continue
		}
		if _, err := s.db.ExecContext(ctx, migration.sql); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) ensureConfigColumnsInteger(ctx context.Context) error {
	var columnType string
	if err := s.db.QueryRowContext(ctx, `SELECT type FROM pragma_table_info('configs') WHERE name = 'columns'`).Scan(&columnType); err != nil {
		return err
	}
	if strings.EqualFold(columnType, "INTEGER") {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `
ALTER TABLE configs RENAME TO configs_old;
CREATE TABLE configs (
	id INTEGER PRIMARY KEY,
	date TEXT NOT NULL,
	title TEXT NOT NULL,
	columns INTEGER NOT NULL
);
INSERT INTO configs (id, date, title, columns)
	SELECT id, date, title, CAST(columns AS INTEGER) FROM configs_old;
DROP TABLE configs_old;`)
	return err
}

func (s *Store) serviceColumns(ctx context.Context) (map[string]bool, error) {
	rows, err := s.db.QueryContext(ctx, `PRAGMA table_info(services)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns := map[string]bool{}
	for rows.Next() {
		var cid int
		var name string
		var typ string
		var notNull int
		var defaultValue sql.NullString
		var pk int
		if err := rows.Scan(&cid, &name, &typ, &notNull, &defaultValue, &pk); err != nil {
			return nil, err
		}
		columns[name] = true
	}
	return columns, rows.Err()
}

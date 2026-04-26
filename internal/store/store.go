package store

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"

	"github.com/zouzonghua/homelab-dashboard/internal/config"
)

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
	err = s.db.QueryRowContext(ctx, `SELECT date, title, columns FROM configs WHERE id = 1`).Scan(&cfg.Date, &cfg.Title, &cfg.Columns)
	if err != nil {
		return config.Config{}, err
	}

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
	if _, err := tx.ExecContext(ctx, `INSERT INTO configs (id, date, title, columns) VALUES (1, ?, ?, ?)`, cfg.Date, cfg.Title, cfg.Columns); err != nil {
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
				`INSERT INTO services (category_id, order_idx, name, logo, url, target) VALUES (?, ?, ?, ?, ?, ?)`,
				categoryID,
				j,
				service.Name,
				service.Logo,
				service.URL,
				service.Target,
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
CREATE TABLE IF NOT EXISTS configs (
	id INTEGER PRIMARY KEY,
	date TEXT NOT NULL,
	title TEXT NOT NULL,
	columns TEXT NOT NULL
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
	FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);`)
	return err
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
		`SELECT name, logo, url, target FROM services WHERE category_id = ? ORDER BY order_idx`,
		categoryID,
	)
	if err != nil {
		return nil, fmt.Errorf("load services: %w", err)
	}
	defer rows.Close()

	var services []config.Service
	for rows.Next() {
		var service config.Service
		if err := rows.Scan(&service.Name, &service.Logo, &service.URL, &service.Target); err != nil {
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

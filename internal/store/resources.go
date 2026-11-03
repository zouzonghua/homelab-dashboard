package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/zouzonghua/homelab-dashboard/internal/config"
)

func (s *Store) LoadDashboard(ctx context.Context) (config.Dashboard, error) {
	if err := s.ensureSeed(ctx); err != nil {
		return config.Dashboard{}, err
	}
	var dashboard config.Dashboard
	err := s.db.QueryRowContext(ctx, `SELECT date, title, columns FROM configs WHERE id = 1`).Scan(
		&dashboard.Date,
		&dashboard.Title,
		&dashboard.Columns,
	)
	if err != nil {
		return dashboard, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT capacity, placement FROM masonry_placements`)
	if err != nil {
		return dashboard, err
	}
	defer rows.Close()
	dashboard.MasonryPlacements = make(map[int]config.MasonryPlacement)
	for rows.Next() {
		var capacity int
		var raw []byte
		var placement config.MasonryPlacement
		if err := rows.Scan(&capacity, &raw); err != nil {
			return dashboard, err
		}
		if err := json.Unmarshal(raw, &placement); err != nil {
			return dashboard, err
		}
		dashboard.MasonryPlacements[capacity] = placement
	}
	return dashboard, rows.Err()
}

func (s *Store) ListCategories(ctx context.Context) ([]config.CategoryResource, error) {
	if err := s.ensureSeed(ctx); err != nil {
		return nil, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id, order_idx, name, icon FROM categories ORDER BY order_idx`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []config.CategoryResource
	for rows.Next() {
		var category config.CategoryResource
		if err := rows.Scan(&category.ID, &category.Order, &category.Name, &category.Icon); err != nil {
			return nil, err
		}
		categories = append(categories, category)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if categories == nil {
		return []config.CategoryResource{}, nil
	}
	return categories, nil
}

func (s *Store) GetCategory(ctx context.Context, id int64) (config.CategoryResource, error) {
	if err := s.ensureSeed(ctx); err != nil {
		return config.CategoryResource{}, err
	}
	var category config.CategoryResource
	err := s.db.QueryRowContext(ctx, `SELECT id, order_idx, name, icon FROM categories WHERE id = ?`, id).Scan(
		&category.ID,
		&category.Order,
		&category.Name,
		&category.Icon,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return config.CategoryResource{}, ErrNotFound
	}
	if err != nil {
		return config.CategoryResource{}, err
	}
	services, err := s.ListServicesByCategory(ctx, id)
	if err != nil {
		return config.CategoryResource{}, err
	}
	category.Services = services
	return category, nil
}

func (s *Store) CreateCategory(ctx context.Context, category config.CategoryResource) (config.CategoryResource, error) {
	if err := s.ensureSeed(ctx); err != nil {
		return config.CategoryResource{}, err
	}
	order, err := s.nextOrder(ctx, "categories", "")
	if err != nil {
		return config.CategoryResource{}, err
	}
	result, err := s.db.ExecContext(ctx, `INSERT INTO categories (order_idx, name, icon) VALUES (?, ?, ?)`, order, category.Name, category.Icon)
	if err != nil {
		return config.CategoryResource{}, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return config.CategoryResource{}, err
	}
	return s.GetCategory(ctx, id)
}

func (s *Store) UpdateCategory(ctx context.Context, id int64, patch config.CategoryResourcePatch) (config.CategoryResource, error) {
	if _, err := s.db.ExecContext(ctx,
		`UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), order_idx = COALESCE(?, order_idx) WHERE id = ?`,
		patch.Name, patch.Icon, patch.Order, id,
	); err != nil {
		return config.CategoryResource{}, err
	}
	return s.GetCategory(ctx, id)
}

func (s *Store) DeleteCategory(ctx context.Context, id int64) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM categories WHERE id = ?`, id)
	if err != nil {
		return err
	}
	return requireAffected(result)
}

func (s *Store) ListServices(ctx context.Context) ([]config.ServiceResource, error) {
	if err := s.ensureSeed(ctx); err != nil {
		return nil, err
	}
	return s.listServices(ctx, `SELECT id, category_id, order_idx, name, logo, url, target, monitor_url, monitor_enabled FROM services ORDER BY category_id, order_idx`)
}

func (s *Store) ListServicesByCategory(ctx context.Context, categoryID int64) ([]config.ServiceResource, error) {
	return s.listServices(ctx, `SELECT id, category_id, order_idx, name, logo, url, target, monitor_url, monitor_enabled FROM services WHERE category_id = ? ORDER BY order_idx`, categoryID)
}

func (s *Store) GetService(ctx context.Context, id int64) (config.ServiceResource, error) {
	if err := s.ensureSeed(ctx); err != nil {
		return config.ServiceResource{}, err
	}
	var service config.ServiceResource
	err := s.db.QueryRowContext(
		ctx,
		`SELECT id, category_id, order_idx, name, logo, url, target, monitor_url, monitor_enabled FROM services WHERE id = ?`,
		id,
	).Scan(&service.ID, &service.CategoryID, &service.Order, &service.Name, &service.Logo, &service.URL, &service.Target, &service.MonitorURL, &service.MonitorEnabled)
	if errors.Is(err, sql.ErrNoRows) {
		return config.ServiceResource{}, ErrNotFound
	}
	return service, err
}

func (s *Store) CreateService(ctx context.Context, service config.ServiceResource) (config.ServiceResource, error) {
	if err := s.ensureSeed(ctx); err != nil {
		return config.ServiceResource{}, err
	}
	if _, err := s.GetCategory(ctx, service.CategoryID); err != nil {
		return config.ServiceResource{}, err
	}
	order, err := s.nextOrder(ctx, "services", "WHERE category_id = ?", service.CategoryID)
	if err != nil {
		return config.ServiceResource{}, err
	}
	result, err := s.db.ExecContext(
		ctx,
		`INSERT INTO services (category_id, order_idx, name, logo, url, target, monitor_url, monitor_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		service.CategoryID,
		order,
		service.Name,
		service.Logo,
		service.URL,
		service.Target,
		service.MonitorURL,
		service.MonitorEnabled,
	)
	if err != nil {
		return config.ServiceResource{}, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return config.ServiceResource{}, err
	}
	return s.GetService(ctx, id)
}

func (s *Store) UpdateService(ctx context.Context, id int64, patch config.ServiceResourcePatch) (config.ServiceResource, error) {
	if patch.CategoryID != nil {
		if _, err := s.GetCategory(ctx, *patch.CategoryID); err != nil {
			return config.ServiceResource{}, err
		}
	}
	_, err := s.db.ExecContext(ctx, `UPDATE services SET
		category_id = COALESCE(?, category_id), order_idx = COALESCE(?, order_idx),
		name = COALESCE(?, name), logo = COALESCE(?, logo), url = COALESCE(?, url),
		target = COALESCE(?, target), monitor_url = COALESCE(?, monitor_url),
		monitor_enabled = COALESCE(?, monitor_enabled) WHERE id = ?`,
		patch.CategoryID, patch.Order, patch.Name, patch.Logo, patch.URL,
		patch.Target, patch.MonitorURL, patch.MonitorEnabled, id,
	)
	if err != nil {
		return config.ServiceResource{}, err
	}
	return s.GetService(ctx, id)
}

func (s *Store) DeleteService(ctx context.Context, id int64) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM services WHERE id = ?`, id)
	if err != nil {
		return err
	}
	return requireAffected(result)
}

func (s *Store) ensureSeed(ctx context.Context) error {
	empty, err := s.isEmpty(ctx)
	if err != nil {
		return err
	}
	if !empty {
		return nil
	}
	return s.ReplaceConfig(ctx, s.seed)
}

func (s *Store) listServices(ctx context.Context, query string, args ...any) ([]config.ServiceResource, error) {
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []config.ServiceResource
	for rows.Next() {
		var service config.ServiceResource
		if err := rows.Scan(&service.ID, &service.CategoryID, &service.Order, &service.Name, &service.Logo, &service.URL, &service.Target, &service.MonitorURL, &service.MonitorEnabled); err != nil {
			return nil, err
		}
		services = append(services, service)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if services == nil {
		return []config.ServiceResource{}, nil
	}
	return services, nil
}

func (s *Store) nextOrder(ctx context.Context, table string, clause string, args ...any) (int, error) {
	var order int
	query := fmt.Sprintf(`SELECT COALESCE(MAX(order_idx), -1) + 1 FROM %s %s`, table, clause)
	if err := s.db.QueryRowContext(ctx, query, args...).Scan(&order); err != nil {
		return 0, err
	}
	return order, nil
}

func requireAffected(result sql.Result) error {
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

var ErrInvalidOrder = errors.New("invalid resource order")

// SaveOrder replaces the order of all categories or all services in one category.
func (s *Store) SaveOrder(ctx context.Context, categoryID *int64, ids []int64, masonry *config.MasonryOrder) error {
	if len(ids) == 0 {
		return ErrInvalidOrder
	}
	if masonry != nil {
		if categoryID != nil || masonry.Capacity < 1 || masonry.Capacity > 5 || len(masonry.Sizes) < 1 || len(masonry.Sizes) > 5 {
			return ErrInvalidOrder
		}
		remaining := len(ids)
		for _, size := range masonry.Sizes {
			if size < 0 || size > remaining {
				return ErrInvalidOrder
			}
			remaining -= size
		}
		if remaining != 0 {
			return ErrInvalidOrder
		}
	}
	if err := s.ensureSeed(ctx); err != nil {
		return err
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	countSQL := "SELECT COUNT(*) FROM categories"
	updateSQL := "UPDATE categories SET order_idx = ? WHERE id = ?"
	var scope []any
	if categoryID != nil {
		countSQL = "SELECT COUNT(*) FROM services WHERE category_id = ?"
		updateSQL = "UPDATE services SET order_idx = ? WHERE id = ? AND category_id = ?"
		scope = []any{*categoryID}
	}
	var count int
	if err := tx.QueryRowContext(ctx, countSQL, scope...).Scan(&count); err != nil {
		return err
	}
	if count != len(ids) {
		return ErrInvalidOrder
	}

	seen := make(map[int64]bool, len(ids))
	for index, id := range ids {
		if seen[id] {
			return ErrInvalidOrder
		}
		seen[id] = true
		result, err := tx.ExecContext(ctx, updateSQL, append([]any{index, id}, scope...)...)
		if err != nil {
			return err
		}
		if err := requireAffected(result); errors.Is(err, ErrNotFound) {
			return ErrInvalidOrder
		} else if err != nil {
			return err
		}
	}
	if masonry != nil {
		placement, err := json.Marshal(config.MasonryPlacement{IDs: ids, Sizes: masonry.Sizes})
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO masonry_placements (capacity, placement) VALUES (?, ?)
			ON CONFLICT(capacity) DO UPDATE SET placement = excluded.placement`, masonry.Capacity, string(placement)); err != nil {
			return err
		}
	}
	return tx.Commit()
}

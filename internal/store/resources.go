package store

import (
	"context"
	"database/sql"
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
	return dashboard, err
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
	category, err := s.GetCategory(ctx, id)
	if err != nil {
		return config.CategoryResource{}, err
	}
	if patch.Name != nil {
		category.Name = *patch.Name
	}
	if patch.Icon != nil {
		category.Icon = *patch.Icon
	}
	if patch.Order != nil {
		category.Order = *patch.Order
	}
	if _, err := s.db.ExecContext(ctx, `UPDATE categories SET name = ?, icon = ?, order_idx = ? WHERE id = ?`, category.Name, category.Icon, category.Order, id); err != nil {
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
	service, err := s.GetService(ctx, id)
	if err != nil {
		return config.ServiceResource{}, err
	}
	if patch.CategoryID != nil {
		if _, err := s.GetCategory(ctx, *patch.CategoryID); err != nil {
			return config.ServiceResource{}, err
		}
		service.CategoryID = *patch.CategoryID
	}
	if patch.Order != nil {
		service.Order = *patch.Order
	}
	if patch.Name != nil {
		service.Name = *patch.Name
	}
	if patch.Logo != nil {
		service.Logo = *patch.Logo
	}
	if patch.URL != nil {
		service.URL = *patch.URL
	}
	if patch.Target != nil {
		service.Target = *patch.Target
	}
	if patch.MonitorURL != nil {
		service.MonitorURL = *patch.MonitorURL
	}
	if patch.MonitorEnabled != nil {
		service.MonitorEnabled = *patch.MonitorEnabled
	}
	_, err = s.db.ExecContext(
		ctx,
		`UPDATE services SET category_id = ?, order_idx = ?, name = ?, logo = ?, url = ?, target = ?, monitor_url = ?, monitor_enabled = ? WHERE id = ?`,
		service.CategoryID,
		service.Order,
		service.Name,
		service.Logo,
		service.URL,
		service.Target,
		service.MonitorURL,
		service.MonitorEnabled,
		id,
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

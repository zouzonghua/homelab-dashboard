package store

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/zouzonghua/homelab-dashboard/internal/config"
)

const defaultAuditLogLimit = 50
const maxAuditLogLimit = 200

func (s *Store) CreateAuditLog(ctx context.Context, entry config.AuditLogCreate) (config.AuditLog, error) {
	if strings.TrimSpace(entry.ActorType) == "" {
		entry.ActorType = "local"
	}
	result, err := s.db.ExecContext(
		ctx,
		`INSERT INTO audit_logs (
			actor_type, actor_id, actor_name, action, resource_type, resource_id, summary,
			before_json, after_json, metadata_json, request_id, ip_address, user_agent
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		entry.ActorType,
		entry.ActorID,
		entry.ActorName,
		entry.Action,
		entry.ResourceType,
		entry.ResourceID,
		entry.Summary,
		entry.BeforeJSON,
		entry.AfterJSON,
		entry.MetadataJSON,
		entry.RequestID,
		entry.IPAddress,
		entry.UserAgent,
	)
	if err != nil {
		return config.AuditLog{}, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return config.AuditLog{}, err
	}
	return s.getAuditLog(ctx, id)
}

func (s *Store) ListAuditLogs(ctx context.Context, query config.AuditLogQuery) ([]config.AuditLog, error) {
	limit := query.Limit
	if limit <= 0 {
		limit = defaultAuditLogLimit
	}
	if limit > maxAuditLogLimit {
		limit = maxAuditLogLimit
	}
	offset := query.Offset
	if offset < 0 {
		offset = 0
	}

	filterSQL, args := auditLogFilterSQL(query)
	sql := `SELECT id, actor_type, actor_id, actor_name, action, resource_type, resource_id, summary,
		before_json, after_json, metadata_json, request_id, ip_address, user_agent, created_at
		FROM audit_logs`
	sql += filterSQL
	sql += " ORDER BY id DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := s.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []config.AuditLog
	for rows.Next() {
		var log config.AuditLog
		var beforeJSON, afterJSON, metadataJSON string
		if err := rows.Scan(
			&log.ID,
			&log.ActorType,
			&log.ActorID,
			&log.ActorName,
			&log.Action,
			&log.ResourceType,
			&log.ResourceID,
			&log.Summary,
			&beforeJSON,
			&afterJSON,
			&metadataJSON,
			&log.RequestID,
			&log.IPAddress,
			&log.UserAgent,
			&log.CreatedAt,
		); err != nil {
			return nil, err
		}
		log.Before = rawJSONOrNil(beforeJSON)
		log.After = rawJSONOrNil(afterJSON)
		log.Metadata = rawJSONOrNil(metadataJSON)
		logs = append(logs, log)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if logs == nil {
		return []config.AuditLog{}, nil
	}
	return logs, nil
}

func (s *Store) CountAuditLogs(ctx context.Context, query config.AuditLogQuery) (int, error) {
	filterSQL, args := auditLogFilterSQL(query)
	var total int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM audit_logs`+filterSQL, args...).Scan(&total)
	return total, err
}

func (s *Store) getAuditLog(ctx context.Context, id int64) (config.AuditLog, error) {
	var log config.AuditLog
	var beforeJSON, afterJSON, metadataJSON string
	err := s.db.QueryRowContext(
		ctx,
		`SELECT id, actor_type, actor_id, actor_name, action, resource_type, resource_id, summary,
			before_json, after_json, metadata_json, request_id, ip_address, user_agent, created_at
			FROM audit_logs WHERE id = ?`,
		id,
	).Scan(
		&log.ID,
		&log.ActorType,
		&log.ActorID,
		&log.ActorName,
		&log.Action,
		&log.ResourceType,
		&log.ResourceID,
		&log.Summary,
		&beforeJSON,
		&afterJSON,
		&metadataJSON,
		&log.RequestID,
		&log.IPAddress,
		&log.UserAgent,
		&log.CreatedAt,
	)
	log.Before = rawJSONOrNil(beforeJSON)
	log.After = rawJSONOrNil(afterJSON)
	log.Metadata = rawJSONOrNil(metadataJSON)
	return log, err
}

func rawJSONOrNil(value string) json.RawMessage {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return json.RawMessage(value)
}

func auditLogFilterSQL(query config.AuditLogQuery) (string, []any) {
	var args []any
	var where []string
	if strings.TrimSpace(query.Action) != "" {
		where = append(where, "action = ?")
		args = append(args, strings.TrimSpace(query.Action))
	}
	if strings.TrimSpace(query.ResourceType) != "" {
		where = append(where, "resource_type = ?")
		args = append(args, strings.TrimSpace(query.ResourceType))
	}
	if strings.TrimSpace(query.ResourceID) != "" {
		where = append(where, "resource_id = ?")
		args = append(args, strings.TrimSpace(query.ResourceID))
	}
	if len(where) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(where, " AND "), args
}

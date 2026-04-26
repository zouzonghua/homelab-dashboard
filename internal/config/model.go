package config

import "encoding/json"

type Config struct {
	Date    string     `json:"date"`
	Title   string     `json:"title"`
	Columns string     `json:"columns"`
	Items   []Category `json:"items"`
}

type Category struct {
	Name string    `json:"name"`
	Icon string    `json:"icon"`
	List []Service `json:"list"`
}

type Service struct {
	Name           string `json:"name"`
	Logo           string `json:"logo"`
	URL            string `json:"url"`
	Target         string `json:"target"`
	MonitorURL     string `json:"monitorUrl,omitempty"`
	MonitorEnabled bool   `json:"monitorEnabled,omitempty"`
}

type Dashboard struct {
	Date    string `json:"date"`
	Title   string `json:"title"`
	Columns int    `json:"columns"`
}

type CategoryResource struct {
	ID       int64             `json:"id"`
	Order    int               `json:"order"`
	Name     string            `json:"name"`
	Icon     string            `json:"icon"`
	Services []ServiceResource `json:"services,omitempty"`
}

type CategoryResourcePatch struct {
	Name  *string `json:"name,omitempty"`
	Icon  *string `json:"icon,omitempty"`
	Order *int    `json:"order,omitempty"`
}

type ServiceResource struct {
	ID             int64  `json:"id"`
	CategoryID     int64  `json:"categoryId"`
	Order          int    `json:"order"`
	Name           string `json:"name"`
	Logo           string `json:"logo"`
	URL            string `json:"url"`
	Target         string `json:"target"`
	MonitorURL     string `json:"monitorUrl,omitempty"`
	MonitorEnabled bool   `json:"monitorEnabled"`
}

type ServiceResourcePatch struct {
	CategoryID     *int64  `json:"categoryId,omitempty"`
	Order          *int    `json:"order,omitempty"`
	Name           *string `json:"name,omitempty"`
	Logo           *string `json:"logo,omitempty"`
	URL            *string `json:"url,omitempty"`
	Target         *string `json:"target,omitempty"`
	MonitorURL     *string `json:"monitorUrl,omitempty"`
	MonitorEnabled *bool   `json:"monitorEnabled,omitempty"`
}

type Pagination struct {
	Limit   int  `json:"limit"`
	Offset  int  `json:"offset"`
	Total   int  `json:"total"`
	HasMore bool `json:"hasMore"`
}

type CategoryListResponse struct {
	Data       []CategoryResource `json:"data"`
	Pagination Pagination         `json:"pagination"`
}

type ServiceListResponse struct {
	Data       []ServiceResource `json:"data"`
	Pagination Pagination        `json:"pagination"`
}

type AuditLogListResponse struct {
	Data       []AuditLog `json:"data"`
	Pagination Pagination `json:"pagination"`
}

type AuditLog struct {
	ID           int64           `json:"id"`
	ActorType    string          `json:"actorType"`
	ActorID      string          `json:"actorId,omitempty"`
	ActorName    string          `json:"actorName,omitempty"`
	Action       string          `json:"action"`
	ResourceType string          `json:"resourceType"`
	ResourceID   string          `json:"resourceId,omitempty"`
	Summary      string          `json:"summary"`
	Before       json.RawMessage `json:"before,omitempty"`
	After        json.RawMessage `json:"after,omitempty"`
	Metadata     json.RawMessage `json:"metadata,omitempty"`
	RequestID    string          `json:"requestId,omitempty"`
	IPAddress    string          `json:"ipAddress,omitempty"`
	UserAgent    string          `json:"userAgent,omitempty"`
	CreatedAt    string          `json:"createdAt"`
}

type AuditLogCreate struct {
	ActorType    string
	ActorID      string
	ActorName    string
	Action       string
	ResourceType string
	ResourceID   string
	Summary      string
	BeforeJSON   string
	AfterJSON    string
	MetadataJSON string
	RequestID    string
	IPAddress    string
	UserAgent    string
}

type AuditLogQuery struct {
	Action       string
	ResourceType string
	ResourceID   string
	Limit        int
	Offset       int
}

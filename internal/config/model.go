package config

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

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

package config

import (
	_ "embed"
	"encoding/json"
	"os"
)

//go:embed default-dashboard.json
var defaultSeed []byte

func LoadSeedFromEnv() (Config, error) {
	if path := os.Getenv("HOMELAB_SEED_PATH"); path != "" {
		return LoadSeedFile(path)
	}
	return DecodeSeed(defaultSeed)
}

func LoadSeedFile(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, err
	}
	return DecodeSeed(data)
}

func DecodeSeed(data []byte) (Config, error) {
	var seed Config
	if err := json.Unmarshal(data, &seed); err != nil {
		return Config{}, err
	}
	return seed, nil
}

package config

import (
	"os"
	"strings"
	"testing"
)

func TestLoadSeedFromEnvUsesEmbeddedDefaultWithoutWebAsset(t *testing.T) {
	t.Setenv("HOMELAB_SEED_PATH", "")

	previousDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Getwd() error = %v", err)
	}
	tempDir := t.TempDir()
	if err := os.Chdir(tempDir); err != nil {
		t.Fatalf("Chdir() error = %v", err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(previousDir); err != nil {
			t.Fatalf("restore cwd: %v", err)
		}
	})

	seed, err := LoadSeedFromEnv()
	if err != nil {
		t.Fatalf("LoadSeedFromEnv() error = %v", err)
	}
	if seed.Title == "" || len(seed.Items) == 0 {
		t.Fatalf("embedded seed was not loaded: %#v", seed)
	}
	for _, category := range seed.Items {
		for _, service := range category.List {
			if strings.HasPrefix(service.Logo, "assets/icons/") {
				t.Fatalf("embedded seed should not reference bundled service icons: %#v", service)
			}
		}
	}
}

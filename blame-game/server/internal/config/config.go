package config

import "os"

type Config struct {
	Port        string
	DSN         string
	WxAppID     string
	WxAppSecret string
	JWTSecret   string
}

func Load() *Config {
	return &Config{
		Port:        env("PORT", "8081"),
		DSN:         env("DSN", "root:root@tcp(127.0.0.1:3306)/blame_game?charset=utf8mb4&parseTime=True"),
		WxAppID:     env("WX_APP_ID", ""),
		WxAppSecret: env("WX_APP_SECRET", ""),
		JWTSecret:   env("JWT_SECRET", "blame-game-secret"),
	}
}

func env(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

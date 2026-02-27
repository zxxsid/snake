package config

import "os"

// Config 服务端配置
type Config struct {
	Port        string
	DSN         string
	WxAppID     string // 微信小游戏 AppID
	WxAppSecret string // 微信小游戏 AppSecret
	JWTSecret   string
}

// Load 从环境变量加载配置
func Load() *Config {
	return &Config{
		Port:        env("PORT", "8082"),
		DSN:         env("DSN", "root:root@tcp(127.0.0.1:3306)/legend?charset=utf8mb4&parseTime=True"),
		WxAppID:     env("WX_APP_ID", ""),
		WxAppSecret: env("WX_APP_SECRET", ""),
		JWTSecret:   env("JWT_SECRET", "legend-secret-key"),
	}
}

func env(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

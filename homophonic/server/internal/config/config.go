package config

import "os"

// Config 服务配置
type Config struct {
	Port        string
	DSN         string
	WxAppID     string
	WxAppSecret string
	JWTSecret   string
	StaticDir   string
}

// Load 从环境变量加载配置
func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		DSN:         getEnv("DSN", "root:root@tcp(127.0.0.1:3306)/homophonic?charset=utf8mb4&parseTime=True"),
		WxAppID:     getEnv("WX_APP_ID", ""),
		WxAppSecret: getEnv("WX_APP_SECRET", ""),
		JWTSecret:   getEnv("JWT_SECRET", "homophonic-secret-key"),
		StaticDir:   getEnv("STATIC_DIR", "./static"),
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

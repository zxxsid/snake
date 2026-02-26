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
	// S3 存储
	S3Endpoint       string
	S3Region         string
	S3Bucket         string
	S3AccessKey      string
	S3SecretKey      string
	S3UsePathStyle   bool
	S3PublicURL      string
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
		S3Endpoint:     getEnv("S3_ENDPOINT", "http://localhost:9000"),
		S3Region:       getEnv("S3_REGION", "us-east-1"),
		S3Bucket:       getEnv("S3_BUCKET", "homophonic"),
		S3AccessKey:    getEnv("S3_ACCESS_KEY", "minioadmin"),
		S3SecretKey:    getEnv("S3_SECRET_KEY", "minioadmin"),
		S3UsePathStyle: getEnv("S3_USE_PATH_STYLE", "true") == "true",
		S3PublicURL:    getEnv("S3_PUBLIC_URL", "http://localhost:9000/homophonic"),
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

package main

import (
	"log"
	"net/http"

	"legend-server/internal/config"
	"legend-server/internal/handler"
	"legend-server/internal/middleware"
	"legend-server/internal/service"
)

func main() {
	cfg := config.Load()
	db, err := service.NewDB(cfg.DSN)
	if err != nil { log.Fatalf("DB 连接失败: %v", err) }

	h := handler.New(db, cfg)
	auth := middleware.Auth(cfg.JWTSecret)
	mux := http.NewServeMux()

	// 公开接口
	mux.HandleFunc("POST /api/login", h.Login)

	// 需登录的接口
	mux.Handle("POST /api/bind-phone", auth(http.HandlerFunc(h.BindPhone)))
	mux.Handle("POST /api/select-class", auth(http.HandlerFunc(h.SelectClass)))
	mux.Handle("GET /api/game-data", auth(http.HandlerFunc(h.GetGameData)))

	// WebSocket（后续阶段实现）
	// mux.HandleFunc("/ws", hub.HandleWS)

	log.Printf("🌿 卡通传奇服务启动 :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, cors(mux)))
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" { w.WriteHeader(204); return }
		log.Printf("[HTTP] %s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

package main

import (
	"log"
	"net/http"

	"blame-game-server/internal/config"
	"blame-game-server/internal/handler"
	"blame-game-server/internal/middleware"
	"blame-game-server/internal/ws"
	"blame-game-server/internal/service"
)

func main() {
	cfg := config.Load()
	db, err := service.NewDB(cfg.DSN)
	if err != nil {
		log.Fatalf("DB 连接失败: %v", err)
	}

	h := handler.New(db, cfg)
	hub := ws.NewHub(db, cfg.JWTSecret)
	auth := middleware.Auth(cfg.JWTSecret)
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/login", h.Login)
	mux.Handle("POST /api/room/create", auth(http.HandlerFunc(h.CreateRoom)))
	mux.HandleFunc("/ws", hub.HandleWS)

	log.Printf("甩锅大作战服务启动 :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, cors(mux)))
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" { w.WriteHeader(204); return }
		log.Printf("[HTTP] %s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

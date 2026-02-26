package main

import (
	"log"
	"net/http"

	"homophonic-server/internal/config"
	"homophonic-server/internal/handler"
	"homophonic-server/internal/middleware"
	"homophonic-server/internal/service"
	"homophonic-server/internal/ws"
)

func main() {
	cfg := config.Load()

	db, err := service.NewDB(cfg.DSN)
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}

	h := handler.New(db, cfg)
	hub := ws.NewHub(db, cfg.JWTSecret)
	hub.StartCleanup()

	auth := middleware.Auth(cfg.JWTSecret)
	mux := http.NewServeMux()

	// CORS 中间件
	corsMux := corsMiddleware(mux)

	// 公开接口
	mux.HandleFunc("POST /api/login", h.Login)

	// 静态文件（题目图片）
	mux.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir(cfg.StaticDir+"/images"))))

	// 需要登录的接口
	mux.Handle("GET /api/puzzle", auth(http.HandlerFunc(h.GetPuzzle)))
	mux.Handle("POST /api/answer", auth(http.HandlerFunc(h.CheckAnswer)))
	mux.Handle("GET /api/hint", auth(http.HandlerFunc(h.GetHint)))
	mux.Handle("GET /api/answer", auth(http.HandlerFunc(h.GetFullAnswer)))
	mux.Handle("POST /api/room/create", auth(http.HandlerFunc(h.CreateRoom)))
	mux.Handle("POST /api/room/join", auth(http.HandlerFunc(h.JoinRoom)))

	// WebSocket
	mux.HandleFunc("/ws", hub.HandleWS)

	log.Printf("服务启动在 :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, corsMux))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}

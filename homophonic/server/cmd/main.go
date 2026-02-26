package main

import (
	"log"
	"net/http"

	"homophonic-server/internal/config"
	"homophonic-server/internal/handler"
	"homophonic-server/internal/middleware"
	"homophonic-server/internal/service"
	"homophonic-server/internal/storage"
	"homophonic-server/internal/ws"
)

func main() {
	cfg := config.Load()

	db, err := service.NewDB(cfg.DSN)
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}

	// S3 存储（可选，连不上不影响启动）
	var store *storage.S3Store
	store, err = storage.NewS3Store(storage.S3Config{
		Endpoint:       cfg.S3Endpoint,
		Region:         cfg.S3Region,
		Bucket:         cfg.S3Bucket,
		AccessKeyID:    cfg.S3AccessKey,
		SecretAccessKey: cfg.S3SecretKey,
		UsePathStyle:   cfg.S3UsePathStyle,
		PublicURLPrefix: cfg.S3PublicURL,
	})
	if err != nil {
		log.Printf("[警告] S3 存储初始化失败（图片上传不可用）: %v", err)
	}

	h := handler.New(db, cfg)
	if store != nil {
		h.SetStorage(store)
	}

	hub := ws.NewHub(db, cfg.JWTSecret)
	hub.StartCleanup()

	auth := middleware.Auth(cfg.JWTSecret)
	mux := http.NewServeMux()
	corsMux := corsMiddleware(mux)

	// 公开接口
	mux.HandleFunc("POST /api/login", h.Login)
	mux.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir(cfg.StaticDir+"/images"))))

	// 游戏接口（需登录）
	mux.Handle("GET /api/puzzle", auth(http.HandlerFunc(h.GetPuzzle)))
	mux.Handle("POST /api/answer", auth(http.HandlerFunc(h.CheckAnswer)))
	mux.Handle("GET /api/hint", auth(http.HandlerFunc(h.GetHint)))
	mux.Handle("GET /api/answer", auth(http.HandlerFunc(h.GetFullAnswer)))
	mux.Handle("POST /api/room/create", auth(http.HandlerFunc(h.CreateRoom)))
	mux.Handle("POST /api/room/join", auth(http.HandlerFunc(h.JoinRoom)))

	// 管理后台接口
	mux.HandleFunc("GET /api/admin/puzzles", h.ListPuzzles)
	mux.HandleFunc("POST /api/admin/puzzles", h.CreatePuzzle)
	mux.HandleFunc("PUT /api/admin/puzzles", h.UpdatePuzzle)
	mux.HandleFunc("DELETE /api/admin/puzzles", h.DeletePuzzle)
	mux.HandleFunc("POST /api/admin/upload", h.UploadImage)

	// WebSocket
	mux.HandleFunc("/ws", hub.HandleWS)

	log.Printf("服务启动在 :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, corsMux))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		log.Printf("[HTTP] %s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

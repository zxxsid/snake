package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"blame-game-server/internal/config"
	"blame-game-server/internal/middleware"
	"blame-game-server/internal/service"
)

type Handler struct {
	db  *service.DB
	cfg *config.Config
}

func New(db *service.DB, cfg *config.Config) *Handler { return &Handler{db: db, cfg: cfg} }

func J(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func E(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	fmt.Fprintf(w, `{"error":"%s"}`, msg)
}

// Login 微信登录
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code     string `json:"code"`
		Nickname string `json:"nickname"`
		Avatar   string `json:"avatar"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		E(w, "参数错误", 400)
		return
	}
	log.Printf("[Login] code=%s nick=%s", req.Code, req.Nickname)

	var openID string
	if h.cfg.WxAppID != "" && req.Code != "" {
		url := fmt.Sprintf("https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
			h.cfg.WxAppID, h.cfg.WxAppSecret, req.Code)
		resp, err := http.Get(url) //nolint:gosec
		if err != nil {
			E(w, "微信接口失败", 500)
			return
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var sess struct {
			OpenID string `json:"openid"`
			ErrMsg string `json:"errmsg"`
		}
		json.Unmarshal(body, &sess) //nolint:errcheck
		if sess.OpenID == "" {
			log.Printf("[Login] 微信返回: %s", string(body))
			E(w, "微信登录失败", 400)
			return
		}
		openID = sess.OpenID
	} else {
		openID = "dev_" + req.Code
		if req.Code == "" {
			openID = "dev_guest"
		}
	}

	user, err := h.db.GetOrCreateUser(openID, req.Nickname, req.Avatar)
	if err != nil {
		log.Printf("[Login] DB err: %v", err)
		E(w, "创建用户失败", 500)
		return
	}
	token, _ := middleware.GenerateToken(user.ID, h.cfg.JWTSecret)
	J(w, map[string]interface{}{"token": token, "user": user})
}

// CreateRoom 创建房间
func (h *Handler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	roomID := service.GenerateRoomID()
	J(w, map[string]interface{}{"room_id": roomID})
}

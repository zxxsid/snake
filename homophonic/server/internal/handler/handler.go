package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"homophonic-server/internal/config"
	"homophonic-server/internal/middleware"
	"homophonic-server/internal/service"
)

// Handler HTTP 请求处理
type Handler struct {
	db  *service.DB
	cfg *config.Config
}

func New(db *service.DB, cfg *config.Config) *Handler {
	return &Handler{db: db, cfg: cfg}
}

func jsonResp(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func jsonErr(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	fmt.Fprintf(w, `{"error":"%s"}`, msg)
}

// --- 微信登录 ---

type wxLoginReq struct {
	Code     string `json:"code"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
}

type wxSession struct {
	OpenID     string `json:"openid"`
	SessionKey string `json:"session_key"`
	ErrCode    int    `json:"errcode"`
	ErrMsg     string `json:"errmsg"`
}

// Login 微信登录（用 code 换 openid）
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req wxLoginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "参数错误", 400)
		return
	}

	var openID string
	if h.cfg.WxAppID != "" && req.Code != "" {
		// 调用微信接口换取 openid
		url := fmt.Sprintf("https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
			h.cfg.WxAppID, h.cfg.WxAppSecret, req.Code)
		resp, err := http.Get(url) //nolint:gosec
		if err != nil {
			jsonErr(w, "微信接口请求失败", 500)
			return
		}
		defer resp.Body.Close()
		var sess wxSession
		body, _ := io.ReadAll(resp.Body)
		json.Unmarshal(body, &sess) //nolint:errcheck
		if sess.OpenID == "" {
			jsonErr(w, "微信登录失败: "+sess.ErrMsg, 400)
			return
		}
		openID = sess.OpenID
	} else {
		// 开发模式：直接用 code 作为 openid
		openID = "dev_" + req.Code
		if req.Code == "" {
			openID = "dev_guest"
		}
	}

	user, err := h.db.GetOrCreateUser(openID, req.Nickname, req.Avatar)
	if err != nil {
		jsonErr(w, "创建用户失败", 500)
		return
	}

	token, err := middleware.GenerateToken(user.ID, h.cfg.JWTSecret)
	if err != nil {
		jsonErr(w, "生成 token 失败", 500)
		return
	}

	jsonResp(w, map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

// --- 闯关模式 ---

// GetPuzzle 获取当前关卡题目
func (h *Handler) GetPuzzle(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	user, err := h.db.GetUserByID(uid)
	if err != nil {
		jsonErr(w, "用户不存在", 404)
		return
	}

	seqStr := r.URL.Query().Get("seq")
	seq := user.Level
	if seqStr != "" {
		seq, _ = strconv.Atoi(seqStr)
	}
	if seq > user.Level {
		jsonErr(w, "关卡未解锁", 403)
		return
	}

	puzzle, err := h.db.GetPuzzle(seq)
	if err != nil {
		jsonErr(w, "题目不存在", 404)
		return
	}

	total, _ := h.db.GetTotalPuzzles()
	jsonResp(w, map[string]interface{}{
		"puzzle":      puzzle,
		"user_level":  user.Level,
		"total":       total,
	})
}

// CheckAnswer 校验答案
func (h *Handler) CheckAnswer(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())

	var req struct {
		Seq    int    `json:"seq"`
		Answer string `json:"answer"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "参数错误", 400)
		return
	}

	puzzle, err := h.db.GetPuzzle(req.Seq)
	if err != nil {
		jsonErr(w, "题目不存在", 404)
		return
	}

	correct := strings.EqualFold(strings.TrimSpace(req.Answer), puzzle.Answer)
	if correct {
		h.db.UpdateLevel(uid, req.Seq+1) //nolint:errcheck
	}

	jsonResp(w, map[string]interface{}{
		"correct": correct,
	})
}

// GetHint 获取提示（第一个字）
func (h *Handler) GetHint(w http.ResponseWriter, r *http.Request) {
	seqStr := r.URL.Query().Get("seq")
	seq, _ := strconv.Atoi(seqStr)
	puzzle, err := h.db.GetPuzzle(seq)
	if err != nil {
		jsonErr(w, "题目不存在", 404)
		return
	}
	runes := []rune(puzzle.Answer)
	jsonResp(w, map[string]interface{}{
		"hint": string(runes[0]),
	})
}

// GetFullAnswer 获取完整答案（看广告后调用）
func (h *Handler) GetFullAnswer(w http.ResponseWriter, r *http.Request) {
	seqStr := r.URL.Query().Get("seq")
	seq, _ := strconv.Atoi(seqStr)
	puzzle, err := h.db.GetPuzzle(seq)
	if err != nil {
		jsonErr(w, "题目不存在", 404)
		return
	}
	jsonResp(w, map[string]interface{}{
		"answer": puzzle.Answer,
	})
}

// --- 竞技模式 ---

// CreateRoom 创建竞技房间
func (h *Handler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	ids, err := h.db.GetRandomPuzzleIDs(10)
	if err != nil || len(ids) == 0 {
		jsonErr(w, "题目不足", 500)
		return
	}
	match, err := h.db.CreateMatch(uid, ids)
	if err != nil {
		jsonErr(w, "创建房间失败", 500)
		return
	}
	jsonResp(w, map[string]interface{}{
		"room_id": match.RoomID,
	})
}

// JoinRoom 加入竞技房间
func (h *Handler) JoinRoom(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	var req struct {
		RoomID string `json:"room_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "参数错误", 400)
		return
	}
	match, err := h.db.JoinMatch(req.RoomID, uid)
	if err != nil {
		jsonErr(w, err.Error(), 400)
		return
	}
	jsonResp(w, map[string]interface{}{
		"match": match,
	})
}

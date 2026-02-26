package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"homophonic-server/internal/config"
	"homophonic-server/internal/middleware"
	"homophonic-server/internal/service"
)

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

// --- 登录 ---

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

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req wxLoginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[Login] 解析请求体失败: %v", err)
		jsonErr(w, "参数错误", 400)
		return
	}
	log.Printf("[Login] code=%s nickname=%s", req.Code, req.Nickname)

	var openID string
	if h.cfg.WxAppID != "" && req.Code != "" {
		url := fmt.Sprintf("https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
			h.cfg.WxAppID, h.cfg.WxAppSecret, req.Code)
		log.Printf("[Login] 请求微信接口: appid=%s", h.cfg.WxAppID)
		resp, err := http.Get(url) //nolint:gosec
		if err != nil {
			log.Printf("[Login] 微信接口请求失败: %v", err)
			jsonErr(w, "微信接口请求失败", 500)
			return
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[Login] 微信接口返回: %s", string(body))

		var sess wxSession
		json.Unmarshal(body, &sess) //nolint:errcheck
		if sess.OpenID == "" {
			log.Printf("[Login] 微信返回无 openid, errcode=%d errmsg=%s", sess.ErrCode, sess.ErrMsg)
			jsonErr(w, "微信登录失败: "+sess.ErrMsg, 400)
			return
		}
		openID = sess.OpenID
		log.Printf("[Login] 获取 openid 成功: %s", openID[:8]+"***")
	} else {
		openID = "dev_" + req.Code
		if req.Code == "" {
			openID = "dev_guest"
		}
		log.Printf("[Login] 开发模式, openid=%s (WxAppID 未配置)", openID)
	}

	user, err := h.db.GetOrCreateUser(openID, req.Nickname, req.Avatar)
	if err != nil {
		log.Printf("[Login] 数据库操作失败: %v", err)
		jsonErr(w, "创建用户失败: "+err.Error(), 500)
		return
	}

	token, err := middleware.GenerateToken(user.ID, h.cfg.JWTSecret)
	if err != nil {
		log.Printf("[Login] 生成 token 失败: %v", err)
		jsonErr(w, "生成 token 失败", 500)
		return
	}

	log.Printf("[Login] 登录成功: user_id=%d nickname=%s", user.ID, user.Nickname)
	jsonResp(w, map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

// --- 闯关 ---

func (h *Handler) GetPuzzle(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	user, err := h.db.GetUserByID(uid)
	if err != nil {
		log.Printf("[GetPuzzle] 获取用户失败: uid=%d err=%v", uid, err)
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
		log.Printf("[GetPuzzle] 获取题目失败: seq=%d err=%v", seq, err)
		jsonErr(w, "题目不存在", 404)
		return
	}

	total, _ := h.db.GetTotalPuzzles()
	jsonResp(w, map[string]interface{}{
		"puzzle":     puzzle,
		"user_level": user.Level,
		"total":      total,
	})
}

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
		log.Printf("[CheckAnswer] 获取题目失败: seq=%d err=%v", req.Seq, err)
		jsonErr(w, "题目不存在", 404)
		return
	}

	correct := strings.EqualFold(strings.TrimSpace(req.Answer), puzzle.Answer)
	if correct {
		h.db.UpdateLevel(uid, req.Seq+1) //nolint:errcheck
	}

	jsonResp(w, map[string]interface{}{"correct": correct})
}

func (h *Handler) GetHint(w http.ResponseWriter, r *http.Request) {
	seqStr := r.URL.Query().Get("seq")
	seq, _ := strconv.Atoi(seqStr)
	puzzle, err := h.db.GetPuzzle(seq)
	if err != nil {
		jsonErr(w, "题目不存在", 404)
		return
	}
	runes := []rune(puzzle.Answer)
	jsonResp(w, map[string]interface{}{"hint": string(runes[0])})
}

func (h *Handler) GetFullAnswer(w http.ResponseWriter, r *http.Request) {
	seqStr := r.URL.Query().Get("seq")
	seq, _ := strconv.Atoi(seqStr)
	puzzle, err := h.db.GetPuzzle(seq)
	if err != nil {
		jsonErr(w, "题目不存在", 404)
		return
	}
	jsonResp(w, map[string]interface{}{"answer": puzzle.Answer})
}

// --- 竞技 ---

func (h *Handler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	ids, err := h.db.GetRandomPuzzleIDs(10)
	if err != nil || len(ids) == 0 {
		log.Printf("[CreateRoom] 抽题失败: err=%v count=%d", err, len(ids))
		jsonErr(w, "题目不足", 500)
		return
	}
	match, err := h.db.CreateMatch(uid, ids)
	if err != nil {
		log.Printf("[CreateRoom] 创建房间失败: err=%v", err)
		jsonErr(w, "创建房间失败", 500)
		return
	}
	jsonResp(w, map[string]interface{}{"room_id": match.RoomID})
}

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
		log.Printf("[JoinRoom] 加入失败: room=%s err=%v", req.RoomID, err)
		jsonErr(w, err.Error(), 400)
		return
	}
	jsonResp(w, map[string]interface{}{"match": match})
}

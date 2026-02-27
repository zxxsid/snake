package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"legend-server/internal/config"
	"legend-server/internal/middleware"
	"legend-server/internal/model"
	"legend-server/internal/service"
)

// Handler HTTP 处理器
type Handler struct {
	DB  *service.DB
	Cfg *config.Config
}

func New(db *service.DB, cfg *config.Config) *Handler { return &Handler{DB: db, Cfg: cfg} }

func J(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}
func E(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	fmt.Fprintf(w, `{"error":"%s"}`, msg)
}

// Login 微信登录（code 换 openid + 手机号可选绑定）
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code     string `json:"code"`
		Nickname string `json:"nickname"`
		Avatar   string `json:"avatar"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		E(w, "参数错误", 400); return
	}
	log.Printf("[Login] code=%s nick=%s", req.Code, req.Nickname)

	var openID string
	if h.Cfg.WxAppID != "" && req.Code != "" {
		// 调用微信 jscode2session 接口
		url := fmt.Sprintf("https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
			h.Cfg.WxAppID, h.Cfg.WxAppSecret, req.Code)
		resp, err := http.Get(url) //nolint:gosec
		if err != nil { log.Printf("[Login] wx 请求失败: %v", err); E(w, "微信接口失败", 500); return }
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[Login] wx 返回: %s", string(body))
		var sess struct { OpenID string `json:"openid"`; ErrMsg string `json:"errmsg"` }
		json.Unmarshal(body, &sess) //nolint:errcheck
		if sess.OpenID == "" { E(w, "微信登录失败", 400); return }
		openID = sess.OpenID
	} else {
		// 开发模式
		openID = "dev_" + req.Code
		if req.Code == "" { openID = "dev_guest" }
		log.Printf("[Login] 开发模式 openid=%s", openID)
	}

	user, err := h.DB.GetOrCreateUser(openID, req.Nickname, req.Avatar)
	if err != nil { log.Printf("[Login] DB 错误: %v", err); E(w, "创建用户失败", 500); return }
	token, _ := middleware.GenerateToken(user.ID, h.Cfg.JWTSecret)
	log.Printf("[Login] 成功 uid=%d class=%s level=%d", user.ID, user.Class, user.Level)
	J(w, map[string]interface{}{"token": token, "user": user})
}

// BindPhone 绑定微信授权手机号
func (h *Handler) BindPhone(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	var req struct {
		Code string `json:"code"` // 微信 getPhoneNumber 返回的 code
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		E(w, "参数错误", 400); return
	}

	// 用 code 换手机号（需要 access_token）
	if h.Cfg.WxAppID != "" && req.Code != "" {
		// 先获取 access_token
		tokenURL := fmt.Sprintf("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s",
			h.Cfg.WxAppID, h.Cfg.WxAppSecret)
		resp, err := http.Get(tokenURL) //nolint:gosec
		if err != nil { E(w, "获取 token 失败", 500); return }
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var tokenResp struct { AccessToken string `json:"access_token"` }
		json.Unmarshal(body, &tokenResp) //nolint:errcheck

		// 用 access_token + code 获取手机号
		phoneURL := fmt.Sprintf("https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=%s", tokenResp.AccessToken)
		phoneBody := fmt.Sprintf(`{"code":"%s"}`, req.Code)
		phoneResp, err := http.Post(phoneURL, "application/json", jsonReader(phoneBody)) //nolint:gosec
		if err != nil { E(w, "获取手机号失败", 500); return }
		defer phoneResp.Body.Close()
		pb, _ := io.ReadAll(phoneResp.Body)
		var phoneData struct {
			PhoneInfo struct { PhoneNumber string `json:"phoneNumber"` } `json:"phone_info"`
		}
		json.Unmarshal(pb, &phoneData) //nolint:errcheck
		phone := phoneData.PhoneInfo.PhoneNumber
		if phone == "" { E(w, "手机号获取失败", 400); return }

		h.DB.BindPhone(uid, phone) //nolint:errcheck
		J(w, map[string]interface{}{"phone": phone})
		return
	}

	// 开发模式：直接绑定
	h.DB.BindPhone(uid, "13800138000") //nolint:errcheck
	J(w, map[string]interface{}{"phone": "13800138000"})
}

// SelectClass 选择职业
func (h *Handler) SelectClass(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	var req struct { Class string `json:"class"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { E(w, "参数错误", 400); return }
	if req.Class != "warrior" && req.Class != "archer" && req.Class != "mage" {
		E(w, "无效职业", 400); return
	}
	if err := h.DB.SelectClass(uid, req.Class); err != nil {
		E(w, "选择失败（可能已选过）", 400); return
	}
	// 根据职业发放初始装备
	h.giveStarterKit(uid, req.Class)
	J(w, map[string]interface{}{"ok": true, "class": req.Class})
}

// 发放初始装备
func (h *Handler) giveStarterKit(uid int64, class string) {
	// 通用：布衣 + 草鞋 + 小血瓶x10
	h.DB.ORM.Create(&model.Inventory{UserID: uid, ItemID: 11, Count: 1, SlotIndex: 0}) // 布衣
	h.DB.ORM.Create(&model.Inventory{UserID: uid, ItemID: 13, Count: 1, SlotIndex: 1}) // 草鞋
	h.DB.ORM.Create(&model.Inventory{UserID: uid, ItemID: 1, Count: 10, SlotIndex: 2})  // 小血瓶x10
	// 职业武器
	var weaponID int64
	switch class {
	case "warrior": weaponID = 6  // 木剑
	case "archer":  weaponID = 9  // 短弓
	case "mage":    weaponID = 10 // 法杖
	}
	h.DB.ORM.Create(&model.Inventory{UserID: uid, ItemID: weaponID, Count: 1, SlotIndex: 3})
}

// GetGameData 获取游戏初始化数据（地图/怪物/物品/技能）
func (h *Handler) GetGameData(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	user, err := h.DB.GetUser(uid)
	if err != nil { E(w, "用户不存在", 404); return }

	maps, _ := h.DB.GetMaps()
	monsters, _ := h.DB.GetMonstersByMap(user.MapID)
	skills, _ := h.DB.GetSkillsByClass(user.Class)
	shopItems, _ := h.DB.GetItemsByType("potion")

	// 背包
	var inventory []model.Inventory
	h.DB.ORM.Where("user_id = ?", uid).Find(&inventory)

	// 装备栏
	var equipment []model.Equipment
	h.DB.ORM.Where("user_id = ?", uid).Find(&equipment)

	// 物品模板（背包+装备引用的）
	itemIDs := map[int64]bool{}
	for _, inv := range inventory { itemIDs[inv.ItemID] = true }
	for _, eq := range equipment { itemIDs[eq.ItemID] = true }
	for _, si := range shopItems { itemIDs[si.ID] = true }
	var itemTemplates []model.ItemTemplate
	if len(itemIDs) > 0 {
		ids := make([]int64, 0, len(itemIDs))
		for id := range itemIDs { ids = append(ids, id) }
		h.DB.ORM.Where("id IN ?", ids).Find(&itemTemplates)
	}

	J(w, map[string]interface{}{
		"user":       user,
		"maps":       maps,
		"monsters":   monsters,
		"skills":     skills,
		"shop_items": shopItems,
		"inventory":  inventory,
		"equipment":  equipment,
		"items":      itemTemplates,
	})
}

func jsonReader(s string) io.Reader {
	return io.NopCloser(jsonReaderImpl(s))
}

type jsonReaderImpl string
func (j jsonReaderImpl) Read(p []byte) (int, error) {
	return copy(p, string(j)), io.EOF
}

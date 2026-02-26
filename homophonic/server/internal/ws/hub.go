package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"homophonic-server/internal/middleware"
	"homophonic-server/internal/model"
	"homophonic-server/internal/service"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(_ *http.Request) bool { return true },
}

// Msg WebSocket 消息
type Msg struct {
	Type string      `json:"type"`
	Data interface{} `json:"data,omitempty"`
}

// PlayerState 竞技玩家状态
type PlayerState struct {
	UserID   int64           `json:"user_id"`
	Nickname string          `json:"nickname"`
	Avatar   string          `json:"avatar"`
	HP       int             `json:"hp"`
	Current  int             `json:"current"`
	Done     bool            `json:"done"`
	conn     *websocket.Conn
}

// Room 竞技房间
type Room struct {
	mu        sync.Mutex
	RoomID    string
	Players   [2]*PlayerState
	PuzzleIDs []int64
	Puzzles   []*model.Puzzle
	Status    int
	db        *service.DB
}

// Hub 管理所有房间
type Hub struct {
	mu        sync.RWMutex
	rooms     map[string]*Room
	db        *service.DB
	jwtSecret string
}

// NewHub 创建 Hub
func NewHub(db *service.DB, jwtSecret string) *Hub {
	return &Hub{rooms: make(map[string]*Room), db: db, jwtSecret: jwtSecret}
}

// HandleWS WebSocket 入口
func (h *Hub) HandleWS(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("room_id")
	tokenStr := r.URL.Query().Get("token")
	if roomID == "" || tokenStr == "" {
		http.Error(w, "缺少参数", 400)
		return
	}
	uid, err := middleware.ParseToken(tokenStr, h.jwtSecret)
	if err != nil || uid == 0 {
		http.Error(w, "未登录", 401)
		return
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade: %v", err)
		return
	}
	user, err := h.db.GetUserByID(uid)
	if err != nil {
		conn.Close()
		return
	}
	h.handlePlayer(roomID, user, conn)
}

// 玩家加入房间并开始消息循环
func (h *Hub) handlePlayer(roomID string, user *model.User, conn *websocket.Conn) {
	h.mu.Lock()
	room, ok := h.rooms[roomID]
	if !ok {
		// 从数据库加载房间
		match, err := h.db.GetMatchByRoom(roomID)
		if err != nil {
			h.mu.Unlock()
			conn.WriteJSON(Msg{Type: "error", Data: "房间不存在"}) //nolint:errcheck
			conn.Close()
			return
		}
		ids := parsePuzzleIDs(match.PuzzleIDs)
		puzzles := make([]*model.Puzzle, 0, len(ids))
		for _, id := range ids {
			p, err := h.db.GetPuzzleByID(id)
			if err == nil {
				puzzles = append(puzzles, p)
			}
		}
		room = &Room{RoomID: roomID, PuzzleIDs: ids, Puzzles: puzzles, db: h.db}
		h.rooms[roomID] = room
	}
	h.mu.Unlock()

	room.mu.Lock()
	ps := &PlayerState{
		UserID: user.ID, Nickname: user.Nickname, Avatar: user.AvatarURL,
		HP: 5, Current: 0, conn: conn,
	}
	slot := -1
	if room.Players[0] == nil {
		room.Players[0] = ps
		slot = 0
	} else if room.Players[1] == nil && room.Players[0].UserID != user.ID {
		room.Players[1] = ps
		slot = 1
	} else {
		// 重连：替换已有连接
		for i := 0; i < 2; i++ {
			if room.Players[i] != nil && room.Players[i].UserID == user.ID {
				room.Players[i].conn = conn
				slot = i
				break
			}
		}
	}
	room.mu.Unlock()

	if slot == -1 {
		conn.WriteJSON(Msg{Type: "error", Data: "房间已满"}) //nolint:errcheck
		conn.Close()
		return
	}

	// 通知房间状态
	room.broadcastState()

	// 两人到齐则开始
	room.mu.Lock()
	if room.Players[0] != nil && room.Players[1] != nil && room.Status == 0 {
		room.Status = 1
		room.mu.Unlock()
		room.broadcastMsg(Msg{Type: "game_start"})
		room.sendPuzzle()
	} else {
		room.mu.Unlock()
	}

	// 消息循环
	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var msg Msg
		if json.Unmarshal(raw, &msg) != nil {
			continue
		}
		room.handleMsg(slot, msg)
	}
}

// 处理玩家消息
func (r *Room) handleMsg(slot int, msg Msg) {
	r.mu.Lock()
	defer r.mu.Unlock()

	p := r.Players[slot]
	if p == nil || r.Status != 1 {
		return
	}

	switch msg.Type {
	case "answer":
		ans, _ := msg.Data.(string)
		if p.Current < len(r.Puzzles) {
			correct := strings.EqualFold(strings.TrimSpace(ans), r.Puzzles[p.Current].Answer)
			if correct {
				p.Current++
				r.sendToSlot(slot, Msg{Type: "answer_result", Data: map[string]interface{}{"correct": true}})
			} else {
				p.HP--
				r.sendToSlot(slot, Msg{Type: "answer_result", Data: map[string]interface{}{"correct": false, "hp": p.HP}})
			}
		}
	case "skip":
		p.HP--
		p.Current++
	case "timeout":
		p.HP--
		p.Current++
	case "hint":
		if p.Current < len(r.Puzzles) {
			runes := []rune(r.Puzzles[p.Current].Answer)
			r.sendToSlot(slot, Msg{Type: "hint", Data: string(runes[0])})
		}
		return
	case "surrender":
		p.HP = 0
	default:
		return
	}

	r.broadcastStateUnlocked()

	// 检查游戏结束
	if r.checkGameOver() {
		return
	}

	// 发送下一题
	if p.Current < len(r.Puzzles) && p.HP > 0 {
		r.sendPuzzleToSlot(slot)
	}
}

// 检查游戏结束条件
func (r *Room) checkGameOver() bool {
	a, b := r.Players[0], r.Players[1]
	if a == nil || b == nil {
		return false
	}

	var winner *int64
	gameOver := false
	total := len(r.Puzzles)

	// 一方生命值为 0
	if a.HP <= 0 && b.Current > a.Current {
		winner = &b.UserID
		gameOver = true
	} else if b.HP <= 0 && a.Current > b.Current {
		winner = &a.UserID
		gameOver = true
	} else if a.HP <= 0 && b.HP <= 0 {
		gameOver = true
	}

	// 一方答完所有题
	if !gameOver && a.Current >= total && a.HP > b.HP {
		winner = &a.UserID
		gameOver = true
	}
	if !gameOver && b.Current >= total && b.HP > a.HP {
		winner = &b.UserID
		gameOver = true
	}
	if !gameOver && a.Current >= total && b.Current >= total {
		gameOver = true
		if a.HP > b.HP {
			winner = &a.UserID
		} else if b.HP > a.HP {
			winner = &b.UserID
		}
	}

	if gameOver {
		r.Status = 2
		r.db.FinishMatch(r.RoomID, winner) //nolint:errcheck
		result := "draw"
		if winner != nil {
			result = strconv.FormatInt(*winner, 10)
		}
		r.broadcastMsgUnlocked(Msg{Type: "game_over", Data: map[string]interface{}{
			"winner": result,
			"a":      map[string]interface{}{"hp": a.HP, "current": a.Current},
			"b":      map[string]interface{}{"hp": b.HP, "current": b.Current},
		}})
	}
	return gameOver
}

// 发送当前题目给所有玩家
func (r *Room) sendPuzzle() {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := 0; i < 2; i++ {
		r.sendPuzzleToSlot(i)
	}
}

func (r *Room) sendPuzzleToSlot(slot int) {
	p := r.Players[slot]
	if p == nil || p.Current >= len(r.Puzzles) {
		return
	}
	pz := r.Puzzles[p.Current]
	r.sendToSlot(slot, Msg{Type: "puzzle", Data: map[string]interface{}{
		"seq":          p.Current + 1,
		"total":        len(r.Puzzles),
		"hint_image":   pz.HintImage,
		"riddle_image": pz.RiddleImage,
		"answer_len":   pz.AnswerLen,
		"category":     pz.Category,
	}})
}

func (r *Room) sendToSlot(slot int, msg Msg) {
	if r.Players[slot] != nil && r.Players[slot].conn != nil {
		r.Players[slot].conn.WriteJSON(msg) //nolint:errcheck
	}
}

func (r *Room) broadcastState() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.broadcastStateUnlocked()
}

func (r *Room) broadcastStateUnlocked() {
	r.broadcastMsgUnlocked(Msg{Type: "state", Data: r.stateData()})
}

func (r *Room) broadcastMsg(msg Msg) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.broadcastMsgUnlocked(msg)
}

func (r *Room) broadcastMsgUnlocked(msg Msg) {
	for i := 0; i < 2; i++ {
		r.sendToSlot(i, msg)
	}
}

func (r *Room) stateData() interface{} {
	data := map[string]interface{}{"status": r.Status}
	for i, label := range []string{"a", "b"} {
		if r.Players[i] != nil {
			data[label] = map[string]interface{}{
				"user_id": r.Players[i].UserID, "nickname": r.Players[i].Nickname,
				"avatar": r.Players[i].Avatar, "hp": r.Players[i].HP, "current": r.Players[i].Current,
			}
		}
	}
	return data
}

func parsePuzzleIDs(s string) []int64 {
	parts := strings.Split(s, ",")
	ids := make([]int64, 0, len(parts))
	for _, p := range parts {
		id, err := strconv.ParseInt(strings.TrimSpace(p), 10, 64)
		if err == nil {
			ids = append(ids, id)
		}
	}
	return ids
}

// Cleanup 清理超时房间
func (h *Hub) Cleanup() {
	h.mu.Lock()
	defer h.mu.Unlock()
	for id, room := range h.rooms {
		room.mu.Lock()
		if room.Status == 2 || (room.Players[0] == nil && room.Players[1] == nil) {
			delete(h.rooms, id)
		}
		room.mu.Unlock()
	}
}

// StartCleanup 定期清理
func (h *Hub) StartCleanup() {
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			h.Cleanup()
		}
	}()
}

package ws

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"blame-game-server/internal/middleware"
	"blame-game-server/internal/model"
	"blame-game-server/internal/service"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{CheckOrigin: func(_ *http.Request) bool { return true }}

// Msg WebSocket 消息
type Msg struct {
	Type string      `json:"type"`
	Data interface{} `json:"data,omitempty"`
}

// Pot 锅
type Pot struct {
	ID        int     `json:"id"`
	OwnerIdx  int     `json:"owner_idx"`
	Countdown float64 `json:"countdown"`
	MaxTime   float64 `json:"max_time"`
	Passes    int     `json:"passes"`
}

// Player 玩家状态
type Player struct {
	UserID   int64           `json:"user_id"`
	Nickname string          `json:"nickname"`
	Avatar   string          `json:"avatar"`
	Alive    bool            `json:"alive"`
	Ready    bool            `json:"ready"`
	Correct  int             `json:"correct"`
	Blames   int             `json:"blames"`
	JoinedAt time.Time       `json:"-"`
	conn     *websocket.Conn
	mu       sync.Mutex
}

func (p *Player) send(msg Msg) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.conn != nil {
		p.conn.WriteJSON(msg) //nolint:errcheck
	}
}

// Room 房间
type Room struct {
	mu        sync.Mutex
	ID        string
	Players   []*Player
	Pots      []*Pot
	Questions []model.Question
	QIdx      int
	Status    int // 0=等待 1=游戏中 2=结束
	PotIDSeq  int
	db        *service.DB
	ticker    *time.Ticker
	done      chan struct{}
}

// Hub 管理所有房间
type Hub struct {
	mu        sync.RWMutex
	rooms     map[string]*Room
	db        *service.DB
	jwtSecret string
}

func NewHub(db *service.DB, secret string) *Hub {
	h := &Hub{rooms: make(map[string]*Room), db: db, jwtSecret: secret}
	go h.cleanup()
	return h
}

func (h *Hub) HandleWS(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("room_id")
	tokenStr := r.URL.Query().Get("token")
	if roomID == "" || tokenStr == "" {
		http.Error(w, "缺少参数", 400)
		return
	}
	uid, err := middleware.ParseToken(tokenStr, h.jwtSecret)
	if err != nil {
		http.Error(w, "未登录", 401)
		return
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	user, err := h.db.GetUser(uid)
	if err != nil {
		conn.Close()
		return
	}

	h.mu.Lock()
	room, ok := h.rooms[roomID]
	if !ok {
		room = &Room{ID: roomID, Status: 0, db: h.db, done: make(chan struct{})}
		h.rooms[roomID] = room
	}
	h.mu.Unlock()

	room.addPlayer(user, conn)
}

// 添加玩家
func (r *Room) addPlayer(user *model.User, conn *websocket.Conn) {
	r.mu.Lock()

	// 重连检测
	for _, p := range r.Players {
		if p.UserID == user.ID {
			p.conn = conn
			r.mu.Unlock()
			r.broadcastState()
			go r.readLoop(p)
			return
		}
	}

	if len(r.Players) >= 6 || r.Status != 0 {
		r.mu.Unlock()
		conn.WriteJSON(Msg{Type: "error", Data: "房间已满或已开始"}) //nolint:errcheck
		conn.Close()
		return
	}

	p := &Player{
		UserID: user.ID, Nickname: user.Nickname, Avatar: user.AvatarURL,
		Alive: true, JoinedAt: time.Now(), conn: conn,
	}
	r.Players = append(r.Players, p)
	r.mu.Unlock()

	log.Printf("[Room %s] 玩家 %s 加入 (%d人)", r.ID, p.Nickname, len(r.Players))
	r.broadcastState()
	go r.readLoop(p)
}

// 消息读取循环
func (r *Room) readLoop(p *Player) {
	defer func() {
		if r.Status == 0 {
			r.removePlayer(p)
		}
	}()
	for {
		_, raw, err := p.conn.ReadMessage()
		if err != nil {
			return
		}
		var msg Msg
		if json.Unmarshal(raw, &msg) != nil {
			continue
		}
		r.handleMsg(p, msg)
	}
}

func (r *Room) removePlayer(p *Player) {
	r.mu.Lock()
	for i, pp := range r.Players {
		if pp.UserID == p.UserID {
			r.Players = append(r.Players[:i], r.Players[i+1:]...)
			break
		}
	}
	r.mu.Unlock()
	r.broadcastState()
}

// 处理消息
func (r *Room) handleMsg(p *Player, msg Msg) {
	r.mu.Lock()
	defer r.mu.Unlock()

	switch msg.Type {
	case "ready":
		p.Ready = !p.Ready
		r.broadcastStateL()
		r.tryStart()

	case "answer":
		if r.Status != 1 || !p.Alive {
			return
		}
		ans, _ := msg.Data.(string)
		if r.QIdx >= len(r.Questions) {
			return
		}
		q := r.Questions[r.QIdx]
		correct := strings.EqualFold(strings.TrimSpace(ans), strings.TrimSpace(q.Answer))
		if correct {
			p.Correct++
		}
		p.send(Msg{Type: "answer_result", Data: map[string]interface{}{"correct": correct, "answer": q.Answer}})
		if correct {
			// 答对：进入甩锅选择（客户端发 blame）
			p.send(Msg{Type: "choose_target"})
		}

	case "blame":
		if r.Status != 1 || !p.Alive {
			return
		}
		data, _ := msg.Data.(map[string]interface{})
		targetID := int64(0)
		if v, ok := data["target"].(float64); ok {
			targetID = int64(v)
		}
		fromIdx := r.playerIdx(p.UserID)
		toIdx := r.playerIdx(targetID)
		if toIdx < 0 || !r.Players[toIdx].Alive || toIdx == fromIdx {
			return
		}
		// 把锅从 from 转给 to
		transferred := false
		for _, pot := range r.Pots {
			if pot.OwnerIdx == fromIdx {
				pot.OwnerIdx = toIdx
				pot.Passes++
				// 热锅：传递超过3次倒计时减半
				if pot.Passes >= 3 && pot.Countdown > pot.MaxTime*0.3 {
					pot.Countdown *= 0.6
				}
				transferred = true
				break
			}
		}
		if transferred {
			p.Blames++
			r.broadcastMsgL(Msg{Type: "blame_anim", Data: map[string]interface{}{
				"from": p.UserID, "to": targetID,
			}})
			r.QIdx++
			r.broadcastStateL()
			// 给被甩锅的人出题
			r.sendQuestionTo(toIdx)
		}
	}
}

// 尝试开始游戏
func (r *Room) tryStart() {
	if len(r.Players) < 3 {
		return
	}
	allReady := true
	for _, p := range r.Players {
		if !p.Ready {
			allReady = false
			break
		}
	}
	if !allReady {
		return
	}

	// 加载题目
	qs, err := r.db.RandomQuestions(30)
	if err != nil || len(qs) < 10 {
		r.broadcastMsgL(Msg{Type: "error", Data: "题目不足"})
		return
	}
	r.Questions = qs
	r.QIdx = 0
	r.Status = 1

	// 记录对战
	r.db.CreateMatch(r.ID, len(r.Players)) //nolint:errcheck
	for _, p := range r.Players {
		r.db.IncrGames(p.UserID)
	}

	r.broadcastMsgL(Msg{Type: "game_start"})
	r.broadcastStateL()

	// 第一口锅随机分配
	r.assignPot()

	// 启动倒计时 ticker
	r.ticker = time.NewTicker(100 * time.Millisecond)
	go r.tickLoop()
}

// 倒计时循环
func (r *Room) tickLoop() {
	defer r.ticker.Stop()
	for {
		select {
		case <-r.ticker.C:
			r.tick()
		case <-r.done:
			return
		}
	}
}

func (r *Room) tick() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.Status != 1 {
		return
	}

	dt := 0.1 // 100ms
	exploded := []int{}

	for i, pot := range r.Pots {
		pot.Countdown -= dt
		if pot.Countdown <= 0 {
			exploded = append(exploded, i)
		}
	}

	// 处理爆炸
	for _, idx := range exploded {
		pot := r.Pots[idx]
		owner := r.Players[pot.OwnerIdx]
		owner.Alive = false
		r.broadcastMsgL(Msg{Type: "pot_explode", Data: map[string]interface{}{
			"user_id": owner.UserID, "pot_id": pot.ID,
		}})
		// 计算排名
		alive := r.aliveCount()
		rank := alive + 1
		r.broadcastMsgL(Msg{Type: "player_out", Data: map[string]interface{}{
			"user_id": owner.UserID, "rank": rank,
		}})
	}

	// 移除已爆炸的锅
	if len(exploded) > 0 {
		newPots := make([]*Pot, 0)
		explodedSet := map[int]bool{}
		for _, i := range exploded {
			explodedSet[i] = true
		}
		for i, pot := range r.Pots {
			if !explodedSet[i] {
				newPots = append(newPots, pot)
			}
		}
		r.Pots = newPots
	}

	// 检查游戏结束
	alive := r.aliveCount()
	if alive <= 1 {
		r.endGame()
		return
	}

	// 广播倒计时状态
	if len(exploded) > 0 {
		r.broadcastStateL()
		// 如果没有锅了，分配新锅
		if len(r.Pots) == 0 {
			r.assignPot()
		}
	}
}

// 分配一口锅
func (r *Room) assignPot() {
	aliveIdxs := r.aliveIdxs()
	if len(aliveIdxs) == 0 {
		return
	}
	target := aliveIdxs[rand.Intn(len(aliveIdxs))]
	r.PotIDSeq++

	// 倒计时随着游戏推进缩短
	maxTime := 15.0 - float64(r.PotIDSeq-1)*0.5
	if maxTime < 8 {
		maxTime = 8
	}

	pot := &Pot{ID: r.PotIDSeq, OwnerIdx: target, Countdown: maxTime, MaxTime: maxTime}
	r.Pots = append(r.Pots, pot)

	r.broadcastMsgL(Msg{Type: "pot_assign", Data: map[string]interface{}{
		"user_id": r.Players[target].UserID, "countdown": maxTime, "pot_id": pot.ID,
	}})

	// 给目标出题
	r.sendQuestionTo(target)
	r.broadcastStateL()
}

// 给指定玩家出题
func (r *Room) sendQuestionTo(idx int) {
	if r.QIdx >= len(r.Questions) {
		r.QIdx = 0 // 题目循环
	}
	q := r.Questions[r.QIdx]
	data := map[string]interface{}{
		"id": q.ID, "type": q.Type, "content": q.Content,
	}
	if q.Options != "" {
		data["options"] = strings.Split(q.Options, ",")
	}
	if q.Image != "" {
		data["image"] = q.Image
	}
	r.Players[idx].send(Msg{Type: "question", Data: data})
}

// 结束游戏
func (r *Room) endGame() {
	r.Status = 2
	var winnerID *int64
	rankings := []map[string]interface{}{}

	// 找到最后存活的人
	for _, p := range r.Players {
		if p.Alive {
			winnerID = &p.UserID
			r.db.IncrWins(p.UserID)
			break
		}
	}

	for _, p := range r.Players {
		rank := 1
		if !p.Alive {
			rank = len(r.Players) // 简化排名
		}
		rankings = append(rankings, map[string]interface{}{
			"user_id": p.UserID, "nickname": p.Nickname, "avatar": p.Avatar,
			"rank": rank, "correct": p.Correct, "blames": p.Blames, "alive": p.Alive,
		})
		r.db.SaveMatchPlayer(&model.MatchPlayer{
			UserID: p.UserID, Rank: rank, CorrectCount: p.Correct, BlameCount: p.Blames,
		})
	}

	r.db.FinishMatch(r.ID, winnerID)
	r.broadcastMsgL(Msg{Type: "game_over", Data: map[string]interface{}{
		"winner_id": winnerID, "rankings": rankings,
	}})

	select {
	case r.done <- struct{}{}:
	default:
	}
}

// --- 工具方法 ---

func (r *Room) playerIdx(uid int64) int {
	for i, p := range r.Players {
		if p.UserID == uid {
			return i
		}
	}
	return -1
}

func (r *Room) aliveCount() int {
	n := 0
	for _, p := range r.Players {
		if p.Alive {
			n++
		}
	}
	return n
}

func (r *Room) aliveIdxs() []int {
	var idxs []int
	for i, p := range r.Players {
		if p.Alive {
			idxs = append(idxs, i)
		}
	}
	return idxs
}

func (r *Room) broadcastState() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.broadcastStateL()
}

func (r *Room) broadcastStateL() {
	players := make([]map[string]interface{}, len(r.Players))
	for i, p := range r.Players {
		players[i] = map[string]interface{}{
			"user_id": p.UserID, "nickname": p.Nickname, "avatar": p.Avatar,
			"alive": p.Alive, "ready": p.Ready, "correct": p.Correct, "blames": p.Blames,
		}
	}
	pots := make([]map[string]interface{}, len(r.Pots))
	for i, pot := range r.Pots {
		pots[i] = map[string]interface{}{
			"id": pot.ID, "owner_id": r.Players[pot.OwnerIdx].UserID,
			"countdown": pot.Countdown, "max_time": pot.MaxTime,
		}
	}
	r.broadcastMsgL(Msg{Type: "room_state", Data: map[string]interface{}{
		"room_id": r.ID, "status": r.Status, "players": players, "pots": pots,
	}})
}

func (r *Room) broadcastMsgL(msg Msg) {
	for _, p := range r.Players {
		p.send(msg)
	}
}

func (h *Hub) cleanup() {
	for {
		time.Sleep(5 * time.Minute)
		h.mu.Lock()
		for id, room := range h.rooms {
			room.mu.Lock()
			if room.Status == 2 || len(room.Players) == 0 {
				delete(h.rooms, id)
			}
			room.mu.Unlock()
		}
		h.mu.Unlock()
	}
}

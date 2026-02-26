package service

import (
	"database/sql"
	"fmt"
	"math/rand"
	"strings"

	"homophonic-server/internal/model"

	_ "github.com/go-sql-driver/mysql"
)

// DB 数据库服务
type DB struct {
	conn *sql.DB
}

// NewDB 连接数据库
func NewDB(dsn string) (*DB, error) {
	conn, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("数据库连接失败: %w", err)
	}
	conn.SetMaxOpenConns(20)
	conn.SetMaxIdleConns(5)
	return &DB{conn: conn}, nil
}

// --- 用户 ---

// GetOrCreateUser 通过 openid 获取或创建用户
func (d *DB) GetOrCreateUser(openID, nickname, avatar string) (*model.User, error) {
	var u model.User
	err := d.conn.QueryRow("SELECT id, open_id, nickname, avatar_url, level FROM users WHERE open_id=?", openID).
		Scan(&u.ID, &u.OpenID, &u.Nickname, &u.AvatarURL, &u.Level)
	if err == sql.ErrNoRows {
		res, err := d.conn.Exec("INSERT INTO users(open_id, nickname, avatar_url) VALUES(?,?,?)", openID, nickname, avatar)
		if err != nil {
			return nil, err
		}
		u.ID, _ = res.LastInsertId()
		u.OpenID = openID
		u.Nickname = nickname
		u.AvatarURL = avatar
		u.Level = 1
		return &u, nil
	}
	if err != nil {
		return nil, err
	}
	// 更新昵称头像
	if nickname != "" && (u.Nickname != nickname || u.AvatarURL != avatar) {
		d.conn.Exec("UPDATE users SET nickname=?, avatar_url=? WHERE id=?", nickname, avatar, u.ID) //nolint:errcheck
		u.Nickname = nickname
		u.AvatarURL = avatar
	}
	return &u, nil
}

// GetUserByID 根据 ID 获取用户
func (d *DB) GetUserByID(id int64) (*model.User, error) {
	var u model.User
	err := d.conn.QueryRow("SELECT id, open_id, nickname, avatar_url, level FROM users WHERE id=?", id).
		Scan(&u.ID, &u.OpenID, &u.Nickname, &u.AvatarURL, &u.Level)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// UpdateLevel 更新闯关进度
func (d *DB) UpdateLevel(userID int64, level int) error {
	_, err := d.conn.Exec("UPDATE users SET level=? WHERE id=? AND level<?", level, userID, level)
	return err
}

// --- 题目 ---

// GetPuzzle 获取指定关卡题目
func (d *DB) GetPuzzle(seq int) (*model.Puzzle, error) {
	var p model.Puzzle
	err := d.conn.QueryRow(
		"SELECT id, seq, hint_image, riddle_image, answer, answer_len, category, difficulty FROM puzzles WHERE seq=?", seq,
	).Scan(&p.ID, &p.Seq, &p.HintImage, &p.RiddleImage, &p.Answer, &p.AnswerLen, &p.Category, &p.Difficulty)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// GetPuzzleByID 根据 ID 获取题目
func (d *DB) GetPuzzleByID(id int64) (*model.Puzzle, error) {
	var p model.Puzzle
	err := d.conn.QueryRow(
		"SELECT id, seq, hint_image, riddle_image, answer, answer_len, category, difficulty FROM puzzles WHERE id=?", id,
	).Scan(&p.ID, &p.Seq, &p.HintImage, &p.RiddleImage, &p.Answer, &p.AnswerLen, &p.Category, &p.Difficulty)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// GetTotalPuzzles 获取总题目数
func (d *DB) GetTotalPuzzles() (int, error) {
	var count int
	err := d.conn.QueryRow("SELECT COUNT(*) FROM puzzles").Scan(&count)
	return count, err
}

// GetRandomPuzzleIDs 随机抽取 n 道题
func (d *DB) GetRandomPuzzleIDs(n int) ([]int64, error) {
	rows, err := d.conn.Query("SELECT id FROM puzzles ORDER BY RAND() LIMIT ?", n)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

// --- 对战 ---

// CreateMatch 创建对战房间
func (d *DB) CreateMatch(playerA int64, puzzleIDs []int64) (*model.Match, error) {
	roomID := generateRoomID()
	idStrs := make([]string, len(puzzleIDs))
	for i, id := range puzzleIDs {
		idStrs[i] = fmt.Sprintf("%d", id)
	}
	idsStr := strings.Join(idStrs, ",")
	res, err := d.conn.Exec("INSERT INTO matches(room_id, player_a, puzzle_ids, status) VALUES(?,?,?,0)", roomID, playerA, idsStr)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &model.Match{ID: id, RoomID: roomID, PlayerA: playerA, Status: model.MatchWaiting, PuzzleIDs: idsStr}, nil
}

// JoinMatch 加入对战房间
func (d *DB) JoinMatch(roomID string, playerB int64) (*model.Match, error) {
	res, err := d.conn.Exec("UPDATE matches SET player_b=?, status=1 WHERE room_id=? AND status=0 AND player_a!=?", playerB, roomID, playerB)
	if err != nil {
		return nil, err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return nil, fmt.Errorf("房间不存在或已开始")
	}
	return d.GetMatchByRoom(roomID)
}

// GetMatchByRoom 获取房间信息
func (d *DB) GetMatchByRoom(roomID string) (*model.Match, error) {
	var m model.Match
	err := d.conn.QueryRow(
		"SELECT id, room_id, player_a, player_b, winner, status, puzzle_ids FROM matches WHERE room_id=?", roomID,
	).Scan(&m.ID, &m.RoomID, &m.PlayerA, &m.PlayerB, &m.Winner, &m.Status, &m.PuzzleIDs)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// FinishMatch 结束对战
func (d *DB) FinishMatch(roomID string, winner *int64) error {
	_, err := d.conn.Exec("UPDATE matches SET status=2, winner=?, finished_at=NOW() WHERE room_id=?", winner, roomID)
	return err
}

func generateRoomID() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

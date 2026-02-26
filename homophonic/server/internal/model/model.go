package model

import "time"

// User 用户
type User struct {
	ID        int64     `json:"id"`
	OpenID    string    `json:"-"`
	Nickname  string    `json:"nickname"`
	AvatarURL string    `json:"avatar_url"`
	Level     int       `json:"level"`
	CreatedAt time.Time `json:"created_at"`
}

// Puzzle 题目
type Puzzle struct {
	ID          int64  `json:"id"`
	Seq         int    `json:"seq"`
	HintImage   string `json:"hint_image"`
	RiddleImage string `json:"riddle_image"`
	Answer      string `json:"-"`
	AnswerLen   int    `json:"answer_len"`
	Category    string `json:"category"`
	Difficulty  int    `json:"difficulty"`
}

// PuzzleWithHint 含提示的题目（给前端）
type PuzzleWithHint struct {
	Puzzle
	FirstChar string `json:"first_char,omitempty"`
	FullAnswer string `json:"full_answer,omitempty"`
}

// Match 竞技对战
type Match struct {
	ID         int64      `json:"id"`
	RoomID     string     `json:"room_id"`
	PlayerA    int64      `json:"player_a"`
	PlayerB    *int64     `json:"player_b"`
	Winner     *int64     `json:"winner"`
	Status     int        `json:"status"`
	PuzzleIDs  string     `json:"-"`
	CreatedAt  time.Time  `json:"created_at"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`
}

// MatchStatus 对战状态
const (
	MatchWaiting  = 0
	MatchPlaying  = 1
	MatchFinished = 2
)

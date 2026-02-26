package model

import "time"

// User 用户
type User struct {
	ID        int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	OpenID    string    `json:"-" gorm:"column:open_id;type:varchar(64);uniqueIndex;not null"`
	Nickname  string    `json:"nickname" gorm:"type:varchar(64);not null;default:''"`
	AvatarURL string    `json:"avatar_url" gorm:"type:varchar(512);not null;default:''"`
	Level     int       `json:"level" gorm:"not null;default:1"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"-" gorm:"autoUpdateTime"`
}

// Puzzle 题目
type Puzzle struct {
	ID          int64  `json:"id" gorm:"primaryKey;autoIncrement"`
	Seq         int    `json:"seq" gorm:"uniqueIndex;not null"`
	HintImage   string `json:"hint_image" gorm:"type:varchar(512);not null"`
	RiddleImage string `json:"riddle_image" gorm:"type:varchar(512);not null"`
	Answer      string `json:"-" gorm:"type:varchar(64);not null"`
	AnswerLen   int    `json:"answer_len" gorm:"not null"`
	Category    string `json:"category" gorm:"type:varchar(32);not null;default:''"`
	Difficulty  int    `json:"difficulty" gorm:"not null;default:1"`
	CreatedAt   time.Time `json:"-" gorm:"autoCreateTime"`
}

// PuzzleWithHint 含提示的题目（不入库）
type PuzzleWithHint struct {
	Puzzle
	FirstChar  string `json:"first_char,omitempty"`
	FullAnswer string `json:"full_answer,omitempty"`
}

// Match 竞技对战
type Match struct {
	ID         int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	RoomID     string     `json:"room_id" gorm:"type:varchar(32);uniqueIndex;not null"`
	PlayerA    int64      `json:"player_a" gorm:"not null"`
	PlayerB    *int64     `json:"player_b"`
	Winner     *int64     `json:"winner"`
	Status     int        `json:"status" gorm:"not null;default:0"`
	PuzzleIDs  string     `json:"-" gorm:"type:text;not null"`
	CreatedAt  time.Time  `json:"created_at" gorm:"autoCreateTime"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`
}

const (
	MatchWaiting  = 0
	MatchPlaying  = 1
	MatchFinished = 2
)

package model

import "time"

type User struct {
	ID        int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	OpenID    string    `json:"-" gorm:"column:open_id;type:varchar(64);uniqueIndex;not null"`
	Nickname  string    `json:"nickname" gorm:"type:varchar(64);not null;default:''"`
	AvatarURL string    `json:"avatar_url" gorm:"type:varchar(512);not null;default:''"`
	Wins      int       `json:"wins" gorm:"not null;default:0"`
	Games     int       `json:"games" gorm:"not null;default:0"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

type Question struct {
	ID         int64  `json:"id" gorm:"primaryKey;autoIncrement"`
	Type       string `json:"type" gorm:"type:varchar(20);not null"`
	Content    string `json:"content" gorm:"type:text;not null"`
	Image      string `json:"image,omitempty" gorm:"type:varchar(512)"`
	Answer     string `json:"answer" gorm:"type:varchar(128);not null"`
	Options    string `json:"options,omitempty" gorm:"type:text"`
	Difficulty int    `json:"difficulty" gorm:"not null;default:1"`
}

type Match struct {
	ID          int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	RoomID      string     `json:"room_id" gorm:"type:varchar(32);uniqueIndex;not null"`
	PlayerCount int        `json:"player_count" gorm:"not null;default:0"`
	WinnerID    *int64     `json:"winner_id"`
	Status      int        `json:"status" gorm:"not null;default:0"`
	CreatedAt   time.Time  `json:"created_at" gorm:"autoCreateTime"`
	FinishedAt  *time.Time `json:"finished_at,omitempty"`
}

type MatchPlayer struct {
	ID           int64 `json:"id" gorm:"primaryKey;autoIncrement"`
	MatchID      int64 `json:"match_id" gorm:"index;not null"`
	UserID       int64 `json:"user_id" gorm:"not null"`
	Rank         int   `json:"rank" gorm:"not null;default:0"`
	CorrectCount int   `json:"correct_count" gorm:"not null;default:0"`
	BlameCount   int   `json:"blame_count" gorm:"not null;default:0"`
	SurviveTime  int   `json:"survive_time" gorm:"not null;default:0"`
}

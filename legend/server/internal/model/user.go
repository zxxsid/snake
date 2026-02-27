package model

import "time"

// User 玩家角色
type User struct {
	ID        int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	OpenID    string    `json:"-" gorm:"column:open_id;type:varchar(64);uniqueIndex;not null"`
	UnionID   string    `json:"-" gorm:"type:varchar(64)"`
	Phone     string    `json:"-" gorm:"type:varchar(20)"` // 微信授权手机号
	Nickname  string    `json:"nickname" gorm:"type:varchar(64);not null;default:''"`
	AvatarURL string    `json:"avatar_url" gorm:"type:varchar(512);not null;default:''"`
	Class     string    `json:"class" gorm:"type:varchar(20);not null;default:''"` // warrior/archer/mage
	Level     int       `json:"level" gorm:"not null;default:1"`
	Exp       int64     `json:"exp" gorm:"not null;default:0"`
	Gold      int64     `json:"gold" gorm:"not null;default:500"`   // 金币
	Diamond   int       `json:"diamond" gorm:"not null;default:0"` // 钻石
	HP        int       `json:"hp" gorm:"not null;default:100"`
	MaxHP     int       `json:"max_hp" gorm:"not null;default:100"`
	MP        int       `json:"mp" gorm:"not null;default:50"`
	MaxMP     int       `json:"max_mp" gorm:"not null;default:50"`
	Attack    int       `json:"attack" gorm:"not null;default:10"`
	Defense   int       `json:"defense" gorm:"not null;default:5"`
	Speed     float64   `json:"speed" gorm:"not null;default:3.0"`
	CritRate  float64   `json:"crit_rate" gorm:"not null;default:0.05"`
	DodgeRate float64   `json:"dodge_rate" gorm:"not null;default:0.03"`
	MapID     int       `json:"map_id" gorm:"not null;default:1"`
	PosX      float64   `json:"pos_x" gorm:"not null;default:400"`
	PosY      float64   `json:"pos_y" gorm:"not null;default:300"`
	PKValue   int       `json:"pk_value" gorm:"not null;default:0"` // PK 值（红名）
	GuildID   *int64    `json:"guild_id"`
	VIPLevel  int       `json:"vip_level" gorm:"not null;default:0"`
	VIPExpire *time.Time `json:"vip_expire,omitempty"`
	Stamina   int       `json:"stamina" gorm:"not null;default:100"` // 体力
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	LastLogin time.Time `json:"last_login" gorm:"autoUpdateTime"`
}

// DailyStat 每日统计（广告/分享次数）
type DailyStat struct {
	ID     int64  `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID int64  `json:"user_id" gorm:"index;not null"`
	Date   string `json:"date" gorm:"type:varchar(10);not null"` // 2025-02-27
	Key    string `json:"key" gorm:"type:varchar(40);not null"`  // ad_diamond / share_friend 等
	Count  int    `json:"count" gorm:"not null;default:0"`
}

// DailySign 每日签到
type DailySign struct {
	ID        int64  `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID    int64  `json:"user_id" gorm:"index;not null"`
	SignDate  string `json:"sign_date" gorm:"type:varchar(10);not null"`
	AdDoubled bool   `json:"ad_doubled" gorm:"not null;default:false"`
}

// Invitation 邀请关系
type Invitation struct {
	ID        int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	InviterID int64     `json:"inviter_id" gorm:"index;not null"`
	InviteeID int64     `json:"invitee_id" gorm:"uniqueIndex;not null"`
	Rewarded  bool      `json:"rewarded" gorm:"not null;default:false"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// ShareLog 分享记录
type ShareLog struct {
	ID        int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID    int64     `json:"user_id" gorm:"index;not null"`
	ShareType string    `json:"share_type" gorm:"type:varchar(20);not null"`
	Rewarded  bool      `json:"rewarded" gorm:"not null;default:false"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

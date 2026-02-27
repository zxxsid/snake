package model

import "time"

// MapTemplate 地图模板
type MapTemplate struct {
	ID       int64  `json:"id" gorm:"primaryKey;autoIncrement"`
	Name     string `json:"name" gorm:"type:varchar(64);not null"`
	LevelMin int    `json:"level_min" gorm:"not null;default:1"`
	LevelMax int    `json:"level_max" gorm:"not null;default:10"`
	Width    int    `json:"width" gorm:"not null;default:800"`
	Height   int    `json:"height" gorm:"not null;default:600"`
	SafeX    int    `json:"safe_x" gorm:"not null;default:400"` // 安全区中心
	SafeY    int    `json:"safe_y" gorm:"not null;default:300"`
	SafeR    int    `json:"safe_r" gorm:"not null;default:100"` // 安全区半径
	BgColor  string `json:"bg_color" gorm:"type:varchar(20);default:'#7EC850'"` // 背景色
	Theme    string `json:"theme" gorm:"type:varchar(20);default:'grass'"`      // grass/forest/desert/cave/lava/snow/dark/sky
}

// MonsterTemplate 怪物模板
type MonsterTemplate struct {
	ID          int64   `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string  `json:"name" gorm:"type:varchar(64);not null"`
	Level       int     `json:"level" gorm:"not null;default:1"`
	HP          int     `json:"hp" gorm:"not null;default:50"`
	Attack      int     `json:"attack" gorm:"not null;default:5"`
	Defense     int     `json:"defense" gorm:"not null;default:2"`
	Speed       float64 `json:"speed" gorm:"not null;default:1.5"`
	ExpReward   int     `json:"exp_reward" gorm:"not null;default:10"`
	GoldReward  int     `json:"gold_reward" gorm:"not null;default:5"`
	RespawnTime int     `json:"respawn_time" gorm:"not null;default:30"` // 秒
	MapID       int     `json:"map_id" gorm:"index;not null"`
	IsBoss      bool    `json:"is_boss" gorm:"not null;default:false"`
	Icon        string  `json:"icon" gorm:"type:varchar(64)"`
	AggroRange  float64 `json:"aggro_range" gorm:"not null;default:100"` // 仇恨范围
}

// DropEntry 掉落表条目
type DropEntry struct {
	ID        int64   `json:"id" gorm:"primaryKey;autoIncrement"`
	MonsterID int64   `json:"monster_id" gorm:"index;not null"`
	ItemID    int64   `json:"item_id" gorm:"not null"`
	DropRate  float64 `json:"drop_rate" gorm:"not null;default:0.1"` // 0~1
	MinCount  int     `json:"min_count" gorm:"not null;default:1"`
	MaxCount  int     `json:"max_count" gorm:"not null;default:1"`
}

// SkillTemplate 技能模板
type SkillTemplate struct {
	ID          int64   `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string  `json:"name" gorm:"type:varchar(64);not null"`
	Class       string  `json:"class" gorm:"type:varchar(20);not null"` // warrior/archer/mage
	LevelReq    int     `json:"level_req" gorm:"not null;default:1"`
	Cooldown    float64 `json:"cooldown" gorm:"not null;default:0"`       // 秒
	DamageRatio float64 `json:"damage_ratio" gorm:"not null;default:1.0"` // 攻击力倍率
	Range       float64 `json:"range" gorm:"not null;default:50"`         // 施法距离
	AOERadius   float64 `json:"aoe_radius" gorm:"not null;default:0"`     // 0=单体
	EffectType  string  `json:"effect_type" gorm:"type:varchar(20)"`      // stun/slow/heal/buff
	EffectValue float64 `json:"effect_value" gorm:"not null;default:0"`
	ManaCost    int     `json:"mana_cost" gorm:"not null;default:0"`
	Icon        string  `json:"icon" gorm:"type:varchar(64)"`
	Description string  `json:"description" gorm:"type:varchar(256)"`
}

// UserSkill 玩家已学技能
type UserSkill struct {
	ID      int64 `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID  int64 `json:"user_id" gorm:"index;not null"`
	SkillID int64 `json:"skill_id" gorm:"not null"`
	Level   int   `json:"level" gorm:"not null;default:1"`
}

// Guild 公会
type Guild struct {
	ID          int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string    `json:"name" gorm:"type:varchar(32);uniqueIndex;not null"`
	LeaderID    int64     `json:"leader_id" gorm:"not null"`
	Level       int       `json:"level" gorm:"not null;default:1"`
	MemberCount int       `json:"member_count" gorm:"not null;default:1"`
	MaxMembers  int       `json:"max_members" gorm:"not null;default:30"`
	Notice      string    `json:"notice" gorm:"type:varchar(256)"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// GuildMember 公会成员
type GuildMember struct {
	ID       int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	GuildID  int64     `json:"guild_id" gorm:"index;not null"`
	UserID   int64     `json:"user_id" gorm:"uniqueIndex;not null"`
	Role     string    `json:"role" gorm:"type:varchar(10);not null;default:'member'"` // leader/officer/member
	JoinedAt time.Time `json:"joined_at" gorm:"autoCreateTime"`
}

// ArenaMatch 竞技场记录
type ArenaMatch struct {
	ID        int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	PlayerA   int64     `json:"player_a" gorm:"index;not null"`
	PlayerB   int64     `json:"player_b" gorm:"index;not null"`
	Winner    *int64    `json:"winner"`
	Season    int       `json:"season" gorm:"not null;default:1"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// ArenaRanking 竞技排名
type ArenaRanking struct {
	ID     int64 `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID int64 `json:"user_id" gorm:"uniqueIndex;not null"`
	Season int   `json:"season" gorm:"not null;default:1"`
	Score  int   `json:"score" gorm:"not null;default:1000"`
	Wins   int   `json:"wins" gorm:"not null;default:0"`
	Losses int   `json:"losses" gorm:"not null;default:0"`
}

// ChatMessage 聊天消息
type ChatMessage struct {
	ID        int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Channel   string    `json:"channel" gorm:"type:varchar(20);not null"` // world/guild/private
	SenderID  int64     `json:"sender_id" gorm:"index;not null"`
	Content   string    `json:"content" gorm:"type:varchar(256);not null"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// Order 充值订单
type Order struct {
	ID        int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID    int64      `json:"user_id" gorm:"index;not null"`
	ProductID string     `json:"product_id" gorm:"type:varchar(32);not null"`
	Amount    int        `json:"amount" gorm:"not null"` // 金额（分）
	Diamond   int        `json:"diamond" gorm:"not null"`
	Status    int        `json:"status" gorm:"not null;default:0"` // 0=待支付 1=已支付 2=已发货
	WxOrderID string     `json:"wx_order_id" gorm:"type:varchar(64)"`
	CreatedAt time.Time  `json:"created_at" gorm:"autoCreateTime"`
	PaidAt    *time.Time `json:"paid_at,omitempty"`
}

// Quest 任务模板
type Quest struct {
	ID            int64  `json:"id" gorm:"primaryKey;autoIncrement"`
	Name          string `json:"name" gorm:"type:varchar(64);not null"`
	Type          string `json:"type" gorm:"type:varchar(20);not null"` // kill/collect/talk
	TargetMonster int64  `json:"target_monster"`
	TargetCount   int    `json:"target_count" gorm:"not null;default:1"`
	RewardExp     int    `json:"reward_exp" gorm:"not null;default:0"`
	RewardGold    int    `json:"reward_gold" gorm:"not null;default:0"`
	RewardItem    *int64 `json:"reward_item"`
	LevelReq      int    `json:"level_req" gorm:"not null;default:1"`
	Description   string `json:"description" gorm:"type:varchar(256)"`
}

// UserQuest 玩家任务进度
type UserQuest struct {
	ID       int64 `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID   int64 `json:"user_id" gorm:"index;not null"`
	QuestID  int64 `json:"quest_id" gorm:"not null"`
	Progress int   `json:"progress" gorm:"not null;default:0"`
	Status   int   `json:"status" gorm:"not null;default:0"` // 0=进行中 1=已完成 2=已领奖
}

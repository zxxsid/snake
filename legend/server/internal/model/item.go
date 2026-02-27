package model

// ItemTemplate 物品/装备模板
type ItemTemplate struct {
	ID          int64   `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string  `json:"name" gorm:"type:varchar(64);not null"`
	Type        string  `json:"type" gorm:"type:varchar(20);not null"` // weapon/shield/helmet/armor/boots/ring/potion/material
	Slot        string  `json:"slot" gorm:"type:varchar(20)"`          // 装备部位
	Quality     string  `json:"quality" gorm:"type:varchar(10);not null;default:'white'"` // white/green/blue/purple/orange/red
	LevelReq    int     `json:"level_req" gorm:"not null;default:1"`
	ClassReq    string  `json:"class_req" gorm:"type:varchar(20)"` // 职业限制，空=通用
	BaseAttack  int     `json:"base_attack" gorm:"not null;default:0"`
	BaseDefense int     `json:"base_defense" gorm:"not null;default:0"`
	BaseHP      int     `json:"base_hp" gorm:"not null;default:0"`
	BaseMP      int     `json:"base_mp" gorm:"not null;default:0"`
	BaseSpeed   float64 `json:"base_speed" gorm:"not null;default:0"`
	BaseCrit    float64 `json:"base_crit" gorm:"not null;default:0"`
	BaseDodge   float64 `json:"base_dodge" gorm:"not null;default:0"`
	BuyPrice    int     `json:"buy_price" gorm:"not null;default:0"`  // NPC 购买价
	SellPrice   int     `json:"sell_price" gorm:"not null;default:0"` // NPC 出售价
	Stackable   bool    `json:"stackable" gorm:"not null;default:false"` // 可否叠加
	MaxStack    int     `json:"max_stack" gorm:"not null;default:1"`
	Icon        string  `json:"icon" gorm:"type:varchar(64)"`
	Description string  `json:"description" gorm:"type:varchar(256)"`
}

// Inventory 玩家背包
type Inventory struct {
	ID           int64 `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID       int64 `json:"user_id" gorm:"index;not null"`
	ItemID       int64 `json:"item_id" gorm:"not null"`
	EnhanceLevel int   `json:"enhance_level" gorm:"not null;default:0"`
	Count        int   `json:"count" gorm:"not null;default:1"`
	SlotIndex    int   `json:"slot_index" gorm:"not null;default:0"` // 背包格位
}

// Equipment 玩家装备栏
type Equipment struct {
	ID           int64  `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID       int64  `json:"user_id" gorm:"index;not null"`
	Slot         string `json:"slot" gorm:"type:varchar(20);not null"` // weapon/shield/helmet/armor/boots/ring
	ItemID       int64  `json:"item_id" gorm:"not null"`
	EnhanceLevel int    `json:"enhance_level" gorm:"not null;default:0"`
}

// Trade 摆摊交易
type Trade struct {
	ID           int64  `json:"id" gorm:"primaryKey;autoIncrement"`
	SellerID     int64  `json:"seller_id" gorm:"index;not null"`
	ItemID       int64  `json:"item_id" gorm:"not null"`
	EnhanceLevel int    `json:"enhance_level" gorm:"not null;default:0"`
	Price        int64  `json:"price" gorm:"not null"`
	Status       int    `json:"status" gorm:"not null;default:0"` // 0=在售 1=已售 2=已下架
	BuyerID      *int64 `json:"buyer_id"`
}

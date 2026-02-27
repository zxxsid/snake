package service

import (
	"fmt"
	"log"

	"legend-server/internal/model"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// DB 数据库服务
type DB struct{ ORM *gorm.DB }

// NewDB 连接数据库并自动建表
func NewDB(dsn string) (*DB, error) {
	orm, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("数据库连接失败: %w", err)
	}
	// 自动建表（20+ 张表）
	if err := orm.AutoMigrate(
		// 用户相关
		&model.User{}, &model.DailyStat{}, &model.DailySign{},
		&model.Invitation{}, &model.ShareLog{},
		// 物品相关
		&model.ItemTemplate{}, &model.Inventory{}, &model.Equipment{}, &model.Trade{},
		// 世界相关
		&model.MapTemplate{}, &model.MonsterTemplate{}, &model.DropEntry{},
		&model.SkillTemplate{}, &model.UserSkill{},
		// 社交
		&model.Guild{}, &model.GuildMember{},
		&model.ArenaMatch{}, &model.ArenaRanking{},
		&model.ChatMessage{},
		// 商业化
		&model.Order{},
		// 任务
		&model.Quest{}, &model.UserQuest{},
	); err != nil {
		return nil, fmt.Errorf("AutoMigrate 失败: %w", err)
	}
	log.Println("[DB] AutoMigrate 完成 (22 张表)")
	d := &DB{ORM: orm}
	d.seedMaps()
	d.seedMonsters()
	d.seedItems()
	d.seedSkills()
	d.seedQuests()
	return d, nil
}

// --- 种子数据 ---

func (d *DB) seedMaps() {
	var c int64
	d.ORM.Model(&model.MapTemplate{}).Count(&c)
	if c > 0 { return }
	maps := []model.MapTemplate{
		{Name: "新手村", LevelMin: 1, LevelMax: 10, Width: 1200, Height: 900, SafeX: 600, SafeY: 450, SafeR: 120, BgColor: "#7EC850", Theme: "grass"},
		{Name: "迷雾森林", LevelMin: 10, LevelMax: 20, Width: 1600, Height: 1200, SafeX: 200, SafeY: 200, SafeR: 80, BgColor: "#3E6B2F", Theme: "forest"},
	}
	d.ORM.Create(&maps)
	log.Printf("[DB] 插入 %d 张地图", len(maps))
}

func (d *DB) seedMonsters() {
	var c int64
	d.ORM.Model(&model.MonsterTemplate{}).Count(&c)
	if c > 0 { return }
	mons := []model.MonsterTemplate{
		{Name: "小史莱姆", Level: 1, HP: 30, Attack: 3, Defense: 1, Speed: 1, ExpReward: 5, GoldReward: 3, RespawnTime: 15, MapID: 1, Icon: "slime_green", AggroRange: 80},
		{Name: "蘑菇仔", Level: 3, HP: 50, Attack: 5, Defense: 2, Speed: 1.2, ExpReward: 10, GoldReward: 5, RespawnTime: 20, MapID: 1, Icon: "mushroom", AggroRange: 90},
		{Name: "野兔", Level: 5, HP: 80, Attack: 8, Defense: 3, Speed: 2, ExpReward: 15, GoldReward: 8, RespawnTime: 20, MapID: 1, Icon: "rabbit", AggroRange: 70},
		{Name: "史莱姆王", Level: 10, HP: 500, Attack: 25, Defense: 10, Speed: 1.5, ExpReward: 200, GoldReward: 100, RespawnTime: 120, MapID: 1, IsBoss: true, Icon: "slime_king", AggroRange: 150},
		{Name: "树精", Level: 12, HP: 150, Attack: 15, Defense: 8, Speed: 1, ExpReward: 25, GoldReward: 12, RespawnTime: 25, MapID: 2, Icon: "treant", AggroRange: 100},
		{Name: "毒蜂", Level: 15, HP: 100, Attack: 20, Defense: 5, Speed: 2.5, ExpReward: 30, GoldReward: 15, RespawnTime: 20, MapID: 2, Icon: "bee", AggroRange: 120},
	}
	d.ORM.Create(&mons)
	log.Printf("[DB] 插入 %d 种怪物", len(mons))
}

func (d *DB) seedItems() {
	var c int64
	d.ORM.Model(&model.ItemTemplate{}).Count(&c)
	if c > 0 { return }
	items := []model.ItemTemplate{
		// 药水
		{Name: "小血瓶", Type: "potion", Quality: "white", BuyPrice: 10, SellPrice: 3, Stackable: true, MaxStack: 99, BaseHP: 50, Icon: "pot_hp_s", Description: "恢复 50 HP"},
		{Name: "中血瓶", Type: "potion", Quality: "green", BuyPrice: 50, SellPrice: 15, Stackable: true, MaxStack: 99, BaseHP: 200, Icon: "pot_hp_m", Description: "恢复 200 HP"},
		{Name: "小蓝瓶", Type: "potion", Quality: "white", BuyPrice: 15, SellPrice: 5, Stackable: true, MaxStack: 99, BaseMP: 30, Icon: "pot_mp_s", Description: "恢复 30 MP"},
		// 材料
		{Name: "强化石", Type: "material", Quality: "green", BuyPrice: 100, SellPrice: 30, Stackable: true, MaxStack: 99, Icon: "enhance_stone", Description: "装备强化材料"},
		{Name: "保护符", Type: "material", Quality: "blue", BuyPrice: 500, SellPrice: 150, Stackable: true, MaxStack: 99, Icon: "protect_charm", Description: "强化失败不降级"},
		// 武器
		{Name: "木剑", Type: "weapon", Slot: "weapon", Quality: "white", LevelReq: 1, BaseAttack: 5, BuyPrice: 50, SellPrice: 15, Icon: "sword_wood"},
		{Name: "铁剑", Type: "weapon", Slot: "weapon", Quality: "green", LevelReq: 5, BaseAttack: 12, BuyPrice: 200, SellPrice: 60, Icon: "sword_iron"},
		{Name: "精钢剑", Type: "weapon", Slot: "weapon", Quality: "blue", LevelReq: 10, BaseAttack: 25, BuyPrice: 800, SellPrice: 240, Icon: "sword_steel"},
		{Name: "短弓", Type: "weapon", Slot: "weapon", Quality: "white", LevelReq: 1, ClassReq: "archer", BaseAttack: 4, BuyPrice: 50, SellPrice: 15, Icon: "bow_short"},
		{Name: "法杖", Type: "weapon", Slot: "weapon", Quality: "white", LevelReq: 1, ClassReq: "mage", BaseAttack: 3, BuyPrice: 50, SellPrice: 15, Icon: "staff_wood"},
		// 防具
		{Name: "布衣", Type: "armor", Slot: "armor", Quality: "white", LevelReq: 1, BaseDefense: 3, BaseHP: 20, BuyPrice: 40, SellPrice: 12, Icon: "armor_cloth"},
		{Name: "皮甲", Type: "armor", Slot: "armor", Quality: "green", LevelReq: 5, BaseDefense: 8, BaseHP: 50, BuyPrice: 180, SellPrice: 54, Icon: "armor_leather"},
		{Name: "草鞋", Type: "armor", Slot: "boots", Quality: "white", LevelReq: 1, BaseSpeed: 0.3, BaseDodge: 0.01, BuyPrice: 30, SellPrice: 9, Icon: "boots_straw"},
	}
	d.ORM.Create(&items)
	log.Printf("[DB] 插入 %d 种物品", len(items))
}

func (d *DB) seedSkills() {
	var c int64
	d.ORM.Model(&model.SkillTemplate{}).Count(&c)
	if c > 0 { return }
	skills := []model.SkillTemplate{
		// 战士
		{Name: "猛击", Class: "warrior", LevelReq: 1, Cooldown: 0, DamageRatio: 1.0, Range: 50, ManaCost: 0, Icon: "skill_slash", Description: "普通攻击"},
		{Name: "旋风斩", Class: "warrior", LevelReq: 5, Cooldown: 8, DamageRatio: 1.8, Range: 50, AOERadius: 80, ManaCost: 15, Icon: "skill_whirlwind", Description: "范围伤害"},
		{Name: "冲锋", Class: "warrior", LevelReq: 10, Cooldown: 12, DamageRatio: 2.0, Range: 150, ManaCost: 20, EffectType: "stun", EffectValue: 1, Icon: "skill_charge", Description: "突进+击晕1秒"},
		// 弓手
		{Name: "射击", Class: "archer", LevelReq: 1, Cooldown: 0, DamageRatio: 1.0, Range: 200, ManaCost: 0, Icon: "skill_shoot", Description: "远程普攻"},
		{Name: "多重箭", Class: "archer", LevelReq: 5, Cooldown: 6, DamageRatio: 0.8, Range: 200, AOERadius: 60, ManaCost: 12, Icon: "skill_multishot", Description: "扇形3箭"},
		{Name: "闪避翻滚", Class: "archer", LevelReq: 10, Cooldown: 10, DamageRatio: 0, Range: 0, ManaCost: 10, EffectType: "dodge", EffectValue: 1, Icon: "skill_dodge", Description: "无敌1秒+位移"},
		// 法师
		{Name: "火球", Class: "mage", LevelReq: 1, Cooldown: 0, DamageRatio: 1.2, Range: 180, ManaCost: 5, Icon: "skill_fireball", Description: "远程魔法攻击"},
		{Name: "冰冻术", Class: "mage", LevelReq: 5, Cooldown: 8, DamageRatio: 0.5, Range: 150, ManaCost: 15, EffectType: "slow", EffectValue: 0.5, Icon: "skill_freeze", Description: "减速50%，3秒"},
		{Name: "雷电链", Class: "mage", LevelReq: 10, Cooldown: 10, DamageRatio: 1.5, Range: 150, AOERadius: 100, ManaCost: 25, Icon: "skill_lightning", Description: "弹射3个目标"},
	}
	d.ORM.Create(&skills)
	log.Printf("[DB] 插入 %d 个技能", len(skills))
}

func (d *DB) seedQuests() {
	var c int64
	d.ORM.Model(&model.Quest{}).Count(&c)
	if c > 0 { return }
	quests := []model.Quest{
		{Name: "消灭史莱姆", Type: "kill", TargetMonster: 1, TargetCount: 5, RewardExp: 50, RewardGold: 30, LevelReq: 1, Description: "消灭 5 只小史莱姆"},
		{Name: "蘑菇清除", Type: "kill", TargetMonster: 2, TargetCount: 3, RewardExp: 80, RewardGold: 50, LevelReq: 3, Description: "消灭 3 只蘑菇仔"},
		{Name: "挑战史莱姆王", Type: "kill", TargetMonster: 4, TargetCount: 1, RewardExp: 500, RewardGold: 200, LevelReq: 8, Description: "击败史莱姆王"},
	}
	d.ORM.Create(&quests)
	log.Printf("[DB] 插入 %d 个任务", len(quests))
}

// --- 用户操作 ---

// GetOrCreateUser 微信登录获取或创建用户
func (d *DB) GetOrCreateUser(openID, nick, avatar string) (*model.User, error) {
	var u model.User
	err := d.ORM.Where("open_id = ?", openID).First(&u).Error
	if err == gorm.ErrRecordNotFound {
		u = model.User{OpenID: openID, Nickname: nick, AvatarURL: avatar}
		return &u, d.ORM.Create(&u).Error
	}
	if err != nil { return nil, err }
	if nick != "" && (u.Nickname != nick || u.AvatarURL != avatar) {
		d.ORM.Model(&u).Updates(map[string]interface{}{"nickname": nick, "avatar_url": avatar})
		u.Nickname = nick; u.AvatarURL = avatar
	}
	return &u, nil
}

// BindPhone 绑定手机号
func (d *DB) BindPhone(uid int64, phone string) error {
	return d.ORM.Model(&model.User{}).Where("id = ?", uid).Update("phone", phone).Error
}

// GetUser 查询用户
func (d *DB) GetUser(uid int64) (*model.User, error) {
	var u model.User
	return &u, d.ORM.First(&u, uid).Error
}

// SelectClass 选择职业（只能选一次）
func (d *DB) SelectClass(uid int64, class string) error {
	return d.ORM.Model(&model.User{}).Where("id = ? AND class = ''", uid).Update("class", class).Error
}

// GetMaps 获取所有地图
func (d *DB) GetMaps() ([]model.MapTemplate, error) {
	var maps []model.MapTemplate
	return maps, d.ORM.Order("level_min ASC").Find(&maps).Error
}

// GetMonstersByMap 获取地图怪物
func (d *DB) GetMonstersByMap(mapID int) ([]model.MonsterTemplate, error) {
	var mons []model.MonsterTemplate
	return mons, d.ORM.Where("map_id = ?", mapID).Find(&mons).Error
}

// GetSkillsByClass 获取职业技能
func (d *DB) GetSkillsByClass(class string) ([]model.SkillTemplate, error) {
	var skills []model.SkillTemplate
	return skills, d.ORM.Where("class = ?", class).Order("level_req ASC").Find(&skills).Error
}

// GetItemsByType 获取商店物品
func (d *DB) GetItemsByType(t string) ([]model.ItemTemplate, error) {
	var items []model.ItemTemplate
	return items, d.ORM.Where("type = ? AND buy_price > 0", t).Find(&items).Error
}

// GetDropsByMonster 获取怪物掉落
func (d *DB) GetDropsByMonster(monsterID int64) ([]model.DropEntry, error) {
	var drops []model.DropEntry
	return drops, d.ORM.Where("monster_id = ?", monsterID).Find(&drops).Error
}

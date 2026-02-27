package service

import (
	"fmt"
	"log"
	"math/rand"

	"blame-game-server/internal/model"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type DB struct{ orm *gorm.DB }

func NewDB(dsn string) (*DB, error) {
	orm, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("数据库连接失败: %w", err)
	}
	if err := orm.AutoMigrate(&model.User{}, &model.Question{}, &model.Match{}, &model.MatchPlayer{}); err != nil {
		return nil, fmt.Errorf("AutoMigrate 失败: %w", err)
	}
	log.Println("[DB] AutoMigrate 完成")
	d := &DB{orm: orm}
	d.seed()
	return d, nil
}

func (d *DB) seed() {
	var c int64
	d.orm.Model(&model.Question{}).Count(&c)
	if c > 0 {
		return
	}
	seeds := []model.Question{
		{Type: "riddle", Content: "什么东西越洗越脏？", Answer: "水", Difficulty: 1},
		{Type: "riddle", Content: "什么路最窄？", Answer: "冤家路窄", Difficulty: 1},
		{Type: "riddle", Content: "什么蛋不能吃？", Answer: "笨蛋", Difficulty: 1},
		{Type: "riddle", Content: "两只蚂蚁走在路上，突然看到一只很大的梨，打一水果", Answer: "菠萝", Options: "苹果,菠萝,西瓜,芒果", Difficulty: 1},
		{Type: "common", Content: "太阳从西边升起？", Answer: "错", Options: "对,错", Difficulty: 1},
		{Type: "common", Content: "地球是太阳系中最大的行星？", Answer: "错", Options: "对,错", Difficulty: 1},
		{Type: "common", Content: "长城是世界七大奇迹之一？", Answer: "对", Options: "对,错", Difficulty: 1},
		{Type: "homophone", Content: "猪八戒照镜子", Answer: "里外不是人", Difficulty: 2},
		{Type: "homophone", Content: "姜太公钓鱼", Answer: "愿者上钩", Difficulty: 2},
		{Type: "homophone", Content: "竹篮打水", Answer: "一场空", Difficulty: 2},
		{Type: "riddle", Content: "什么东西天气越热它爬得越高？", Answer: "温度计", Difficulty: 2},
		{Type: "riddle", Content: "什么人一年中只工作一天？", Answer: "圣诞老人", Difficulty: 1},
		{Type: "common", Content: "鲸鱼是鱼类？", Answer: "错", Options: "对,错", Difficulty: 1},
		{Type: "homophone", Content: "外甥打灯笼", Answer: "照旧", Difficulty: 2},
		{Type: "riddle", Content: "有一个字，人人见了都会念错，这个字是什么？", Answer: "错", Difficulty: 2},
		{Type: "common", Content: "熊猫是熊科动物？", Answer: "对", Options: "对,错", Difficulty: 1},
		{Type: "riddle", Content: "什么东西嘴里没有舌头？", Answer: "茶壶", Difficulty: 2},
		{Type: "homophone", Content: "秀才遇到兵", Answer: "有理说不清", Difficulty: 2},
		{Type: "riddle", Content: "世界上什么人一下子变老？", Answer: "新娘", Difficulty: 2},
		{Type: "common", Content: "光年是时间单位？", Answer: "错", Options: "对,错", Difficulty: 1},
	}
	d.orm.Create(&seeds)
	log.Printf("[DB] 插入 %d 条种子题目", len(seeds))
}

// --- 用户 ---

func (d *DB) GetOrCreateUser(openID, nick, avatar string) (*model.User, error) {
	var u model.User
	err := d.orm.Where("open_id = ?", openID).First(&u).Error
	if err == gorm.ErrRecordNotFound {
		u = model.User{OpenID: openID, Nickname: nick, AvatarURL: avatar}
		return &u, d.orm.Create(&u).Error
	}
	if err != nil {
		return nil, err
	}
	if nick != "" && (u.Nickname != nick || u.AvatarURL != avatar) {
		d.orm.Model(&u).Updates(map[string]interface{}{"nickname": nick, "avatar_url": avatar})
		u.Nickname = nick
		u.AvatarURL = avatar
	}
	return &u, nil
}

func (d *DB) GetUser(id int64) (*model.User, error) {
	var u model.User
	return &u, d.orm.First(&u, id).Error
}

func (d *DB) IncrWins(uid int64) { d.orm.Model(&model.User{}).Where("id=?", uid).Update("wins", gorm.Expr("wins+1")) }
func (d *DB) IncrGames(uid int64) { d.orm.Model(&model.User{}).Where("id=?", uid).Update("games", gorm.Expr("games+1")) }

// --- 题目 ---

func (d *DB) RandomQuestions(n int) ([]model.Question, error) {
	var qs []model.Question
	return qs, d.orm.Order("RAND()").Limit(n).Find(&qs).Error
}

// --- 对战记录 ---

func (d *DB) CreateMatch(roomID string, count int) (*model.Match, error) {
	m := model.Match{RoomID: roomID, PlayerCount: count}
	return &m, d.orm.Create(&m).Error
}

func (d *DB) FinishMatch(roomID string, winnerID *int64) {
	d.orm.Model(&model.Match{}).Where("room_id=?", roomID).Updates(map[string]interface{}{
		"status": 2, "winner_id": winnerID, "finished_at": gorm.Expr("NOW()"),
	})
}

func (d *DB) SaveMatchPlayer(mp *model.MatchPlayer) {
	d.orm.Create(mp)
}

func GenerateRoomID() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

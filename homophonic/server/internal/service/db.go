package service

import (
	"errors"
	"fmt"
	"log"
	"math/rand"
	"strings"

	"homophonic-server/internal/model"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// DB 数据库服务
type DB struct {
	orm *gorm.DB
}

// NewDB 连接数据库并自动建表
func NewDB(dsn string) (*DB, error) {
	orm, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("数据库连接失败: %w", err)
	}

	// AutoMigrate 自动建表/更新表结构
	if err := orm.AutoMigrate(&model.User{}, &model.Puzzle{}, &model.Match{}); err != nil {
		return nil, fmt.Errorf("自动建表失败: %w", err)
	}
	log.Println("[DB] AutoMigrate 完成")

	d := &DB{orm: orm}
	d.seedPuzzles()
	return d, nil
}

// 种子题目（表为空时自动插入）
func (d *DB) seedPuzzles() {
	var count int64
	d.orm.Model(&model.Puzzle{}).Count(&count)
	if count > 0 {
		return
	}
	seeds := []model.Puzzle{
		{Seq: 1, HintImage: "/images/hint_01.png", RiddleImage: "/images/riddle_01.png", Answer: "杯具", AnswerLen: 2, Category: "物品", Difficulty: 1},
		{Seq: 2, HintImage: "/images/hint_02.png", RiddleImage: "/images/riddle_02.png", Answer: "鸭梨", AnswerLen: 2, Category: "水果", Difficulty: 1},
		{Seq: 3, HintImage: "/images/hint_03.png", RiddleImage: "/images/riddle_03.png", Answer: "蕉绿", AnswerLen: 2, Category: "植物", Difficulty: 1},
		{Seq: 4, HintImage: "/images/hint_04.png", RiddleImage: "/images/riddle_04.png", Answer: "蓝瘦", AnswerLen: 2, Category: "情感", Difficulty: 1},
		{Seq: 5, HintImage: "/images/hint_05.png", RiddleImage: "/images/riddle_05.png", Answer: "香菇", AnswerLen: 2, Category: "食物", Difficulty: 1},
		{Seq: 6, HintImage: "/images/hint_06.png", RiddleImage: "/images/riddle_06.png", Answer: "虾仁", AnswerLen: 2, Category: "食物", Difficulty: 2},
		{Seq: 7, HintImage: "/images/hint_07.png", RiddleImage: "/images/riddle_07.png", Answer: "冻豆腐", AnswerLen: 3, Category: "食物", Difficulty: 2},
		{Seq: 8, HintImage: "/images/hint_08.png", RiddleImage: "/images/riddle_08.png", Answer: "布鸽", AnswerLen: 2, Category: "动物", Difficulty: 2},
		{Seq: 9, HintImage: "/images/hint_09.png", RiddleImage: "/images/riddle_09.png", Answer: "鸡冻", AnswerLen: 2, Category: "动物", Difficulty: 2},
		{Seq: 10, HintImage: "/images/hint_10.png", RiddleImage: "/images/riddle_10.png", Answer: "耗子", AnswerLen: 2, Category: "动物", Difficulty: 3},
	}
	if err := d.orm.Create(&seeds).Error; err != nil {
		log.Printf("[DB] 种子数据插入失败: %v", err)
	} else {
		log.Printf("[DB] 插入 %d 条种子题目", len(seeds))
	}
}

// --- 用户 ---

func (d *DB) GetOrCreateUser(openID, nickname, avatar string) (*model.User, error) {
	var u model.User
	err := d.orm.Where("open_id = ?", openID).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		u = model.User{OpenID: openID, Nickname: nickname, AvatarURL: avatar, Level: 1}
		if err := d.orm.Create(&u).Error; err != nil {
			return nil, err
		}
		return &u, nil
	}
	if err != nil {
		return nil, err
	}
	if nickname != "" && (u.Nickname != nickname || u.AvatarURL != avatar) {
		d.orm.Model(&u).Updates(map[string]interface{}{"nickname": nickname, "avatar_url": avatar})
		u.Nickname = nickname
		u.AvatarURL = avatar
	}
	return &u, nil
}

func (d *DB) GetUserByID(id int64) (*model.User, error) {
	var u model.User
	if err := d.orm.First(&u, id).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (d *DB) UpdateLevel(userID int64, level int) error {
	return d.orm.Model(&model.User{}).Where("id = ? AND level < ?", userID, level).Update("level", level).Error
}

// --- 题目 ---

func (d *DB) GetPuzzle(seq int) (*model.Puzzle, error) {
	var p model.Puzzle
	if err := d.orm.Where("seq = ?", seq).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (d *DB) GetPuzzleByID(id int64) (*model.Puzzle, error) {
	var p model.Puzzle
	if err := d.orm.First(&p, id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (d *DB) GetTotalPuzzles() (int, error) {
	var count int64
	err := d.orm.Model(&model.Puzzle{}).Count(&count).Error
	return int(count), err
}

func (d *DB) GetRandomPuzzleIDs(n int) ([]int64, error) {
	var ids []int64
	err := d.orm.Model(&model.Puzzle{}).Order("RAND()").Limit(n).Pluck("id", &ids).Error
	return ids, err
}

// --- 对战 ---

func (d *DB) CreateMatch(playerA int64, puzzleIDs []int64) (*model.Match, error) {
	roomID := generateRoomID()
	strs := make([]string, len(puzzleIDs))
	for i, id := range puzzleIDs {
		strs[i] = fmt.Sprintf("%d", id)
	}
	m := model.Match{RoomID: roomID, PlayerA: playerA, PuzzleIDs: strings.Join(strs, ","), Status: model.MatchWaiting}
	if err := d.orm.Create(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (d *DB) JoinMatch(roomID string, playerB int64) (*model.Match, error) {
	res := d.orm.Model(&model.Match{}).Where("room_id = ? AND status = 0 AND player_a != ?", roomID, playerB).
		Updates(map[string]interface{}{"player_b": playerB, "status": 1})
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, fmt.Errorf("房间不存在或已开始")
	}
	return d.GetMatchByRoom(roomID)
}

func (d *DB) GetMatchByRoom(roomID string) (*model.Match, error) {
	var m model.Match
	if err := d.orm.Where("room_id = ?", roomID).First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (d *DB) FinishMatch(roomID string, winner *int64) error {
	return d.orm.Model(&model.Match{}).Where("room_id = ?", roomID).
		Updates(map[string]interface{}{"status": 2, "winner": winner, "finished_at": gorm.Expr("NOW()")}).Error
}

func generateRoomID() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

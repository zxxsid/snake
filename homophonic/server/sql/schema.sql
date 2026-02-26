-- 谐音梗大作战 数据库表结构

CREATE DATABASE IF NOT EXISTS homophonic DEFAULT CHARACTER SET utf8mb4;
USE homophonic;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    open_id     VARCHAR(64)  NOT NULL UNIQUE COMMENT '微信 openid',
    nickname    VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '昵称',
    avatar_url  VARCHAR(512) NOT NULL DEFAULT '' COMMENT '头像 URL',
    level       INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '当前闯关进度',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 题目表
CREATE TABLE IF NOT EXISTS puzzles (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seq         INT UNSIGNED NOT NULL COMMENT '关卡序号（闯关模式排序）',
    hint_image  VARCHAR(512) NOT NULL COMMENT '提示图片路径',
    riddle_image VARCHAR(512) NOT NULL COMMENT '谜面图片路径',
    answer      VARCHAR(64)  NOT NULL COMMENT '答案',
    answer_len  TINYINT UNSIGNED NOT NULL COMMENT '答案字数',
    category    VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '分类（动物/人物/歌曲等）',
    difficulty  TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '难度 1-5',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE UNIQUE INDEX idx_puzzles_seq ON puzzles(seq);

-- 竞技对战记录
CREATE TABLE IF NOT EXISTS matches (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    room_id     VARCHAR(32)  NOT NULL UNIQUE COMMENT '房间 ID',
    player_a    BIGINT UNSIGNED NOT NULL COMMENT '创建者 user_id',
    player_b    BIGINT UNSIGNED DEFAULT NULL COMMENT '加入者 user_id',
    winner      BIGINT UNSIGNED DEFAULT NULL COMMENT '获胜者 user_id，NULL=进行中/平局',
    status      TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=等待 1=进行中 2=已结束',
    puzzle_ids  TEXT         NOT NULL COMMENT '题目 ID 列表(逗号分隔)',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME     DEFAULT NULL
) ENGINE=InnoDB;

-- 种子题目数据
INSERT INTO puzzles (seq, hint_image, riddle_image, answer, answer_len, category, difficulty) VALUES
(1,  '/images/hint_01.png', '/images/riddle_01.png', '杯具',    2, '物品', 1),
(2,  '/images/hint_02.png', '/images/riddle_02.png', '鸭梨',    2, '水果', 1),
(3,  '/images/hint_03.png', '/images/riddle_03.png', '蕉绿',    2, '植物', 1),
(4,  '/images/hint_04.png', '/images/riddle_04.png', '蓝瘦',    2, '情感', 1),
(5,  '/images/hint_05.png', '/images/riddle_05.png', '香菇',    2, '食物', 1),
(6,  '/images/hint_06.png', '/images/riddle_06.png', '虾仁',    2, '食物', 2),
(7,  '/images/hint_07.png', '/images/riddle_07.png', '冻豆腐',  3, '食物', 2),
(8,  '/images/hint_08.png', '/images/riddle_08.png', '布鸽',    2, '动物', 2),
(9,  '/images/hint_09.png', '/images/riddle_09.png', '鸡冻',    2, '动物', 2),
(10, '/images/hint_10.png', '/images/riddle_10.png', '耗子',    2, '动物', 3);

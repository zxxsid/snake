package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"homophonic-server/internal/model"
	"homophonic-server/internal/storage"
)

// SetStorage 注入存储服务
func (h *Handler) SetStorage(s *storage.S3Store) {
	h.store = s
}

// --- 图片上传 ---

func (h *Handler) UploadImage(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		jsonErr(w, "文件过大", 400)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		jsonErr(w, "缺少文件", 400)
		return
	}
	defer file.Close()

	ct := header.Header.Get("Content-Type")
	ext := storage.ExtFromContentType(ct)
	if ext == "" {
		ext = ".png"
	}

	url, err := h.store.Upload(r.Context(), file, ct, ext)
	if err != nil {
		log.Printf("[Upload] 上传失败: %v", err)
		jsonErr(w, "上传失败: "+err.Error(), 500)
		return
	}
	log.Printf("[Upload] 成功: %s", url)
	jsonResp(w, map[string]interface{}{"url": url})
}

// --- 题目 CRUD ---

// ListPuzzles 分页查询题目列表
func (h *Handler) ListPuzzles(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	size, _ := strconv.Atoi(r.URL.Query().Get("size"))
	if page < 1 { page = 1 }
	if size < 1 || size > 100 { size = 20 }

	puzzles, total, err := h.db.ListPuzzles(page, size)
	if err != nil {
		log.Printf("[ListPuzzles] err=%v", err)
		jsonErr(w, "查询失败", 500)
		return
	}
	jsonResp(w, map[string]interface{}{
		"list":  puzzles,
		"total": total,
		"page":  page,
		"size":  size,
	})
}

// CreatePuzzle 新增题目
func (h *Handler) CreatePuzzle(w http.ResponseWriter, r *http.Request) {
	var p model.Puzzle
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		jsonErr(w, "参数错误", 400)
		return
	}
	if p.Answer == "" || p.RiddleImage == "" {
		jsonErr(w, "答案和图片不能为空", 400)
		return
	}
	p.AnswerLen = len([]rune(p.Answer))
	if err := h.db.CreatePuzzle(&p); err != nil {
		log.Printf("[CreatePuzzle] err=%v", err)
		jsonErr(w, "创建失败: "+err.Error(), 500)
		return
	}
	jsonResp(w, p)
}

// UpdatePuzzle 更新题目
func (h *Handler) UpdatePuzzle(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, _ := strconv.ParseInt(idStr, 10, 64)
	if id == 0 {
		jsonErr(w, "缺少 id", 400)
		return
	}
	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		jsonErr(w, "参数错误", 400)
		return
	}
	// 如果更新了答案，自动计算字数
	if ans, ok := updates["answer"].(string); ok && ans != "" {
		updates["answer_len"] = len([]rune(ans))
	}
	if err := h.db.UpdatePuzzle(id, updates); err != nil {
		log.Printf("[UpdatePuzzle] id=%d err=%v", id, err)
		jsonErr(w, "更新失败", 500)
		return
	}
	jsonResp(w, map[string]interface{}{"ok": true})
}

// DeletePuzzle 删除题目
func (h *Handler) DeletePuzzle(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, _ := strconv.ParseInt(idStr, 10, 64)
	if id == 0 {
		jsonErr(w, "缺少 id", 400)
		return
	}
	if err := h.db.DeletePuzzle(id); err != nil {
		log.Printf("[DeletePuzzle] id=%d err=%v", id, err)
		jsonErr(w, "删除失败", 500)
		return
	}
	jsonResp(w, map[string]interface{}{"ok": true})
}

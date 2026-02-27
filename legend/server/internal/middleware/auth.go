package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type ctxKey string
const uidKey ctxKey = "uid"

// GenerateToken 生成 JWT
func GenerateToken(uid int64, secret string) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"uid": uid, "exp": time.Now().Add(168 * time.Hour).Unix(),
	}).SignedString([]byte(secret))
}

// ParseToken 解析 JWT 返回 uid
func ParseToken(s, secret string) (int64, error) {
	t, err := jwt.Parse(s, func(_ *jwt.Token) (interface{}, error) { return []byte(secret), nil })
	if err != nil || !t.Valid { return 0, fmt.Errorf("无效 token") }
	return int64(t.Claims.(jwt.MapClaims)["uid"].(float64)), nil
}

// Auth JWT 鉴权中间件
func Auth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			s := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
			if s == "" { s = r.URL.Query().Get("token") }
			if s == "" { http.Error(w, `{"error":"未登录"}`, 401); return }
			uid, err := ParseToken(s, secret)
			if err != nil { http.Error(w, `{"error":"登录过期"}`, 401); return }
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), uidKey, uid)))
		})
	}
}

// UserID 从 context 获取 uid
func UserID(ctx context.Context) int64 {
	if v, ok := ctx.Value(uidKey).(int64); ok { return v }
	return 0
}

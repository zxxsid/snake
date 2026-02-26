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

const userIDKey ctxKey = "user_id"

// GenerateToken 生成 JWT
func GenerateToken(userID int64, secret string) (string, error) {
	claims := jwt.MapClaims{
		"uid": userID,
		"exp": time.Now().Add(72 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// Auth JWT 鉴权中间件
func Auth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if auth == "" {
				auth = r.URL.Query().Get("token")
			}
			tokenStr := strings.TrimPrefix(auth, "Bearer ")
			if tokenStr == "" {
				http.Error(w, `{"error":"未登录"}`, http.StatusUnauthorized)
				return
			}
			token, err := jwt.Parse(tokenStr, func(_ *jwt.Token) (interface{}, error) {
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				http.Error(w, `{"error":"登录已过期"}`, http.StatusUnauthorized)
				return
			}
			claims := token.Claims.(jwt.MapClaims)
			uid := int64(claims["uid"].(float64))
			ctx := context.WithValue(r.Context(), userIDKey, uid)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserID 从 context 中获取当前用户 ID
func UserID(ctx context.Context) int64 {
	if v, ok := ctx.Value(userIDKey).(int64); ok {
		return v
	}
	return 0
}

// ParseToken 解析 JWT 返回 userID
func ParseToken(tokenStr, secret string) (int64, error) {
	token, err := jwt.Parse(tokenStr, func(_ *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return 0, fmt.Errorf("invalid token")
	}
	claims := token.Claims.(jwt.MapClaims)
	return int64(claims["uid"].(float64)), nil
}

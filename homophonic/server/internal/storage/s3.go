package storage

import (
	"context"
	"fmt"
	"io"
	"log"
	"path/filepath"
	"time"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

// S3Config S3 存储配置
type S3Config struct {
	Endpoint        string // minio: http://localhost:9000  aws: 留空
	Region          string
	Bucket          string
	AccessKeyID     string
	SecretAccessKey  string
	UsePathStyle    bool   // minio 需要 true，aws 用 false
	PublicURLPrefix string // 图片访问前缀，如 http://localhost:9000/homophonic
}

// S3Store S3 兼容存储
type S3Store struct {
	client *s3.Client
	cfg    S3Config
}

// NewS3Store 创建 S3 存储（兼容 minio/aws）
func NewS3Store(cfg S3Config) (*S3Store, error) {
	opts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(cfg.Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, "")),
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(), opts...)
	if err != nil {
		return nil, fmt.Errorf("加载 aws config 失败: %w", err)
	}

	clientOpts := []func(*s3.Options){}
	if cfg.Endpoint != "" {
		clientOpts = append(clientOpts, func(o *s3.Options) {
			o.BaseEndpoint = &cfg.Endpoint
			o.UsePathStyle = cfg.UsePathStyle
		})
	}

	client := s3.NewFromConfig(awsCfg, clientOpts...)

	// 确保 bucket 存在（minio 需要手动创建）
	_, err = client.HeadBucket(context.Background(), &s3.HeadBucketInput{Bucket: &cfg.Bucket})
	if err != nil {
		log.Printf("[S3] bucket %s 不存在，尝试创建...", cfg.Bucket)
		_, err = client.CreateBucket(context.Background(), &s3.CreateBucketInput{Bucket: &cfg.Bucket})
		if err != nil {
			return nil, fmt.Errorf("创建 bucket 失败: %w", err)
		}
		log.Printf("[S3] bucket %s 创建成功", cfg.Bucket)
	}

	log.Printf("[S3] 连接成功: endpoint=%s bucket=%s", cfg.Endpoint, cfg.Bucket)
	return &S3Store{client: client, cfg: cfg}, nil
}

// Upload 上传文件，返回访问 URL
func (s *S3Store) Upload(ctx context.Context, reader io.Reader, contentType, ext string) (string, error) {
	key := fmt.Sprintf("puzzles/%s%s", uuid.New().String(), ext)

	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      &s.cfg.Bucket,
		Key:         &key,
		Body:        reader,
		ContentType: &contentType,
	})
	if err != nil {
		return "", fmt.Errorf("上传失败: %w", err)
	}

	url := fmt.Sprintf("%s/%s", s.cfg.PublicURLPrefix, key)
	return url, nil
}

// Delete 删除文件
func (s *S3Store) Delete(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: &s.cfg.Bucket,
		Key:    &key,
	})
	return err
}

// GeneratePresignedURL 生成预签名 URL（可选）
func (s *S3Store) GeneratePresignedURL(ctx context.Context, key string, expires time.Duration) (string, error) {
	presignClient := s3.NewPresignClient(s.client)
	req, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: &s.cfg.Bucket,
		Key:    &key,
	}, func(o *s3.PresignOptions) {
		o.Expires = expires
	})
	if err != nil {
		return "", err
	}
	return req.URL, nil
}

// ExtFromContentType 根据 Content-Type 返回扩展名
func ExtFromContentType(ct string) string {
	switch ct {
	case "image/png":
		return ".png"
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	default:
		return filepath.Ext(ct)
	}
}

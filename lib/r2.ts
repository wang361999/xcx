import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || '';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// 生成唯一的 R2 key
export function generateR2Key(prefix: string = 'images', ext: string = 'jpg'): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}/${year}/${month}/${random}.${ext}`;
}

// 生成预签名上传 URL（前端直传用）
export async function getUploadSignedUrl(key: string, contentType: string = 'image/jpeg', expiresIn: number = 600): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn });
  // 如果 R2 Bucket 开了公共访问，直接用这个 URL 就能访问
  // 如果没有，需要单独的公共 URL 或者用预签名下载 URL
  const publicUrl = `${R2_ENDPOINT.replace('.r2.cloudflarestorage.com', '.r2.dev')}/${R2_BUCKET}/${key}`;

  return { uploadUrl, publicUrl, key };
}

// 生成预签名下载 URL（给小程序用，如果 Bucket 不是公共的）
export async function getDownloadSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

// 删除文件
export async function deleteFile(key: string): Promise<void> {
  try {
    await r2Client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }));
  } catch (err) {
    console.error('R2 delete error:', err);
  }
}

// 检查文件是否存在
export async function fileExists(key: string): Promise<boolean> {
  try {
    await r2Client.send(new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

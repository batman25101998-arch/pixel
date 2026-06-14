import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: true,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY
  }
});

export async function createUploadUrl(userId: string, fileName: string, contentType: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
  const key = `users/${userId}/${crypto.randomUUID()}-${safeName}`;
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType
  });

  return {
    key,
    uploadUrl: await getSignedUrl(s3, command, { expiresIn: 60 }),
    publicUrl: `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`
  };
}

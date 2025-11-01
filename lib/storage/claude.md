# Vultr Object Storage - Implementation Guide

## Configuration

### S3 Client Setup
```typescript
// lib/storage/vultr.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const vultrClient = new S3Client({
  endpoint: process.env.VULTR_STORAGE_ENDPOINT, // e.g., ewr1.vultrobjects.com
  region: process.env.VULTR_REGION || 'ewr',
  credentials: {
    accessKeyId: process.env.VULTR_ACCESS_KEY,
    secretAccessKey: process.env.VULTR_SECRET_KEY
  }
});

const BUCKET_NAME = 'civic-pulse-podcasts';
const CDN_URL = process.env.VULTR_CDN_URL;
```

---

## Upload Podcast

```typescript
export async function uploadPodcast(
  audioBuffer: Buffer,
  userId: string,
  type: 'daily' | 'weekly',
  metadata: {
    duration: number;
    billsCovered: string[];
    generatedAt: Date;
  }
): Promise<string> {
  const key = `podcasts/${userId}/${type}/${Date.now()}.mp3`;
  
  await vultrClient.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: audioBuffer,
    ContentType: 'audio/mpeg',
    ACL: 'public-read',
    CacheControl: type === 'daily' ? 'public, max-age=86400' : 'public, max-age=604800',
    Metadata: {
      userId,
      type,
      duration: metadata.duration.toString(),
      billsCovered: metadata.billsCovered.join(','),
      generatedAt: metadata.generatedAt.toISOString()
    }
  }));
  
  return `${CDN_URL}/${key}`;
}
```

---

## Bucket Structure

```
civic-pulse-podcasts/
├── podcasts/
│   ├── user-123/
│   │   ├── daily/
│   │   │   ├── 1698345600000.mp3
│   │   │   └── 1698432000000.mp3
│   │   └── weekly/
│   │       └── 1698345600000.mp3
```

---

## Cache Configuration

### Cache Headers
- **Daily podcasts:** `max-age=86400` (24 hours)
- **Weekly podcasts:** `max-age=604800` (7 days)
- **Content-Type:** `audio/mpeg`
- **ACL:** `public-read` (required for CDN)

### CORS Setup
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://hakivo.com", "https://www.hakivo.com"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

---

## CDN Configuration

### Enable CDN
1. Configure Vultr CDN in dashboard
2. Point to object storage bucket
3. Set custom domain: `cdn.hakivo.com`
4. Enable HTTPS

### CDN URL Format
```typescript
const audioUrl = `${CDN_URL}/podcasts/${userId}/${type}/${timestamp}.mp3`;
// Example: https://cdn.hakivo.com/podcasts/user-123/daily/1698345600000.mp3
```

---

## Error Handling

```typescript
export async function uploadWithRetry(
  audioBuffer: Buffer,
  userId: string,
  type: 'daily' | 'weekly',
  metadata: any,
  maxRetries = 3
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadPodcast(audioBuffer, userId, type, metadata);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Upload failed after retries');
}
```

---

## Testing

```bash
# Test upload
node -e "
const { uploadPodcast } = require('./lib/storage/vultr');
const fs = require('fs');
const audio = fs.readFileSync('test.mp3');
uploadPodcast(audio, 'test-user', 'daily', {
  duration: 300,
  billsCovered: ['bill-1'],
  generatedAt: new Date()
}).then(url => console.log('Uploaded:', url));
"

# Test CDN access
curl -I https://cdn.hakivo.com/podcasts/test-user/daily/1234567890.mp3
```

---

## Performance Optimization

### File Size Management
- Target: 5-15MB per podcast
- Format: MP3, 44.1kHz, 192kbps
- Compression: Handled by ElevenLabs

### CDN Hit Rate
- Monitor cache hit rate (target >90%)
- Set appropriate cache headers
- Invalidate cache only when necessary

---

## Cost Management

### Storage Costs
- ~$0.01/GB/month for storage
- ~$0.01/GB for bandwidth (CDN)
- Daily podcast: ~10MB = $0.0001/month storage
- 1000 users = 10GB = $0.10/month storage

### Optimization Tips
- Delete old podcasts after 30 days (optional)
- Use lifecycle policies for automatic cleanup
- Monitor bandwidth usage

---

## Security

### Access Control
- Use `public-read` ACL for CDN access
- Keep credentials in environment variables
- Rotate access keys quarterly
- Monitor access logs for suspicious activity

### Signed URLs (Future Enhancement)
```typescript
// For premium content
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
const signedUrl = await getSignedUrl(vultrClient, command, { expiresIn: 3600 });
```

---

## Monitoring

### Metrics to Track
- Upload success rate
- Upload duration
- CDN cache hit rate
- Bandwidth usage
- Storage usage

### Alerts
- Upload failure rate >5%
- CDN cache hit rate <80%
- Bandwidth spike (>2x average)

---

**Always test uploads in staging before production deployment.**

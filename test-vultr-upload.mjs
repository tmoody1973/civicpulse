/**
 * Test Vultr Object Storage Upload
 *
 * Uploads a test file and verifies public accessibility
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const BUCKET_NAME = 'civic-pulse-podcasts';
const endpoint = 'https://sjc1.vultrobjects.com';
const accessKeyId = 'VDNCF8FT3EDLY3J4MLUY';
const secretAccessKey = 'j9OBp3jBefMYnFMfD4rfal3JKfOOLGeOXFSCH0fY';

const s3Client = new S3Client({
  endpoint,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// Create a small test MP3 file (just a few bytes)
const testContent = Buffer.from('Test MP3 content - this is a placeholder for testing');
const testKey = `test-user/daily/test-${Date.now()}.mp3`;

console.log('🚀 Testing Vultr Object Storage upload...');
console.log('📦 Bucket:', BUCKET_NAME);
console.log('🔑 Key:', testKey);

try {
  // Upload with public-read ACL
  console.log('\n1️⃣ Uploading test file...');
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'audio/mpeg',
      ACL: 'public-read',
      CacheControl: 'public, max-age=31536000',
      Metadata: {
        test: 'true',
        uploadedAt: new Date().toISOString(),
      },
    })
  );
  console.log('✅ Upload successful');

  // Construct public URL
  const publicUrl = `${endpoint}/${BUCKET_NAME}/${testKey}`;
  console.log('\n2️⃣ Testing public access...');
  console.log('🔗 Public URL:', publicUrl);

  // Test public access with curl
  const { execSync } = await import('child_process');
  const curlResult = execSync(`curl -I "${publicUrl}" 2>&1`).toString();

  console.log('\n📄 Response:');
  console.log(curlResult);

  if (curlResult.includes('200 OK') || curlResult.includes('HTTP/2 200')) {
    console.log('\n✅ SUCCESS! File is publicly accessible');
    console.log('\n🎉 Vultr Object Storage is properly configured!');
    console.log('\n📝 You can now:');
    console.log('1. Generate a new podcast');
    console.log('2. It will automatically upload to Vultr');
    console.log('3. The audio will be publicly accessible via CDN');
  } else if (curlResult.includes('403')) {
    console.log('\n❌ FAILED: Still getting 403 Forbidden');
    console.log('The bucket policy may need time to propagate, or there may be additional restrictions.');
  } else {
    console.log('\n⚠️  Unexpected response - check output above');
  }
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}

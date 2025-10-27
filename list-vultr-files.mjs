/**
 * List files in Vultr Object Storage bucket
 */

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

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

console.log('📦 Listing files in bucket:', BUCKET_NAME);
console.log('🔗 Endpoint:', endpoint);

try {
  const response = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 100,
    })
  );

  if (!response.Contents || response.Contents.length === 0) {
    console.log('\n📭 Bucket is empty (no podcast files uploaded yet)');
  } else {
    console.log(`\n📄 Found ${response.Contents.length} files:\n`);
    response.Contents.forEach((obj, index) => {
      const sizeKB = ((obj.Size || 0) / 1024).toFixed(2);
      const sizeMB = ((obj.Size || 0) / 1024 / 1024).toFixed(2);
      const url = `${endpoint}/${BUCKET_NAME}/${obj.Key}`;

      console.log(`${index + 1}. ${obj.Key}`);
      console.log(`   Size: ${sizeMB} MB (${sizeKB} KB)`);
      console.log(`   Last Modified: ${obj.LastModified}`);
      console.log(`   URL: ${url}`);
      console.log('');
    });
  }
} catch (error) {
  console.error('❌ Error listing files:', error.message);
}

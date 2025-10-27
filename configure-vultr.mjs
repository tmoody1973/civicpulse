/**
 * Configure Vultr Object Storage Bucket
 *
 * Sets up CORS and public access policies for civic-pulse-podcasts bucket
 */

import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
  PutBucketPolicyCommand,
  GetBucketPolicyCommand,
  PutPublicAccessBlockCommand,
} from '@aws-sdk/client-s3';

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

console.log('🚀 Configuring Vultr Object Storage bucket:', BUCKET_NAME);
console.log('🔗 Endpoint:', endpoint);

// Step 1: Disable public access block (allow public policies and ACLs)
console.log('\n1️⃣ Disabling public access block...');
try {
  await s3Client.send(
    new PutPublicAccessBlockCommand({
      Bucket: BUCKET_NAME,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    })
  );
  console.log('✅ Public access block disabled');
} catch (error) {
  console.log('⚠️  Public access block not supported or already disabled:', error.message);
}

// Step 2: Configure CORS
console.log('\n2️⃣ Configuring CORS policy...');
const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: [
        'http://localhost:3000',
        'http://localhost:8888',
        'https://civicpulse.netlify.app',
        'https://*.netlify.app',
      ],
      AllowedMethods: ['GET', 'HEAD'],
      AllowedHeaders: ['*'],
      MaxAgeSeconds: 3600,
      ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
    },
  ],
};

try {
  await s3Client.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: corsConfiguration,
    })
  );
  console.log('✅ CORS policy configured');

  // Verify
  const cors = await s3Client.send(new GetBucketCorsCommand({ Bucket: BUCKET_NAME }));
  console.log('📄 CORS rules:', JSON.stringify(cors.CORSRules, null, 2));
} catch (error) {
  console.error('❌ Failed to configure CORS:', error.message);
}

// Step 3: Configure bucket policy for public read
console.log('\n3️⃣ Configuring bucket policy for public read...');
const bucketPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'PublicReadGetObject',
      Effect: 'Allow',
      Principal: '*',
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
    },
  ],
};

try {
  await s3Client.send(
    new PutBucketPolicyCommand({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(bucketPolicy),
    })
  );
  console.log('✅ Bucket policy configured');

  // Verify
  const policy = await s3Client.send(new GetBucketPolicyCommand({ Bucket: BUCKET_NAME }));
  console.log('📄 Bucket policy:', policy.Policy);
} catch (error) {
  console.error('❌ Failed to configure bucket policy:', error.message);
}

console.log('\n✨ Configuration complete!');
console.log('\n📝 Next steps:');
console.log('1. Re-enable Vultr uploads in lib/storage/vultr.ts');
console.log('2. Test podcast generation');
console.log('3. Verify files are publicly accessible');

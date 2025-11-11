/**
 * Test Image URL Fix
 * 
 * 1. Delete old articles with [object Object] images
 * 2. Trigger Inngest to generate fresh articles with correct image URLs
 * 3. Verify images are now proper URL strings
 */

import { executeQuery } from './lib/db/client';
import { inngest } from './src/inngest/client';

async function testImageFix() {
  console.log('🧪 Testing Image URL Fix\n');
  console.log('=' .repeat(70));

  try {
    // Step 1: Delete old broken articles
    console.log('\n🗑️  Step 1: Deleting old articles with broken images...');
    
    const deleteResult = await executeQuery(
      `DELETE FROM news_articles WHERE image_url LIKE '%object%'`,
      'users'
    );
    
    console.log(`✅ Deleted articles with broken image URLs`);

    // Step 2: Trigger Inngest to generate fresh articles
    console.log('\n🚀 Step 2: Triggering Inngest to generate fresh personalized news...');
    
    const result = await inngest.send({
      name: 'news/generate-personalized',
      data: {
        userId: 'user_01K8NC5EJ3JBZKC9EQRQBQQVK4',
        policyInterests: ['education', 'science', 'technology'],
        state: 'CA',
        district: '12',
        limit: 20
      }
    });

    console.log('✅ Inngest event sent successfully!');
    console.log('   Event IDs:', result.ids);
    console.log('\n⏳ Wait 60 seconds for Inngest to complete...');
    console.log('   Watch progress at: http://localhost:8288\n');

    // Wait for Inngest to complete
    await new Promise(resolve => setTimeout(resolve, 60000));

    // Step 3: Query database and verify image URLs
    console.log('\n🔍 Step 3: Verifying new articles have proper image URLs...');
    
    const sql = `
      SELECT
        id,
        title,
        image_url,
        created_at
      FROM news_articles
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const queryResult = await executeQuery(sql, 'users');
    const articles = queryResult.rows || [];

    console.log(`✅ Found ${articles.length} articles\n`);

    // Check each image URL
    let successCount = 0;
    let failCount = 0;

    for (const article of articles) {
      const shortTitle = article.title.substring(0, 60);
      console.log(`📄 ${shortTitle}...`);
      
      if (article.image_url) {
        // Check if it's a valid URL (not [object Object])
        if (article.image_url.startsWith('http')) {
          console.log(`   ✅ Valid URL: ${article.image_url.substring(0, 80)}...`);
          
          // Test if image is accessible
          try {
            const response = await fetch(article.image_url, { method: 'HEAD' });
            if (response.ok) {
              console.log(`   ✅ Image accessible (${response.status})`);
              successCount++;
            } else {
              console.log(`   ⚠️  Image returns ${response.status}`);
              failCount++;
            }
          } catch (error) {
            console.log(`   ⚠️  Image fetch failed: ${(error as Error).message}`);
            failCount++;
          }
        } else {
          console.log(`   ❌ BROKEN: ${article.image_url}`);
          failCount++;
        }
      } else {
        console.log(`   ⚠️  No image URL`);
        failCount++;
      }
      console.log('');
    }

    // Summary
    console.log('=' .repeat(70));
    console.log('📊 Test Results:');
    console.log(`   Total articles: ${articles.length}`);
    console.log(`   ✅ Valid images: ${successCount}`);
    console.log(`   ❌ Failed/missing: ${failCount}`);
    
    if (successCount === articles.length) {
      console.log('\n🎉 SUCCESS: All articles have valid image URLs!');
    } else if (successCount > 0) {
      console.log('\n⚠️  PARTIAL: Some images missing or broken');
    } else {
      console.log('\n❌ FAILURE: No valid image URLs found');
    }

    console.log('\n✅ Test complete!');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testImageFix();

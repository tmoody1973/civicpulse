/**
 * Add city column to users table
 */
import { executeQuery } from '../lib/db/client';

async function addCityColumn() {
  try {
    console.log('📝 Adding city column to users table...');
    
    await executeQuery(
      `ALTER TABLE users ADD COLUMN city TEXT`,
      'users'
    );
    
    console.log('✅ Column added successfully!');
  } catch (error: any) {
    if (error.message?.includes('duplicate column name')) {
      console.log('✅ Column already exists, skipping');
    } else {
      console.error('❌ Failed to add column:', error);
      throw error;
    }
  }
}

addCityColumn()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

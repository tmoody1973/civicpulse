/**
 * Add contact_url column to representatives table
 */
import { executeQuery } from '../lib/db/client';

async function addContactUrlColumn() {
  try {
    console.log('📝 Adding contact_url column to representatives table...');
    
    await executeQuery(
      `ALTER TABLE representatives ADD COLUMN contact_url TEXT`,
      'representatives'
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

addContactUrlColumn()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

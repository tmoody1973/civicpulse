#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;
const billId = '119-hres-850';

async function checkBill() {
  console.log(`Checking for bill: ${billId}`);
  console.log(`Raindrop service: ${RAINDROP_SERVICE_URL}`);

  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/bills?id=${billId}`);
  const data = await response.json();

  console.log('\nResponse:', JSON.stringify(data, null, 2));

  // Also check what bills exist
  console.log('\n--- Checking recent bills ---');
  const recentResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/bills?limit=5`);
  const recentData = await recentResponse.json();

  if (recentData.bills && recentData.bills.length > 0) {
    console.log('\nSample bill IDs in database:');
    recentData.bills.forEach((bill: any) => {
      console.log(`- ${bill.id} (${bill.bill_type} ${bill.bill_number})`);
    });
  }
}

checkBill();

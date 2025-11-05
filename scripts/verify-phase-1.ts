/**
 * Phase 1 Setup Verification Script
 * Verifies all Phase 1 files and exports exist
 *
 * Run with: npx tsx scripts/verify-phase-1.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Colored console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, 'green');
}

function error(message: string) {
  log(`❌ ${message}`, 'red');
}

function info(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

async function verifyPhase1() {
  log('\n🔍 Verifying Phase 1 Setup\n', 'blue');
  log('═'.repeat(60), 'blue');

  let checksPassed = 0;
  let checksFailed = 0;

  // Check 1: raindrop.manifest
  log('\n📦 Check 1: Raindrop Manifest Configuration', 'yellow');
  const manifestPath = path.join(process.cwd(), 'raindrop.manifest');
  if (fs.existsSync(manifestPath)) {
    const manifest = fs.readFileSync(manifestPath, 'utf-8');

    const hasUserMemory = manifest.includes('smartmemory "user_memory"');
    const hasAnalytics = manifest.includes('smartsql "analytics"');
    const hasQueue = manifest.includes('queue "recommendation-updates"');
    const hasObserver = manifest.includes('observer "user-behavior-tracker"');

    if (hasUserMemory && hasAnalytics && hasQueue && hasObserver) {
      success('All required services configured in manifest');
      checksPassed++;
    } else {
      error('Missing services in manifest');
      if (!hasUserMemory) error('  - Missing: smartmemory "user_memory"');
      if (!hasAnalytics) error('  - Missing: smartsql "analytics"');
      if (!hasQueue) error('  - Missing: queue "recommendation-updates"');
      if (!hasObserver) error('  - Missing: observer "user-behavior-tracker"');
      checksFailed++;
    }
  } else {
    error('raindrop.manifest not found');
    checksFailed++;
  }

  // Check 2: TypeScript Bindings
  log('\n🔧 Check 2: TypeScript Bindings', 'yellow');
  const genPath = path.join(process.cwd(), 'src/web/raindrop.gen.ts');
  if (fs.existsSync(genPath)) {
    const gen = fs.readFileSync(genPath, 'utf-8');

    const hasEnv = gen.includes('export interface Env');
    const hasUserMemory = gen.includes('USER_MEMORY: SmartMemory');
    const hasAnalytics = gen.includes('ANALYTICS: SmartSql');

    if (hasEnv && hasUserMemory && hasAnalytics) {
      success('TypeScript bindings generated correctly');
      info(`  Location: ${genPath}`);
      checksPassed++;
    } else {
      error('TypeScript bindings incomplete');
      checksFailed++;
    }
  } else {
    error('raindrop.gen.ts not found - run: raindrop build generate');
    checksFailed++;
  }

  // Check 3: Tracking System
  log('\n📊 Check 3: User Interaction Tracking System', 'yellow');
  const trackingFiles = [
    'lib/tracking/types.ts',
    'lib/tracking/user-interactions.ts',
  ];

  let trackingOk = true;
  for (const file of trackingFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      success(`Found: ${file}`);
    } else {
      error(`Missing: ${file}`);
      trackingOk = false;
    }
  }

  if (trackingOk) {
    // Check for key exports
    const userInteractions = fs.readFileSync(
      path.join(process.cwd(), 'lib/tracking/user-interactions.ts'),
      'utf-8'
    );
    const hasTrackInteraction = userInteractions.includes('export async function trackInteraction');
    const hasTrackBillView = userInteractions.includes('export async function trackBillView');
    const hasGetBehavior = userInteractions.includes('export async function getUserBehaviorPattern');

    if (hasTrackInteraction && hasTrackBillView && hasGetBehavior) {
      success('All tracking functions exported');
      checksPassed++;
    } else {
      error('Missing tracking function exports');
      checksFailed++;
    }
  } else {
    checksFailed++;
  }

  // Check 4: Preference Management
  log('\n👤 Check 4: User Preference Management', 'yellow');
  const preferenceFiles = [
    'lib/preferences/types.ts',
    'lib/preferences/user-preferences.ts',
  ];

  let preferencesOk = true;
  for (const file of preferenceFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      success(`Found: ${file}`);
    } else {
      error(`Missing: ${file}`);
      preferencesOk = false;
    }
  }

  if (preferencesOk) {
    const userPrefs = fs.readFileSync(
      path.join(process.cwd(), 'lib/preferences/user-preferences.ts'),
      'utf-8'
    );
    const hasGetProfile = userPrefs.includes('export async function getUserProfile');
    const hasUpdateProfile = userPrefs.includes('export async function updateUserProfile');
    const hasGetWidgets = userPrefs.includes('export async function getWidgetPreferences');

    if (hasGetProfile && hasUpdateProfile && hasGetWidgets) {
      success('All preference functions exported');
      checksPassed++;
    } else {
      error('Missing preference function exports');
      checksFailed++;
    }
  } else {
    checksFailed++;
  }

  // Check 5: Procedural Memory
  log('\n🧠 Check 5: Procedural Memory System', 'yellow');
  const memoryFiles = [
    'lib/memory/prompts.ts',
    'lib/memory/procedural-init.ts',
  ];

  let memoryOk = true;
  for (const file of memoryFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      success(`Found: ${file}`);
    } else {
      error(`Missing: ${file}`);
      memoryOk = false;
    }
  }

  if (memoryOk) {
    const proceduralInit = fs.readFileSync(
      path.join(process.cwd(), 'lib/memory/procedural-init.ts'),
      'utf-8'
    );
    const hasInit = proceduralInit.includes('export async function initializeProceduralMemory');
    const hasGetPrompt = proceduralInit.includes('export async function getBillRecommendationPrompt');
    const hasChatPrompt = proceduralInit.includes('export async function getChatAssistantPrompt');

    if (hasInit && hasGetPrompt && hasChatPrompt) {
      success('All procedural memory functions exported');
      checksPassed++;
    } else {
      error('Missing procedural memory function exports');
      checksFailed++;
    }
  } else {
    checksFailed++;
  }

  // Check 6: API Routes
  log('\n🌐 Check 6: API Routes', 'yellow');
  const apiRoutes = [
    'app/api/tracking/route.ts',
    'app/api/preferences/profile/route.ts',
    'app/api/preferences/widgets/route.ts',
    'app/api/memory/init/route.ts',
  ];

  let routesOk = true;
  for (const route of apiRoutes) {
    const routePath = path.join(process.cwd(), route);
    if (fs.existsSync(routePath)) {
      success(`Found: ${route}`);
    } else {
      error(`Missing: ${route}`);
      routesOk = false;
    }
  }

  if (routesOk) {
    checksPassed++;
  } else {
    checksFailed++;
  }

  // Check 7: Test Files
  log('\n✅ Check 7: Test Files', 'yellow');
  const testFiles = [
    'scripts/test-phase-1.ts',
    'scripts/test-api-routes.http',
  ];

  let testsOk = true;
  for (const test of testFiles) {
    const testPath = path.join(process.cwd(), test);
    if (fs.existsSync(testPath)) {
      success(`Found: ${test}`);
    } else {
      error(`Missing: ${test}`);
      testsOk = false;
    }
  }

  if (testsOk) {
    checksPassed++;
  } else {
    checksFailed++;
  }

  // Final Summary
  log('\n' + '═'.repeat(60), 'blue');
  log('\n📊 Verification Summary', 'blue');
  log('═'.repeat(60) + '\n', 'blue');

  const totalChecks = checksPassed + checksFailed;
  const passRate = ((checksPassed / totalChecks) * 100).toFixed(1);

  if (checksFailed === 0) {
    success(`All ${checksPassed} checks passed! 🎉`);
    log('\n✨ Phase 1 setup is complete and ready to use!', 'green');
    log('\nNext steps:', 'blue');
    info('  1. Start dev server: npm run dev');
    info('  2. Initialize procedural memory: POST /api/memory/init');
    info('  3. Test API routes using scripts/test-api-routes.http');
    info('  4. Begin Phase 2 implementation');
  } else {
    log(`Checks passed: ${checksPassed}/${totalChecks} (${passRate}%)`, 'yellow');
    error(`Checks failed: ${checksFailed}/${totalChecks}`);
    log('\n⚠️  Some Phase 1 components are missing or incomplete.', 'yellow');
  }

  log('\n' + '═'.repeat(60) + '\n', 'blue');

  // Exit with appropriate code
  process.exit(checksFailed > 0 ? 1 : 0);
}

// Run verification
verifyPhase1().catch((err) => {
  error(`Fatal error: ${err}`);
  process.exit(1);
});

/**
 * JANITOU FOOD — Database Seed Script
 * Resets and populates the database with default catering catalog and records.
 */

import { JanitouDatabase } from './index.js';

console.log('[DATABASE SEED] Initializing seed routine...');

const db = new JanitouDatabase();
console.log(`[DATABASE SEED] Connected via storage: ${db.getConfig().storageFilePath}`);
console.log('[DATABASE SEED] Ready.');

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesText = fs.readFileSync('firestore.rules', 'utf8');

test('firestore.rules uses rules_version 2 and default-deny catch-all', () => {
  assert.match(rulesText, /rules_version\s*=\s*'2';/);
  assert.match(rulesText, /match\s*\/\{document=\*\*\}\s*\{\s*allow read, write:\s*if false;\s*\}/);
});

test('firestore.rules enforces email_verified, isValidId, and validation helpers on every entity', () => {
  assert.match(rulesText, /request\.auth\.token\.email_verified\s*==\s*true/);
  assert.match(rulesText, /function\s+isValidId\(id\)/);
  for (const helper of [
    'isValidUserProfile',
    'isValidUserPrivateInfo',
    'isValidMatchRecord',
    'isValidClub',
    'isValidClubMember',
    'isValidTournament',
    'isValidLeaderboardEntry',
  ]) {
    assert.ok(rulesText.includes(`function ${helper}`), `Missing ${helper}`);
  }
});

test('firestore.rules isolates PII, locks terminal tournament state, and avoids blanket list reads', () => {
  assert.match(rulesText, /match \/private\/\{docId\}/);
  assert.match(rulesText, /existing\(\)\.status\s*!=\s*'completed'/);
  assert.equal(/allow\s+(read|list)\s*:\s*if\s+isSignedIn\(\)\s*;/.test(rulesText), false);
});

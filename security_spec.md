# Mini Football World — Firestore Security Specification

## 1. Data Invariants
1. **Identity Isolation**: A user may only create, read, or update their own `/users/{userId}` profile, `/users/{userId}/private/{docId}` PII document, and `/users/{userId}/matches/{matchId}` match history.
2. **PII Segregation**: Email addresses are strictly isolated inside `/users/{userId}/private/info` and never stored in `/users/{userId}`, `/leaderboard/{userId}`, `/clubs/{clubId}`, or `/tournaments/{tournamentId}`.
3. **Immutable Ownership & Timestamps**: `uid`, `userId`, `ownerId`, and `createdAt` cannot be modified after creation. Server time (`request.time`) is strictly enforced on `createdAt` and `updatedAt`.
4. **Master Gate Relational Sync**: Club membership documents under `/clubs/{clubId}/members/{memberId}` cannot exist without an existing parent `/clubs/{clubId}` document verified via `get()`.
5. **Terminal State Locking**: Once a tournament reaches `status == 'completed'`, no further updates are permitted.
6. **Action-Based Updates & Strict Keys**: Every `create` checks `hasAll` and `hasOnly`; every `update` calls `isValid[Entity](incoming())` and restricts `affectedKeys().hasOnly(...)` per action branch.
7. **Bounded Arrays & Strings**: Every string checks `.size()`, every ID checks `isValidId()` (`^[a-zA-Z0-9_\-]+$`, `<= 128`), and every array (`unlockedIds`) checks `.size() <= 120` and element 0 type.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Profile**: `{ uid: "u1", ..., isAdmin: true }` -> `PERMISSION_DENIED` (`hasOnly` rejects `isAdmin`).
2. **Identity Spoofing on Profile**: User `u2` writing `/users/u1` with `uid: "u1"` -> `PERMISSION_DENIED`.
3. **Unverified Email Write**: Creating profile when `request.auth.token.email_verified == false` -> `PERMISSION_DENIED`.
4. **ID Poisoning**: Creating `/clubs/invalid$id!` or 1.5KB ID -> `PERMISSION_DENIED` (`isValidId`).
5. **PII Cross-Read**: User `u2` reading `/users/u1/private/info` -> `PERMISSION_DENIED`.
6. **Client Timestamp Spoofing**: Creating profile with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> `PERMISSION_DENIED`.
7. **Immutable Field Mutation**: Updating `uid` or `createdAt` on `/users/u1` -> `PERMISSION_DENIED`.
8. **Orphaned Club Member**: Creating `/clubs/nonexistent/members/u1` -> `PERMISSION_DENIED` (Master Gate `exists`/`get` fails).
9. **Terminal Tournament Tampering**: Updating a tournament whose `existing().status == 'completed'` -> `PERMISSION_DENIED`.
10. **Value Poisoning on Leaderboard**: Updating `/leaderboard/u1` with `trophies: "999999"` (string instead of int) -> `PERMISSION_DENIED`.
11. **Oversized Array Attack**: Setting `unlockedIds` with 150 items (`> 120`) -> `PERMISSION_DENIED`.
12. **Blanket User List Scraping**: Querying `list` on `/users` or `/users/u1/private` -> `PERMISSION_DENIED`.

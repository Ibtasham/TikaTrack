# Firestore Security Specification (TikaTrack)

## 1. Data Invariants
1. **Global Default Deny**: Any unmatched path defaults to `allow read, write: if false`.
2. **Verified Identity Enforcement**: Every write and private read requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Strict PII Isolation**: Email addresses live strictly under `/users/{userId}/private/account` readable only by `request.auth.uid == userId`.
4. **Immutable Ownership & Temporal Integrity**: Every owned document checks `ownerUid == request.auth.uid`, forbids modifying `ownerUid` or `createdAt` on update, and requires `createdAt == request.time` on create and `updatedAt == request.time` on update.
5. **Bounded Arrays & Strict Keys**: `familyProfiles` enforces `hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update, string size bounds, ID regex `^[a-zA-Z0-9_\-]+$`, and `.size() <= 80` array limits.
6. **Parent Gate & Existence**: Subcollections under `users/{userId}` validate `isValidId()` on document IDs and verify path-to-UID matching.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Create**: Create `/users/u1/familyProfiles/p1` with `auth == null`.
2. **Unverified Email Write**: Create `/users/u1/familyProfiles/p1` with `auth.uid == 'u1'` and `email_verified: false`.
3. **Cross-User PII Read**: Signed-in user `u2` calls `get` on `/users/u1/private/account`.
4. **Cross-User Profile List**: Signed-in user `u2` calls `list` on `/users/u1/familyProfiles`.
5. **UID Spoofing on Create**: User `u1` creates `/users/u1/familyProfiles/p1` with `ownerUid: 'u2'`.
6. **Ghost Field / Shadow Update**: User `u1` updates `/users/u1/familyProfiles/p1` injecting `{ isAdmin: true }`.
7. **Immortal Field Mutation**: User `u1` updates `createdAt` or `ownerUid` on an existing `familyProfile`.
8. **Backdated Timestamp Spoof**: User `u1` creates a `studioNote` with a client-supplied `Date` instead of `request.time`.
9. **Oversized Array Denial-of-Wallet**: User `u1` creates `familyProfiles/p1` with `events.size() == 100` (> 80 max).
10. **ID Poisoning Attack**: User `u1` creates `/users/u1/familyProfiles/bad$id..with..chars`.
11. **Wrong Path Doc ID**: User `u1` creates `/users/u1/private/not_account`.
12. **Type Poisoning on Whitelisted Update**: User `u1` updates `name` on `familyProfiles/p1` to a number `12345` or 500-char string.

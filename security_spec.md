# Lanzudo's Hotel Experience PMS Security Specification

## Data Invariants
1. A booking must have a valid guestId and roomId.
2. Room status updates must follow logical state transitions (e.g., OCCUPIED -> CLEANING -> AVAILABLE).
3. Only authenticated staff can modify room statuses and bookings.
4. Guest PII is only accessible to staff or the guest themselves.

## The Dirty Dozen Payloads (TDD)
1. Creating a room without a price.
2. Setting room status to a non-existent status.
3. Updating a booking's guestId to someone else's.
4. Setting a negative price for an experience.
5. Deleting a room record (reserved for admins).
6. Unauthorized read of all guest records.
7. Overwriting a room's document ID with a 2KB string.
8. Injecting 'isAdmin: true' into a guest profile.
9. Modifying 'createdAt' on a booking update.
10. Creating a booking with checkOut before checkIn.
11. Bypassing email verification for sensitive writes.
12. Listing all bookings without a staff/admin role.

## Test Runner
Testing will be performed via firestore.rules.test.ts. (Simplified for this environment)

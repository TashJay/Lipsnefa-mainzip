# Lips & Sips POS Security Specification

## Data Invariants
1. A **Sales Tab** must always have a valid `staffId` and `customerName`.
2. **Audit Logs** are strictly append-only; they cannot be modified or deleted.
3. **Inventory Items** must have positive prices and stock levels.
4. **Staff Members** must have a unique PIN and an assigned role.

## The "Dirty Dozen" (Attack Payloads)
1. **Unauthorized Inventory Update**: Anonymous user attempts to change "Hennessy" price to 0.
2. **Role Escalation**: Standard staff member attempts to change their role to 'OWNER'.
3. **Shadow Tab Creation**: Creating a tab without a `staffId`.
4. **Audit Log Deletion**: Attempting to hide a transaction by deleting its audit log.
5. **Inventory Poisoning**: Injecting a 1MB string into the inventory `name` field.
6. **Debt Settle Bypass**: Marking an 'UNPAID' tab as 'PAID' without moving it through the proper terminal state.
7. **Room Theft**: Changing a room's price in the database directly.
8. **Owner Spoofing**: Setting `ownerId` on a record to someone else's ID.
9. **Timestamp Manipulation**: Setting a `createdAt` date in the future (2050).
10. **Partial Key Update**: Updating a Tab but removing the `total` field.
11. **ID Character Poisoning**: Using emoji and special characters in collection IDs to break indexing.
12. **PII Leak**: Unauthorized read of the entire staff collection (including hashed PINs) by a guest.

## Security Controls
- **Staff Auth**: All writes require `request.auth != null`.
- **Schema Validation**: Every entity uses a `isValid[Entity]` check.
- **Immutability**: `createdAt` and `id` fields are immutable after creation.
- **Role-Based Access**: Certain actions (Inventory/Staff edits) require existing staff records with proper roles.

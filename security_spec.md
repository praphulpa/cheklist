# Security Specification for Everyday Checklist & To-Do List

## 1. Data Invariants
- **Ownership Integrity**: A task document's `userId` field must match the authenticated user's UID (`request.auth.uid`). No user can read, create, update, or delete tasks belonging to another user.
- **Id Poisoning Guard**: The `taskId` must be verified using `isValidId()`, ensuring it matches the alphanumeric character subset and fits size constraints (size <= 128 bytes).
- **Schema Validation**:
  - `text` must be a string and its length must be constrained (e.g., between 1 and 500 characters).
  - `completed` must be a boolean.
  - `date` must be a string formatted in YYYY-MM-DD pattern.
  - `priority` must be either "Low", "Medium", or "High".
  - `reminderTime` if present, must be a string.
  - `reminderDismissed` if present, must be a boolean.
  - `createdAt` and `updatedAt` must be valid timestamps matching the server's sync timestamp (`request.time`).
- **Immutability Bounds**:
  - `createdAt`, `id`, and `userId` cannot be modified once the task is created.

---

## 2. The "Dirty Dozen" Payloads (Aesthetic Security Testing)

These payloads are designed to challenge and bypass security parameters. The security rules will block all of them:

1. **Spoofed User ID Write**:
   - Authenticated User UID: `alice_u123`
   - Payload: Create task with `userId: "bob_u456"`
   - Expected Result: `PERMISSION_DENIED`

2. **Unauthenticated Task Creation**:
   - Authenticated User UID: `null` (Anonymous/Unsigned)
   - Payload: Create task
   - Expected Result: `PERMISSION_DENIED`

3. **Massive ID Injection (Resource Exhaustion)**:
   - Path: `tasks/very-long-id-junk-junk-junk...` (>128 chars)
   - Expected Result: `PERMISSION_DENIED`

4. **Invalid Character ID Injection**:
   - Path: `tasks/task$$invalid`
   - Expected Result: `PERMISSION_DENIED`

5. **Size Limit Bypass (Payload Poisoning)**:
   - Payload: Task with `text` exceeding 10,000 characters
   - Expected Result: `PERMISSION_DENIED`

6. **Ghost Field Injection (Shadow Update)**:
   - Payload: Adding `isAdminPrivilege: true` during update
   - Expected Result: `PERMISSION_DENIED` (due to `affectedKeys` verification)

7. **Priority Enum Violation**:
   - Payload: Task with `priority: "Ultra-High"`
   - Expected Result: `PERMISSION_DENIED`

8. **Completed Type Poisoning**:
   - Payload: Task with `completed: "not-yet-done"` (string instead of boolean)
   - Expected Result: `PERMISSION_DENIED`

9. **Task Ownership Theft during Update**:
   - Payload: Modify `userId` de Alice to `bob` to orphan/steal access
   - Expected Result: `PERMISSION_DENIED`

10. **Created-at Timestamp Spoofing**:
    - Payload: Task created with a static/fake past client timestamp instead of Server Timestamp
    - Expected Result: `PERMISSION_DENIED`

11. **Altering Immutable Creator Stamp**:
    - Payload: Update task and alter `createdAt` to another timestamp
    - Expected Result: `PERMISSION_DENIED`

12. **Blanket Query Scraping**:
    - Query: Retrieve all tasks in the collection without filtering by `userId`
    - Expected Result: `PERMISSION_DENIED`

---

## 3. Test Rules Architecture

This specifications document ensures security assertions are fully verified by our crafted `firestore.rules` file.

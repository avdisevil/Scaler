# Database Schema Documentation

## Overview

This document provides a detailed explanation of the database schema design decisions for the Signal Clone application. The schema is normalized, indexed for performance, and designed to support the key query patterns of a messaging application.

## Schema Design Principles

1. **Normalization**: Each entity has its own table with clear relationships
2. **Data Integrity**: Foreign keys with appropriate cascading rules
3. **Performance**: Strategic indexes on frequently queried columns
4. **Flexibility**: Nullable fields for optional features
5. **Auditability**: Timestamps on all mutable entities
6. **Efficiency**: Optimized for common messaging query patterns

## Table-by-Table Analysis

### 1. Users Table

**Purpose**: Store user account information and authentication credentials.

**Key Design Decisions**:

- **Both email and phone as unique identifiers**: Allows users to register/login with either identifier, matching Signal's flexibility.
- **Password hashing**: Using bcrypt for secure password storage (never store plaintext).
- **Online status tracking**: `is_online` and `last_seen_at` enable presence features.
- **Separate verification flag**: `is_verified` allows staged registration (register → verify OTP → full access).
- **Avatar as URL**: Storing URL instead of binary data keeps the table lightweight; actual images stored in external storage (S3, Cloudinary, etc.).

**Indexes**:
- `email` (unique): Fast login by email
- `phone` (unique): Fast login by phone
- `display_name`: Search users by name when adding contacts
- `is_online`: Quickly filter online users for presence indicators

**Relationships**:
- Bidirectional contact relationships (user can have contacts, and be in others' contacts)
- Participant in conversations
- Sender of messages
- Recipient of message receipts

### 2. Sessions Table

**Purpose**: Manage user sessions and refresh tokens for JWT authentication.

**Key Design Decisions**:

- **Separate session table**: While access tokens are stateless JWTs, refresh tokens need persistence for:
  - Revocation (logout specific device)
  - Expiration tracking
  - Multi-device session management
- **Device and IP tracking**: Enables security features like "login from new device" notifications
- **Auto-expiration cleanup**: Index on `expires_at` enables efficient cleanup of expired sessions

**Indexes**:
- `session_id` (unique): Fast session lookup during token refresh
- `user_id`: Get all sessions for a user (account settings → manage devices)
- `expires_at`: Periodic cleanup job to delete expired sessions

**Cascading**: CASCADE on user deletion ensures no orphaned sessions remain.

### 3. Contacts Table

**Purpose**: Represent a user's address book.

**Key Design Decisions**:

- **Separate from users table**: Contacts are user-specific; Alice can have Bob as a contact, but Bob might not have Alice.
- **Custom nickname**: `display_name` allows users to override the contact's actual display name for their own view (e.g., calling "Robert Smith" as "Bob").
- **Bidirectional possibility**: Both `user_id` and `contact_user_id` reference users table, enabling flexible relationship queries.

**Indexes**:
- UNIQUE(user_id, contact_user_id): Prevents duplicate contact entries
- `user_id`: Get user's contact list
- `contact_user_id`: Find users who have a specific person as contact (useful for "people you may know")

**Cascading**: CASCADE on either user deletion keeps contact list clean.

### 4. Conversations Table

**Purpose**: Store both direct message conversations and group chats.

**Key Design Decisions**:

- **Unified table for both types**: Single table simplifies queries; `is_group` flag distinguishes types.
- **NULL name for direct messages**: Direct messages don't need names; groups do.
- **SET NULL on creator deletion**: When a user is deleted, their groups remain but `created_by` becomes NULL to preserve history.
- **updated_at for ordering**: This field is updated via triggers or application logic when new messages are sent, enabling "conversations sorted by recent activity".

**Indexes**:
- `is_group`: Filter conversations by type (direct vs group)
- `updated_at`: Order conversations by recent activity (critical for UX)
- `created_by`: Find groups created by a specific user

**Design Trade-off**: Could have separate tables for direct and group conversations, but unified table simplifies queries like "get all conversations for user" at the cost of some NULL fields.

### 5. Participants Table

**Purpose**: Track conversation membership and read status.

**Key Design Decisions**:

- **Membership tracking**: Junction table enabling many-to-many relationship between users and conversations.
- **Role-based access control**: `role` field enables admin/member distinction for group management.
- **Last read message tracking**: `last_read_message_id` is the key optimization for unread counts:
  - Without it: Need to query all messages and check timestamps
  - With it: Simple count of messages with ID > last_read_message_id
- **Joined timestamp**: Enables features like "user joined 3 days ago" in group info.

**Indexes**:
- UNIQUE(conversation_id, user_id): Prevents duplicate membership
- `conversation_id`: Get all participants in a conversation
- `user_id`: Get all conversations for a user
- `role`: Filter participants by role (e.g., get all admins)

**Cascading**: CASCADE on conversation or user deletion ensures no orphaned participants. SET NULL on message deletion preserves participant if their last read message is deleted.

**Unread Count Query**:
```sql
SELECT COUNT(*) FROM messages
WHERE conversation_id = ?
  AND id > (SELECT last_read_message_id FROM participants
             WHERE conversation_id = ? AND user_id = ?)
```
This is O(1) with proper indexing vs O(n) without last_read_message_id.

### 6. Messages Table

**Purpose**: Store all chat messages.

**Key Design Decisions**:

- **Content as TEXT**: Supports long messages without arbitrary length limits.
- **Message type field**: Extensible design for future media types (image, video, file, etc.).
- **Self-referential FK for replies**: Enables message threading without separate table.
- **Status tracking**: `status` field enables delivery/read receipts workflow.
- **Disappearing messages**: `disappears_at` enables time-based auto-deletion.
- **Composite index on (conversation_id, created_at)**: Critical for performance when fetching messages for a conversation in chronological order.

**Indexes**:
- `conversation_id, created_at` (composite): Optimizes the most common query - get messages for a conversation
- `sender_id`: Get messages sent by a user
- `status`: Find messages in specific states (e.g., all undelivered messages)
- `reply_to_id`: Find all replies to a specific message

**Cascading**: CASCADE on conversation or sender deletion. SET NULL on replied-to message deletion preserves the reply message but removes the reference.

**Message Status Flow**:
1. `sending` - Message created locally, awaiting send
2. `sent` - Message delivered to server
3. `delivered` - Message delivered to recipient's device
4. `read` - Recipient has read the message

### 7. Message Receipts Table

**Purpose**: Track delivery and read acknowledgments per user per message.

**Key Design Decisions**:

- **Separate from messages table**: Enables tracking who has read/delivered without cluttering messages table.
- **One receipt per user per message**: Unique constraint ensures latest status wins; updates overwrite previous receipts.
- **Status field**: Can be "delivered" or "read", enabling different behaviors (e.g., show single check for delivered, double check for read).
- **Timestamp**: Enables "read at X time" features.

**Indexes**:
- UNIQUE(message_id, user_id): Ensures one receipt per user per message
- `message_id`: Get all receipts for a message (e.g., "3 people read this")
- `user_id`: Get all receipts for a user
- `status`: Filter receipts by type

**Cascading**: CASCADE on message or user deletion.

**Design Trade-off**: Could store receipts in messages table as JSON, but separate table enables:
- Efficient queries (indexed)
- Foreign key integrity
- Future extensions (e.g., receipt metadata like device type)

## Key Query Patterns and Optimizations

### 1. Get User's Conversations with Unread Count

**Challenge**: Need conversations sorted by latest message with unread count per conversation.

**Solution**: Use a subquery to get latest message time per conversation, then join with participants and calculate unread count using `last_read_message_id`.

**Index Utilization**:
- `participants.user_id` - Filter by current user
- `messages(conversation_id, created_at)` - Get latest message
- `participants.last_read_message_id` - Calculate unread count

**Complexity**: O(n log n) where n = number of conversations, dominated by sorting.

### 2. Get Messages for a Conversation (Paginated)

**Challenge**: Efficiently retrieve messages in order with pagination.

**Solution**: Use composite index on `(conversation_id, created_at)` for ordered retrieval, then OFFSET/LIMIT for pagination.

**Index Utilization**:
- `messages(conversation_id, created_at)` - Direct index seek + range scan

**Complexity**: O(k) where k = page size (very efficient).

### 3. Check Conversation Membership

**Challenge**: Fast check if user is in a conversation.

**Solution**: Query participants table with both IDs.

**Index Utilization**:
- UNIQUE(conversation_id, user_id) - Direct index seek

**Complexity**: O(1) with proper indexing.

### 4. Find Direct Conversation Between Two Users

**Challenge**: Efficiently find if a direct conversation exists between two users.

**Solution**: Self-join participants table to find conversations where both users are participants and is_group=FALSE.

**Index Utilization**:
- `participants.conversation_id` - Both joins use this index
- `conversations.is_group` - Filter for direct messages

**Complexity**: O(n) where n = number of conversations shared between users (typically small).

### 5. Get Unread Count for Conversation

**Challenge**: Calculate unread messages efficiently.

**Solution**: Count messages with ID > last_read_message_id using indexed columns.

**Index Utilization**:
- `messages(conversation_id, created_at)` - Ordered by ID (since IDs are auto-increment with time)
- `participants.last_read_message_id` - Comparison point

**Complexity**: O(m) where m = number of unread messages (typically small).

### 6. Update Last Read Message

**Challenge**: Mark messages as read efficiently.

**Solution**: Simple UPDATE on participants table.

**Index Utilization**:
- UNIQUE(conversation_id, user_id) - Direct index seek

**Complexity**: O(1).

## Performance Considerations

### Read-Heavy Workload
Messaging applications are read-heavy (viewing conversations/messages) vs write-heavy (sending messages). The schema is optimized for reads:
- Composite indexes on common query patterns
- Denormalized fields like `last_read_message_id` to avoid expensive queries
- Separation of concerns (receipts separate from messages)

### Write Performance
- CASCADE operations ensure data integrity but can be slow on bulk deletes
- Consider soft deletes for messages if message history is valuable
- `updated_at` triggers add overhead but are necessary for conversation ordering

### Scalability
- SQLite is suitable for single-server deployment
- For horizontal scaling, consider:
  - PostgreSQL for better concurrent writes
  - Sharding by conversation_id for very large deployments
  - Read replicas for chat history queries

### Index Maintenance
- All indexes are on integer IDs or short strings → low overhead
- No indexes on TEXT fields (content) → avoid index bloat
- UNIQUE constraints serve dual purpose (integrity + index)

## Data Integrity

### Foreign Key Constraints
All relationships have foreign keys with appropriate cascading:
- CASCADE: Delete dependent records when parent is deleted
- SET NULL: Nullify reference when parent is deleted (preserve history)
- RESTRICT: Prevent deletion if dependent records exist (not used here)

### Unique Constraints
Prevent data duplication:
- Email/phone uniqueness for users
- One contact per user-contact pair
- One participant per user-conversation pair
- One receipt per user-message pair

### Check Constraints
Not explicitly used but could add:
- Email format validation
- Phone number format validation
- Role enum (admin/member only)

## Future Extensibility

### Planned Features
The schema supports these future features:
- **Message reactions**: Already has `reaction` field
- **Disappearing messages**: Already has `disappears_at` field
- **Message threading**: Already has `reply_to_id` field
- **Message types**: Already has `message_type` field
- **Read receipts**: Already has message_receipts table

### Possible Extensions
- **Message encryption**: Add `encrypted_content` field, keep `content` for key escrow
- **Message edits**: Add `edited_at` field, store edit history in separate table
- **Message deletes**: Add `deleted_at` field (soft delete)
- **Conversation archiving**: Add `archived_at` field in participants
- **Pinned messages**: Add `pinned_message_id` in conversations
- **Message reactions count**: Add reaction counts cache in messages
- **Message attachments**: Separate table for attachments (files, images)

## Summary

The database schema is designed to:
1. Support all required features efficiently
2. Maintain data integrity through constraints
3. Optimize for common query patterns
4. Scale to reasonable user/message counts
5. Remain extensible for future features

Key optimizations:
- `last_read_message_id` for efficient unread counts
- Composite index on `(conversation_id, created_at)` for message retrieval
- Separate receipt table for delivery/read tracking
- Unified conversation table with type flag for simplified queries

The schema balances normalization (no data duplication) with performance (strategic denormalization where beneficial), following database design best practices for messaging applications.

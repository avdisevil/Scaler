# Signal Clone

A Signal-inspired secure messaging platform built for an SDE Fullstack assignment. Features real-time messaging, group chats, and OTP-based authentication.

## Tech Stack

### Backend
- **Framework**: FastAPI
- **Database**: SQLite with SQLAlchemy ORM
- **Real-time**: WebSockets
- **Authentication**: JWT tokens with mocked OTP verification
- **Python Version**: 3.13+

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: React Context API

## Features

### Authentication
- ✅ Phone-based registration with mocked OTP verification
- ✅ JWT-based session management
- ✅ Session persistence with refresh tokens
- ✅ Profile setup (display name, avatar)
- ✅ Logout functionality

### Contacts & Conversations
- ✅ User search by phone
- ✅ Add/remove contacts
- ✅ Conversation list with latest activity ordering
- ✅ Search conversations
- ✅ Unread message indicators
- ✅ Last message preview
- ✅ Online/last-seen status

### Direct Messaging
- ✅ Real-time one-to-one messaging via WebSocket
- ✅ Persistent message history
- ✅ Message timestamps
- ✅ Message status tracking (sending, sent, delivered, read)
- ✅ Delivery receipts
- ✅ Read receipts
- ✅ Typing indicators

### Groups
- ✅ Create group with name and members
- ✅ Group messaging to all members
- ✅ Group member list view
- ✅ Add members (admin-only)
- ✅ Remove members (admin-only)
- ✅ Admin controls and authorization
- ✅ Persistent group data and messages

### Signal Experience
- ✅ Conversation list + chat pane layout
- ✅ Signal-inspired message bubbles
- ✅ Forms with validation
- ✅ Modals (new message, create group, group members, settings)
- ✅ Search functionality
- ✅ Toast notifications
- ✅ Settings placeholders with functional profile editing
- ✅ Responsive design (mobile, tablet, desktop)

## Free-tier deployment

The repository includes a Render Blueprint for the frontend and API. The API uses Neon Postgres because Render's free service filesystem is temporary. Free-tier services can sleep while idle, so the first request after inactivity may take a little longer.

1. Create a free Postgres project at [Neon](https://neon.tech/) and copy its connection string. Use the `postgresql+psycopg://` scheme (instead of `postgresql://`) and retain the `sslmode=require` query parameter.
2. Sign in to [Render](https://render.com/) and create a Blueprint from this repository. Render reads `render.yaml` and creates the frontend and API services.
3. When prompted, set `DATABASE_URL` to the Neon connection string. Render generates `JWT_SECRET_KEY` for the API.
4. After both services finish deploying, open the `scaler-web` service URL.

The frontend and API use `https://scaler-web.onrender.com` and `https://scaler-api.onrender.com`. If Render assigns different service URLs, update `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_WS_URL` in the corresponding service settings and redeploy.

## Project Structure

```
Scaler/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── config.py            # Configuration management
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── dependencies.py      # FastAPI dependencies (auth)
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── contact.py
│   │   │   ├── conversation.py
│   │   │   ├── participant.py
│   │   │   ├── message.py
│   │   │   └── message_receipt.py
│   │   ├── schemas/             # Pydantic schemas
│   │   │   ├── user.py
│   │   │   ├── auth.py
│   │   │   ├── conversation.py
│   │   │   ├── message.py
│   │   │   ├── participant.py
│   │   │   └── contact.py
│   │   ├── routers/             # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── conversations.py
│   │   │   └── messages.py
│   │   ├── services/            # Business logic layer
│   │   │   ├── auth_service.py
│   │   │   ├── user_service.py
│   │   │   ├── conversation_service.py
│   │   │   ├── message_service.py
│   │   │   └── otp_service.py
│   │   ├── repositories/         # Data access layer
│   │   │   ├── user_repository.py
│   │   │   ├── contact_repository.py
│   │   │   ├── conversation_repository.py
│   │   │   └── message_repository.py
│   │   ├── websocket/           # WebSocket management
│   │   │   ├── manager.py
│   │   │   └── router.py
│   │   └── seed_data.py         # Database seeding script
│   ├── tests/                   # Backend tests
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home/redirect page
│   │   ├── login/
│   │   │   └── page.tsx         # Login page
│   │   ├── profile-setup/
│   │   │   └── page.tsx         # Profile setup page
│   │   ├── conversations/
│   │   │   ├── page.tsx         # Conversation list
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Conversation detail
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                  # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Avatar.tsx
│   │   │   └── Icons.tsx
│   │   ├── layout/
│   │   │   └── AppShell.tsx    # Main application shell
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── ProfileSetupForm.tsx
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ChatHeader.tsx
│   │   │   ├── MessageArea.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageComposer.tsx
│   │   │   └── EmptyChatState.tsx
│   │   ├── conversations/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SidebarHeader.tsx
│   │   │   ├── ConversationList.tsx
│   │   │   └── ConversationItem.tsx
│   │   └── modals/
│   │       ├── NewMessageModal.tsx
│   │       ├── CreateGroupModal.tsx
│   │       ├── GroupMembersModal.tsx
│   │       └── SettingsModal.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx      # Authentication state
│   │   ├── WebSocketContext.tsx # WebSocket state
│   │   └── ToastContext.tsx     # Toast notifications
│   ├── lib/
│   │   ├── api.ts               # Centralized API client
│   │   └── websocket.ts         # WebSocket client
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── .env
└── README.md
```

## Database Schema

The database uses a normalized schema with proper relationships, indexes, and constraints to support efficient queries for a messaging application.

### Tables

#### `users`
User account table storing profile information. Uses OTP-based authentication (no password required).

|| Column | Type | Constraints | Description |
||--------|------|-------------|-------------|
|| id | Integer | PRIMARY KEY, INDEX | Unique user identifier |
|| phone | String(20) | UNIQUE, NOT NULL, INDEX | User phone for OTP-based authentication |
|| email | String(255) | UNIQUE, NULLABLE, INDEX | Optional user email |
|| password_hash | String(255) | NULLABLE | Optional bcrypt hashed password (not used in OTP flow) |
|| display_name | String(100) | NULLABLE | User's display name (set during profile setup) |
|| avatar_url | Text | NULLABLE | URL to user's avatar image |
|| is_verified | Boolean | NOT NULL, DEFAULT FALSE | Phone verification status via OTP |
|| is_online | Boolean | NOT NULL, DEFAULT FALSE, INDEX | Current online status |
|| last_seen_at | DateTime | NULLABLE | Last time user was seen online |
|| registration_complete | Boolean | NOT NULL, DEFAULT FALSE, INDEX | True after profile setup |
|| created_at | DateTime | NOT NULL, DEFAULT NOW() | Account creation timestamp |
|| updated_at | DateTime | NOT NULL, DEFAULT NOW(), ON UPDATE | Last profile update timestamp |

**Indexes**:
- `phone` (unique) - Fast login by phone
- `email` (unique) - User email lookup
- `display_name` - Search users by name
- `is_online` - Filter online users
- `registration_complete` - Filter users who completed setup

**Relationships**:
- One-to-many with `contacts` (as owner)
- One-to-many with `contacts` (as contact of others)
- One-to-many with `participants` (conversations user is in)
- One-to-many with `messages` (messages sent by user)
- One-to-many with `message_receipts` (receipts for messages sent to user)

#### `sessions`
Session table for managing user sessions and refresh tokens.

|| Column | Type | Constraints | Description |
||--------|------|-------------|-------------|
|| id | Integer | PRIMARY KEY, INDEX | Unique session identifier |
|| session_id | String(255) | UNIQUE, NOT NULL, INDEX | Hashed session token/refresh token |
|| user_id | Integer | NOT NULL, FK(users.id, CASCADE) | User who owns this session |
|| device_info | String(255) | NULLABLE | User agent or device identifier |
|| ip_address | String(45) | NULLABLE | IPv4 or IPv6 address |
|| expires_at | DateTime | NOT NULL, INDEX | Session expiration time |
|| created_at | DateTime | NOT NULL, DEFAULT NOW() | Session creation timestamp |
|| last_used_at | DateTime | NOT NULL, DEFAULT NOW(), ON UPDATE | Last activity timestamp |

**Indexes**:
- `session_id` (unique) - Fast session lookup
- `user_id` - Get all sessions for a user
- `expires_at` - Find expired sessions for cleanup

**Cascading**: When a user is deleted, all their sessions are deleted (CASCADE).

#### `contacts`
Contact table representing a user's address book.

|| Column | Type | Constraints | Description |
||--------|------|-------------|-------------|
|| id | Integer | PRIMARY KEY, INDEX | Unique contact identifier |
|| user_id | Integer | NOT NULL, FK(users.id, CASCADE) | Owner of this contact entry |
|| contact_user_id | Integer | NOT NULL, FK(users.id, CASCADE) | User being added as contact |
|| display_name | String(100) | NULLABLE | Custom nickname for contact |
|| created_at | DateTime | NOT NULL, DEFAULT NOW() | When contact was added |

**Indexes**:
- UNIQUE(user_id, contact_user_id) - Prevent duplicate contacts
- `user_id` - Get user's contact list
- `contact_user_id` - Find users who have this person as contact

**Cascading**: When either user is deleted, the contact entry is deleted (CASCADE).

#### `conversations`
Conversation table for both direct messages and group chats.

|| Column | Type | Constraints | Description |
||--------|------|-------------|-------------|
|| id | Integer | PRIMARY KEY, INDEX | Unique conversation identifier |
|| name | String(100) | NULLABLE | Group name (NULL for direct messages) |
|| is_group | Boolean | NOT NULL, DEFAULT FALSE, INDEX | TRUE for groups, FALSE for direct |
|| avatar_url | Text | NULLABLE | Group avatar image URL |
|| created_by | Integer | NULLABLE, FK(users.id, SET NULL) | User who created the group |
|| created_at | DateTime | NOT NULL, DEFAULT NOW() | Conversation creation timestamp |
|| updated_at | DateTime | NOT NULL, DEFAULT NOW(), ON UPDATE, INDEX | Last activity timestamp |

**Indexes**:
- `is_group` - Filter conversations by type
- `updated_at` - Order conversations by activity
- `created_by` - Find groups created by a user

**Cascading**: When creator is deleted, created_by is set to NULL (SET NULL) to preserve conversation history.

#### `participants`
Participant table tracking conversation membership and read status.

|| Column | Type | Constraints | Description |
||--------|------|-------------|-------------|
|| id | Integer | PRIMARY KEY, INDEX | Unique participant identifier |
|| conversation_id | Integer | NOT NULL, FK(conversations.id, CASCADE) | Conversation user is in |
|| user_id | Integer | NOT NULL, FK(users.id, CASCADE) | User in the conversation |
|| role | String(20) | NOT NULL, DEFAULT "member", INDEX | "admin" or "member" |
|| last_read_message_id | Integer | NULLABLE, FK(messages.id, SET NULL) | Last message user has read |
|| joined_at | DateTime | NOT NULL, DEFAULT NOW() | When user joined conversation |

**Indexes**:
- UNIQUE(conversation_id, user_id) - Prevent duplicate membership
- `conversation_id` - Get all participants in a conversation
- `user_id` - Get all conversations for a user
- `role` - Filter participants by role

**Cascading**: When conversation or user is deleted, participant entry is deleted (CASCADE). When last_read_message is deleted, set to NULL (SET NULL).

#### `messages`
Message table storing all chat messages.

|| Column | Type | Constraints | Description |
||--------|------|-------------|-------------|
|| id | Integer | PRIMARY KEY, INDEX | Unique message identifier |
|| conversation_id | Integer | NOT NULL, FK(conversations.id, CASCADE) | Conversation message belongs to |
|| sender_id | Integer | NOT NULL, FK(users.id, CASCADE) | User who sent the message |
|| content | Text | NOT NULL | Message content |
|| message_type | String(20) | NOT NULL, DEFAULT "text" | "text", "image", "video", etc. |
|| reply_to_id | Integer | NULLABLE, FK(messages.id, SET NULL) | Message being replied to |
|| status | String(20) | NOT NULL, DEFAULT "sending", INDEX | "sending", "sent", "delivered", "read" |
|| reaction | String(50) | NULLABLE | Emoji reaction to message |
|| disappears_at | DateTime | NULLABLE | For disappearing messages |
|| created_at | DateTime | NOT NULL, DEFAULT NOW() | Message creation timestamp |
|| updated_at | DateTime | NOT NULL, DEFAULT NOW(), ON UPDATE | Last update timestamp |

**Indexes**:
- `conversation_id, created_at` (composite) - Get messages for conversation in order
- `sender_id` - Get messages sent by user
- `status` - Find messages by status
- `reply_to_id` - Find replies to a message

**Cascading**: When conversation or sender is deleted, message is deleted (CASCADE). When replied-to message is deleted, reply_to_id set to NULL (SET NULL).

#### `message_receipts`
MessageReceipt table tracking delivery and read acknowledgments.

|| Column | Type | Constraints | Description |
||--------|------|-------------|-------------|
|| id | Integer | PRIMARY KEY, INDEX | Unique receipt identifier |
|| message_id | Integer | NOT NULL, FK(messages.id, CASCADE) | Message being acknowledged |
|| user_id | Integer | NOT NULL, FK(users.id, CASCADE) | User acknowledging the message |
|| status | String(20) | NOT NULL, INDEX | "delivered" or "read" |
|| timestamp | DateTime | NOT NULL, DEFAULT NOW() | When receipt was created |

**Indexes**:
- UNIQUE(message_id, user_id) - One receipt per user per message (latest wins)
- `message_id` - Get all receipts for a message
- `user_id` - Get all receipts for a user
- `status` - Filter receipts by status

**Cascading**: When message or user is deleted, receipt is deleted (CASCADE).

## API Endpoints

### Authentication
- `POST /api/auth/request-otp` - Request OTP for phone number
- `POST /api/auth/verify-otp` - Verify OTP and receive tokens
- `POST /api/auth/complete-profile` - Complete profile setup
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token

### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `GET /api/users/search?q={query}` - Search users by phone or display name
- `POST /api/users/contacts` - Add contact
- `GET /api/users/contacts` - Get user contacts
- `DELETE /api/users/contacts/{id}` - Delete contact

### Conversations
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Create conversation (direct or group)
- `GET /api/conversations/{id}` - Get conversation details
- `PUT /api/conversations/{id}` - Update conversation
- `DELETE /api/conversations/{id}` - Delete conversation
- `GET /api/conversations/{id}/participants` - Get participants
- `POST /api/conversations/{id}/participants` - Add participant
- `DELETE /api/conversations/{id}/participants/{user_id}` - Remove participant
- `PUT /api/conversations/{id}/participants/{user_id}/role` - Update participant role

### Messages
- `GET /api/conversations/{id}/messages` - Get conversation messages
- `POST /api/conversations/{id}/messages` - Send message

### Health
- `GET /health` - Health check endpoint

## WebSocket Events

### Client → Server
- `send_message` - Send a message to a conversation
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `subscribe_conversation` - Subscribe to conversation updates
- `unsubscribe_conversation` - Unsubscribe from conversation
- `mark_read` - Mark conversation as read

### Server → Client
- `message_new` - New message received
- `message_status` - Message status update
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `presence_update` - User presence change

## Authentication Flow

1. **OTP Request**: User enters phone number → Backend generates mocked OTP (always `123456`) → Returns success
2. **OTP Verification**: User enters OTP → Backend verifies → Returns JWT access token and refresh token
3. **Profile Setup**: User sets display name and avatar → Backend updates user record → Sets `registration_complete = True`
4. **Session Management**: Access token stored in memory, refresh token in localStorage → Automatic token refresh
5. **Logout**: Refresh token invalidated → Session deleted → Redirect to login

**Note**: OTP is mocked for development. In production, this would use SMS/email delivery.

## Setup Instructions

### Prerequisites
- Python 3.13+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Initialize the database:
```bash
python -c "from app.database import engine, Base; Base.metadata.create_all(bind=engine)"
```

5. Seed the database with sample data:
```bash
python -m app.seed_data
```

6. Run the backend server:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Sample Users

After running the seed script, you can use these phone numbers with the mocked OTP `123456`:

|| Display Name | Phone |
||--------------|-------|
|| Alice Johnson | +1234567890 |
|| Bob Smith | +1234567891 |
|| Charlie Brown | +1234567892 |
|| Diana Prince | +1234567893 |
|| Eve Williams | +1234567894 |

The seed script also creates:
- Direct conversations between Alice ↔ Bob and Alice ↔ Charlie
- A group conversation "Project Team" with Alice, Bob, Charlie, and Diana
- Sample messages with varying read statuses

## Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Frontend Typecheck
```bash
cd frontend
npm run type-check
```

### Frontend Lint
```bash
cd frontend
npm run lint
```

### Frontend Production Build
```bash
cd frontend
npm run build
```

## Production Build

### Backend
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm run build
npm start
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=sqlite:///./signal_clone.db
JWT_SECRET_KEY=your-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=http://localhost:3000
APP_NAME=Signal Clone
APP_VERSION=1.0.0
DEBUG=True
```

### Frontend (.env)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Deployment Notes

### SQLite Considerations
- SQLite stores data in a single file (`signal_clone.db`)
- In cloud environments with ephemeral filesystems (e.g., Heroku, some Kubernetes configs), the database may be lost on redeploy
- For production deployment to such environments, consider:
  - Using a persistent volume / storage
  - Migrating to PostgreSQL or MySQL
  - Using a managed database service

### CORS Configuration
- The `FRONTEND_URL` environment variable must be set to the actual frontend URL in production
- For multiple origins, modify the CORS configuration in `backend/app/main.py`

### Security Notes
- Change `JWT_SECRET_KEY` to a strong random value in production
- Set `DEBUG=False` in production
- Use HTTPS in production
- The mocked OTP system is for development only - replace with real SMS/email delivery in production

## Assumptions

1. **Mocked OTP**: The OTP verification is mocked (always accepts `123456`) for development purposes. A production system would use SMS/email delivery.

2. **Simulated Encryption**: The UI displays "end-to-end encrypted" badges for the Signal experience, but no actual encryption is implemented. This is appropriate for a mock assignment.

3. **SQLite Database**: SQLite is used for simplicity. This is acceptable for the assignment but may not be suitable for all production deployments.

4. **No Production Auth**: No OAuth, no third-party identity providers, no device verification beyond JWT tokens.

## Limitations

1. **No Real Encryption**: Messages are stored in plain text in the database. No actual end-to-end encryption is implemented.

2. **Mocked OTP**: The OTP system is mocked and does not send real SMS or email messages.

3. **SQLite Ephemeral Storage**: In cloud environments with ephemeral filesystems, the SQLite database may be lost on redeploy.

4. **No Media Support**: The schema has fields for message attachments but they are not implemented in the UI or API.

5. **No Reply/Reaction Support**: The schema has fields for replies and reactions but they are not implemented in the UI.

6. **No Disappearing Messages**: The schema has a field for disappearing messages but it is not implemented.

7. **No Device Management**: No multi-device support or device verification.

8. **No Dark Mode**: Only light theme is implemented.

9. **No Voice/Video Calls**: No real-time audio/video calling functionality.

10. **No Stories**: No ephemeral story posts.

## Architecture Principles

### Backend
- **Layered Architecture**: Routers → Services → Repositories → Models
- **FastAPI Dependency Injection**: Used for authentication and database sessions
- **WebSocket Manager**: Centralized connection tracking for real-time features
- **Pydantic Schemas**: Request/response validation
- **SQLAlchemy ORM**: Database abstraction with proper relationships

### Frontend
- **Component-Based**: Reusable UI components
- **Context API**: Global state for authentication, WebSocket, and toasts
- **TypeScript**: Type safety throughout
- **Axios Interceptors**: Centralized API error handling and token injection
- **Responsive Design**: Mobile-first with Tailwind CSS

### Database
- **Normalized Schema**: Proper foreign keys and relationships
- **Indexes**: Optimized for common query patterns
- **Cascading Deletes**: Referential integrity
- **Constraints**: Unique constraints to prevent duplicates

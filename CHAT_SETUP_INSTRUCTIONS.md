# Chat System Setup Instructions

## Database Migration

Run the following SQL migration on your PostgreSQL database to create the chat system tables:

```sql
-- Execute the contents of: backend/migrations/create_chat_system_tables.sql
```

Or run this command when your database is accessible:
```bash
cd backend
psql $DATABASE_URL -f migrations/create_chat_system_tables.sql
```

## Backend Setup

The chat system backend is already integrated:
- ✅ Chat controller: `backend/controllers/chatController.js`
- ✅ Chat routes: `backend/routes/chat.js`
- ✅ Routes added to server.js

## Frontend Setup

### Web Interface
- ✅ User chat page: `frontend/pages/destek.tsx`
- ✅ Admin chat integration: Updated `frontend/src/app/admin/dashboard/page.tsx`

### Mobile Interface
- ✅ Mobile chat screen: `LingRootMobile/src/screens/ChatScreen.tsx`

## API Endpoints

### User Endpoints
- `GET /api/chat/conversations` - Get user's conversations
- `POST /api/chat/conversations` - Create new conversation
- `GET /api/chat/conversations/:id/messages` - Get conversation messages
- `POST /api/chat/conversations/:id/messages` - Send message

### Admin Endpoints
- `GET /api/chat/admin/conversations` - Get all conversations (with filters)
- `PUT /api/chat/admin/conversations/:id` - Update conversation status/priority
- `GET /api/chat/admin/stats` - Get conversation statistics

## Usage

### For Users (Web)
1. Navigate to `/destek` page
2. Click "Yeni Talep" to create a new support request
3. Fill in subject and message
4. Chat with admin in WhatsApp-like interface

### For Users (Mobile)
1. Navigate to ChatScreen component
2. Create new conversation or select existing one
3. Send messages in real-time chat interface

### For Admins
1. Go to Admin Dashboard → Destek section
2. View all conversations with filters (status, priority)
3. Click on conversation to view messages
4. Reply to users and update conversation status
5. Change priority levels as needed

## Features

- ✅ Real-time messaging between users and admin
- ✅ WhatsApp-like chat interface
- ✅ Conversation status management (open, in_progress, waiting, resolved, closed)
- ✅ Priority levels (low, medium, high, urgent)
- ✅ Unread message indicators
- ✅ Message history preservation
- ✅ Mobile-responsive design
- ✅ Admin conversation filtering and management

## Database Schema

### conversations table
- id (UUID, primary key)
- user_id (UUID, foreign key to users)
- subject (VARCHAR)
- status (ENUM: open, in_progress, waiting, resolved, closed)
- priority (ENUM: low, medium, high, urgent)
- admin_id (UUID, foreign key to users - which admin is handling)
- created_at, updated_at, last_message_at (timestamps)

### messages table
- id (UUID, primary key)
- conversation_id (UUID, foreign key to conversations)
- sender_id (UUID, foreign key to users)
- sender_type (ENUM: user, admin)
- content (TEXT)
- is_read (BOOLEAN)
- created_at, updated_at (timestamps)

### message_attachments table (for future file uploads)
- id (UUID, primary key)
- message_id (UUID, foreign key to messages)
- filename, file_path, file_size, mime_type
- created_at (timestamp)

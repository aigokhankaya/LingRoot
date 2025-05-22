# LingRoot Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-goes-here

# JWT Configuration
JWT_SECRET=lingroot-secure-jwt-secret-change-in-production

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5001

# Development Settings
# USE_MOCK_DB=true # Uncomment to use mock database in development
```

## Supabase Database Setup

1. Create a Supabase project at [https://supabase.com](https://supabase.com)

2. Create a `users` table with the following schema:
   
   ```sql
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     first_name VARCHAR(100),
     last_name VARCHAR(100),
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     phone_number VARCHAR(20),
     role VARCHAR(20) NOT NULL DEFAULT 'user',
     membership_status VARCHAR(20) NOT NULL DEFAULT 'free',
     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
     last_login TIMESTAMP WITH TIME ZONE
   );
   ```

3. Update your `.env.local` file with the Supabase URL and service key from your project settings.

## Running the Application

1. Install dependencies:
   
   ```bash
   npm install
   ```

2. Start the development server:
   
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing the Registration System

1. Install node-fetch if you haven't already:
   
   ```bash
   npm install node-fetch
   ```

2. Start the development server:
   
   ```bash
   npm run dev
   ```

3. In a separate terminal, run the test script:
   
   ```bash
   node test-register.js
   ```

This script will test:
- Valid registration with a unique email
- Duplicate email registration (should fail)
- Invalid data registration (should fail)

## Authentication Flow

The authentication system uses JWT tokens stored in localStorage for persistent sessions. The registration system is now connected to your Supabase database and will create real user accounts.

In development mode, you can enable the mock database by setting `USE_MOCK_DB=true` in your `.env.local` file. This will bypass the Supabase connection and create mock users for testing. 
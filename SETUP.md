# Quick Setup Guide

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. **Create Supabase Project**

   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to be fully initialized

2. **Get Your Credentials**

   - In your Supabase dashboard, click the **gear icon** (⚙️) in the left sidebar to open **Project Settings**
   - Click on **API** in the settings menu
   - You'll see:
     - **Project URL** - Copy this entire URL
     - **anon public** key - Copy this key (it's the public anonymous key, safe for client-side use)
   - ⚠️ **Note:** Do NOT use the `service_role` key - that's for server-side only and should be kept secret!

3. **Create Environment File**
   - Create a `.env` file in the root directory
   - Add your credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 3. Set Up Database

1. **Open SQL Editor in Supabase**

   - Go to SQL Editor in your Supabase dashboard
   - Click "New Query"

2. **Run the Schema Script**

   - Copy the contents of `database/schema.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

3. **Verify Tables**
   - Go to Table Editor
   - You should see three tables: `users`, `parking_spaces`, and `bookings`

### 4. Configure Authentication (Optional)

The schema includes automatic user profile creation. When a user signs up through the app, a profile will be automatically created in the `users` table.

### 5. Start the App

```bash
npm start
```

Then:

- Press `a` for Android
- Press `i` for iOS
- Press `w` for Web
- Scan the QR code with Expo Go app on your phone

## Troubleshooting

### "Cannot find module" errors

- Make sure you've run `npm install`
- Delete `node_modules` and `.expo` folders, then run `npm install` again

### Supabase connection errors

- Verify your `.env` file has the correct credentials
- Make sure the `.env` file is in the root directory
- Restart the Expo server after creating/updating `.env`

### Database errors

- Make sure you've run the SQL schema script
- Check that Row Level Security (RLS) policies are enabled
- Verify your Supabase project is fully initialized

### Map not showing

- For iOS: Maps should work out of the box
- For Android: You may need to add a Google Maps API key in `app.json`
- For Web: Maps may have limited functionality

## Next Steps

1. Test the authentication flow
2. Add a test parking space
3. Test the booking functionality
4. Customize the UI to match your design preferences

## Notes

- The app uses Expo's managed workflow
- All backend functionality is handled by Supabase
- No custom backend server needed
- Payment integration is planned for future updates

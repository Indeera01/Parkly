# Supabase Authentication Setup - One-Time Signup

This guide explains how to configure Supabase for one-time signup without email verification (like Uber/Facebook/Instagram).

## Supabase Dashboard Configuration

### Step 1: Disable Email Confirmation

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Settings** (or **Auth** → **Settings**)
3. Find the **Email Auth** section
4. **Disable** the following:
   - ✅ **"Enable email confirmations"** - Turn this OFF
   - ✅ **"Secure email change"** - Can be OFF for simpler flow
5. Save the changes

### Step 2: Configure Email Templates (Optional)

If you want to customize email templates (even though confirmation is disabled):

1. Go to **Authentication** → **Email Templates**
2. You can customize the templates, but they won't be sent if confirmation is disabled

### Step 3: Session Settings

1. Go to **Authentication** → **Settings**
2. Under **Session Settings**:
   - **JWT expiry**: Set to a longer duration (e.g., 7 days, 30 days, or 1 year)
   - This determines how long users stay logged in
   - Default is usually 1 hour, which is too short for "one-time signup"

### Step 4: Row Level Security (RLS)

Make sure RLS policies allow users to:

- Insert their own profile on signup
- Read their own data
- Update their own data

The `database/schema.sql` already includes these policies, but verify they're active.

## How It Works

### Signup Flow

1. User enters email, password, and name
2. Account is created immediately (no email confirmation)
3. User profile is created in the `users` table
4. User is automatically signed in
5. Session is saved to AsyncStorage (persists across app restarts)

### Login Flow

1. User enters email and password
2. If credentials are valid, session is created
3. Session persists in AsyncStorage
4. User stays logged in until they explicitly sign out

### Session Persistence

- Sessions are stored in AsyncStorage (device storage)
- Sessions persist across app restarts
- Sessions auto-refresh when they expire
- User only needs to sign in once (unless they sign out)

## Testing

1. **Test Signup**:

   - Create a new account
   - Should immediately be logged in
   - Close and reopen app - should still be logged in

2. **Test Login**:

   - Sign out
   - Sign in with existing credentials
   - Should stay logged in

3. **Test Persistence**:
   - Sign in
   - Close app completely
   - Reopen app
   - Should still be logged in

## Troubleshooting

### User Created But Not Logged In

- Check Supabase settings: Email confirmation should be disabled
- Check browser console/terminal for errors
- Verify RLS policies allow user to read their own data

### Session Not Persisting

- Check that `persistSession: true` is set in `services/supabase.ts`
- Verify AsyncStorage is working (check device storage permissions)
- Check JWT expiry settings in Supabase dashboard

### "Email not confirmed" Error

- Make sure email confirmation is disabled in Supabase dashboard
- Check Authentication → Settings → Email Auth
- Restart the app after changing settings

## Security Considerations

⚠️ **Important Notes**:

1. **No Email Verification**: Users can sign up with any email (even fake ones)

   - Consider adding phone number verification if needed
   - Or implement email verification as optional later

2. **Password Security**:

   - Supabase enforces minimum password requirements by default
   - Consider adding additional password strength requirements

3. **Session Security**:

   - Sessions are stored locally on device
   - If device is compromised, sessions can be accessed
   - Consider adding biometric authentication for sensitive operations

4. **Account Recovery**:
   - Without email verification, password reset might be less secure
   - Consider implementing phone-based recovery

## Alternative: Phone Number Authentication

If you want to use phone numbers instead of email:

1. Enable Phone Auth in Supabase
2. Update the signup/login screens to use phone numbers
3. Phone verification is typically required (OTP)

This is more secure but requires SMS service (costs money).

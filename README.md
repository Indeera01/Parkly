# Parkly

A mobile application for sharing and booking private parking spaces in urban areas.

Project of the 7th semester mobile computing project.

## Why a Cross Platform App?

- To enable reliable notifications
- To reduce loading time
- Considering future payment integrations
- To provide scheduled notifications
- Better location support
- Camera access for location images (Future)
- Geo fencing capabilities for users (Future)
- Avoid the dependancy on browser

## Tech Stack

- **React Native** with **Expo** - Cross-platform mobile development
- **TypeScript** - Type-safe development
- **Supabase** - Backend (Authentication, Database, APIs)
- **React Navigation** - Navigation between screens
- **React Native Maps** - Map integration for parking locations
- **Expo Location** - Location services

## Project Structure

```
Parkly/
├── App.tsx                 # Main app entry point
├── navigation/             # Navigation configuration
│   └── AppNavigator.tsx
├── screens/                # All screen components
│   ├── LoginScreen.tsx
│   ├── MapScreen.tsx
│   ├── SpaceDetailScreen.tsx
│   ├── BookingsScreen.tsx
│   ├── AddSpaceScreen.tsx
│   └── ManageListingsScreen.tsx
├── contexts/               # React contexts
│   └── AuthContext.tsx
├── services/               # External services
│   └── supabase.ts
├── types/                  # TypeScript type definitions
│   └── index.ts
└── assets/                 # Images and other assets
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account (free tier works)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. In your Supabase dashboard, go to **Project Settings** (gear icon) → **API**
3. You'll find:
   - **Project URL** - Copy this value
   - **anon public** key - Copy this value (this is the public anonymous key, safe for client-side use)
4. Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Database Schema

Run the SQL script in `database/schema.sql` in your Supabase SQL Editor to create the necessary tables:

- `users` - User profiles
- `parking_spaces` - Parking space listings
- `bookings` - Booking records

### 4. Configure Google Maps (Optional but Recommended)

For better map functionality, you may want to add a Google Maps API key:

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Add it to `app.json` under the `android` and `ios` sections

### 5. Run the App

#### For iPhone (Physical Device - Recommended)

1. **Install Expo Go** on your iPhone from the App Store
2. **Start the development server**:
   ```bash
   npm start
   ```
3. **Connect your iPhone**:
   - Make sure your iPhone and laptop are on the same Wi-Fi network
   - Open Expo Go app on your iPhone
   - Scan the QR code shown in the terminal/browser
   - Or manually enter the URL shown in the terminal

#### For Other Platforms

```bash
# Start the Expo development server
npm start

# Then choose:
# - Press 'i' for iOS (requires macOS)
# - Press 'a' for Android (requires Android Studio/emulator)
# - Press 'w' for web browser
```

**Note:** For detailed setup instructions, especially for Windows + iPhone development, see [DEVELOPMENT.md](./DEVELOPMENT.md)

## Authentication

The app uses **one-time signup** (like Uber/Facebook/Instagram):

- ✅ No email verification required
- ✅ Users are automatically logged in after signup
- ✅ Sessions persist across app restarts
- ✅ Users stay logged in until they explicitly sign out

**Important**: You need to configure Supabase to disable email confirmation. See [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md) for detailed instructions.

## Features

### Current (MVP)

- ✅ User authentication (Sign up/Sign in)
- ✅ Map-based search for nearby parking spots
- ✅ View parking space details
- ✅ Booking system (select time & confirm reservation)
- ✅ Manage bookings (view and cancel)
- ✅ List parking spaces (add, edit, delete)
- ✅ Manage listings (activate/deactivate)

### Future Enhancements

- Payment integration
- Push notifications
- Image uploads for parking spaces
- Advanced search filters
- Reviews and ratings
- Real-time availability updates

## Database Schema

The app uses three main tables:

1. **users** - Stores user profile information
2. **parking_spaces** - Stores parking space listings with location, pricing, and availability
3. **bookings** - Stores booking records linking users to parking spaces

See `database/schema.sql` for the complete schema.

## Environment Variables

Make sure to set up your `.env` file with:

- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Development

The app uses:

- **Expo Router** for navigation (though currently using React Navigation for more control)
- **TypeScript** for type safety
- **Supabase** for backend services

## Contributing

This is a semester project. Contributions and improvements are welcome!

## License

This project is for educational purposes.

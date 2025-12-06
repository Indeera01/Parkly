# Development Guide - Windows + iPhone

This guide explains how to develop and test the Parkly app on a Windows laptop with an iPhone.

## Prerequisites

### On Windows Laptop

1. **Node.js** (v16 or higher)

   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version` and `npm --version`

2. **Git** (optional but recommended)

   - Download from [git-scm.com](https://git-scm.com/)

3. **Code Editor**
   - [Visual Studio Code](https://code.visualstudio.com/) (recommended)
   - Or any editor of your choice

### On iPhone

1. **Expo Go App**
   - Download from the [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - This allows you to run the app without building a native app

## Setup Steps

### 1. Install Dependencies

Open PowerShell or Command Prompt in your project directory:

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Start the Development Server

Run:

```bash
npm start
```

This will:

- Start the Expo development server
- Open a browser window with a QR code
- Show a menu in the terminal

### 4. Connect Your iPhone

You have **two options**:

#### Option A: Using Expo Go (Easiest - Recommended for Development)

1. **Make sure your iPhone and Windows laptop are on the same Wi-Fi network**

2. **Open Expo Go app on your iPhone**

3. **Scan the QR code**:

   - From the terminal menu, press `i` to open in iOS simulator (won't work on Windows)
   - Instead, look at the QR code in the browser window
   - In Expo Go app, tap "Scan QR Code"
   - Point your iPhone camera at the QR code

4. **Alternative - Manual Connection**:

   - In Expo Go app, tap "Enter URL manually"
   - Type the URL shown in the terminal (e.g., `exp://192.168.1.100:8081`)

5. The app will load on your iPhone!

#### Option B: Using Tunnel (If Same Network Doesn't Work)

If your iPhone and laptop aren't on the same network, or if you're having connection issues:

1. In the terminal menu, press `s` to switch to tunnel mode
2. Wait for the tunnel to establish (may take a minute)
3. Scan the new QR code with Expo Go

**Note:** Tunnel mode uses Expo's servers and may be slower, but works from anywhere.

## Development Workflow

### Hot Reloading

- **Automatic**: Changes to your code will automatically reload on your iPhone
- **Manual Refresh**: Shake your iPhone and tap "Reload" in Expo Go
- **Fast Refresh**: React Native's Fast Refresh will preserve component state when possible

### Viewing Logs

1. **In Terminal**: Logs appear in the terminal where you ran `npm start`

2. **In Expo Go**:

   - Shake your iPhone
   - Tap "Show Developer Menu"
   - Tap "Debug Remote JS" to see console logs

3. **In Browser**: The Expo DevTools page shows logs and errors

### Common Commands

```bash
# Start development server
npm start

# Clear cache and restart (if you encounter issues)
npm start -- --clear

# Start with tunnel mode
npm start -- --tunnel

# Start on specific port
npm start -- --port 8082
```

## Troubleshooting

### "Unable to connect to Metro bundler"

**Solution:**

1. Make sure both devices are on the same Wi-Fi network
2. Check Windows Firewall - it may be blocking the connection
3. Try tunnel mode: Press `s` in the terminal menu

### Windows Firewall Issues

If Expo can't connect to your iPhone:

1. Open Windows Defender Firewall
2. Allow Node.js through the firewall
3. Or temporarily disable firewall for testing

### "Network response timed out"

**Solution:**

1. Check your Wi-Fi connection
2. Try tunnel mode (press `s` in terminal)
3. Restart the development server: `Ctrl+C` then `npm start`

### iPhone Can't Find the Server

**Solution:**

1. Make sure you're using the Expo Go app (not Safari)
2. Check that both devices are on the same network
3. Try entering the URL manually in Expo Go
4. Use tunnel mode as a last resort

### App Crashes or Shows Errors

**Solution:**

1. Check the terminal for error messages
2. Shake iPhone → "Show Developer Menu" → "Debug Remote JS"
3. Check browser DevTools for detailed errors
4. Try clearing cache: `npm start -- --clear`

### Location Services Not Working

**Solution:**

1. Make sure you've granted location permissions in Expo Go
2. On iPhone: Settings → Privacy → Location Services → Expo Go → Allow
3. The app will request permission on first use

## Testing on Physical Device vs Simulator

### Using Expo Go (Physical iPhone) ✅ Recommended

**Pros:**

- Test on real hardware
- Test location services, camera, etc.
- See actual performance
- Test on different iOS versions

**Cons:**

- Requires physical device
- Slightly slower than simulator
- Need to be on same network (or use tunnel)

### Using iOS Simulator (Not Available on Windows)

**Note:** iOS Simulator only works on macOS. Since you're on Windows, you cannot use the iOS Simulator.

**Alternatives:**

- Use Expo Go on your iPhone (recommended)
- Use Android Emulator if you have Android Studio installed
- Use Expo web: `npm run web` (limited functionality)

## Building for Production

When you're ready to build a standalone app:

### Using EAS Build (Expo Application Services)

1. Install EAS CLI:

   ```bash
   npm install -g eas-cli
   ```

2. Login:

   ```bash
   eas login
   ```

3. Configure build:

   ```bash
   eas build:configure
   ```

4. Build for iOS:

   ```bash
   eas build --platform ios
   ```

   **Note:** iOS builds require an Apple Developer account ($99/year)

5. Download and install on your iPhone via TestFlight or direct install

## Tips for Efficient Development

1. **Keep Expo Go Open**: Keep the app open while developing for faster reloads

2. **Use Fast Refresh**: Make small, incremental changes to preserve component state

3. **Check Terminal First**: Most errors appear in the terminal before the app

4. **Use Tunnel Sparingly**: Tunnel mode is slower - use same network when possible

5. **Clear Cache When Needed**: If you see weird behavior, clear cache and restart

6. **Test on Real Device**: Always test location features, camera, etc. on real device

## Next Steps

1. Set up your Supabase database (see `SETUP.md`)
2. Start the development server
3. Connect your iPhone via Expo Go
4. Start coding! 🚀

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Go App Store](https://apps.apple.com/app/expo-go/id982107779)

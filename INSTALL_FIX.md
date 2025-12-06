# Fixing Installation Errors

If you're getting dependency resolution errors, follow these steps:

## Step 1: Clean Install

```bash
# Remove old dependencies
rm -rf node_modules package-lock.json

# Install with legacy peer deps (this resolves the React 19 conflicts)
npm install --legacy-peer-deps
```

## Step 2: Fix Expo Dependencies

After the initial install, run:

```bash
npx expo install --fix --legacy-peer-deps
```

## Step 3: Verify

Check that everything is installed correctly:

```bash
npx expo-doctor
```

## Why --legacy-peer-deps?

Expo SDK 54 uses React 19, which is newer and some packages haven't fully updated their peer dependencies yet. The `--legacy-peer-deps` flag tells npm to use the older (more permissive) dependency resolution algorithm, which allows these packages to work together.

## Alternative: Use npm overrides

If you prefer, you can add this to your `package.json`:

```json
"overrides": {
  "@types/react": "~19.1.10"
}
```

But using `--legacy-peer-deps` is usually simpler and works fine.

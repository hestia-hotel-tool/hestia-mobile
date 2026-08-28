# Fix Metro Cache Error

## The Problem
Metro bundler is still trying to import the deleted modal files (ReturnLaterModal, PromiseTimeModal, RefuseServiceModal) because it cached the old version of the code.

## The Solution
Clear Metro's cache and restart.

---

## Quick Fix (Run These Commands)

```bash
cd /Users/malambi/dev/projects/personal-projects/hestia

# Step 1: Kill all node processes
killall node

# Step 2: Clear Metro cache
rm -rf node_modules/.cache
rm -rf /tmp/metro-*
rm -rf /tmp/haste-*
rm -rf $TMPDIR/react-*

# Step 3: Clear watchman (if installed)
watchman watch-del-all

# Step 4: Start Metro with clean cache
npm start -- --reset-cache
```

---

## Alternative: One-Line Command

```bash
killall node && rm -rf node_modules/.cache /tmp/metro-* /tmp/haste-* $TMPDIR/react-* && watchman watch-del-all && npm start -- --reset-cache
```

---

## What This Does

1. **Kills all node processes** - Stops Metro bundler
2. **Clears Metro cache** - Removes cached JavaScript bundles
3. **Clears temp files** - Removes temporary Metro files
4. **Clears watchman** - Resets file watcher
5. **Restarts Metro** - Starts with fresh cache

---

## After Restarting

1. Wait for Metro to fully start (you'll see "Metro waiting on...")
2. Press `Cmd + R` on iOS Simulator to reload the app
3. The error should be gone!

---

## Why This Happened

The import statements were commented out correctly in the code:

```typescript
// import ReturnLaterModal from '../components/roomDetail/ReturnLaterModal'; // TODO: Implement Return Later modal
// import PromiseTimeModal from '../components/roomDetail/PromiseTimeModal'; // TODO: Implement Promise Time modal
// import RefuseServiceModal from '../components/roomDetail/RefuseServiceModal'; // TODO: Implement Refuse Service modal
```

But Metro bundler cached the old version before the comments were added. Clearing the cache forces Metro to re-read the files and see the commented-out imports.

---

## Verification

After restarting, the app should:
- ✅ Compile without errors
- ✅ Run without crashes
- ✅ Show no "Unable to resolve module" errors

---

**Status**: Cache cleared, ready to restart Metro


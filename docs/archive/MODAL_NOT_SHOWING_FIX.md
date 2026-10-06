# Fix: Modal Not Showing

## Problem
Return Later modal doesn't pop up when clicking "Return Later"

---

## Quick Fix (2 Minutes)

### Run This One Command:

```bash
./FIX_MODAL_NOW.sh
```

Or manually:

```bash
cd /Users/malambi/dev/projects/personal-projects/hestia
killall node
rm -rf node_modules/.cache /tmp/metro-* $TMPDIR/react-*
watchman watch-del-all
npm start -- --reset-cache
```

### Then:
1. Wait for Metro to fully start
2. Press `Cmd + R` in iOS Simulator  
3. Navigate: **All Rooms** → Tap any room → Tap **Status** → Select **"Return Later"**

---

## What You Should See

### In Console:
```
🔵 Return Later selected - opening modal...
🔵 showReturnLaterModal set to TRUE
🟢 ReturnLaterModal rendered, visible: true
```

### On Screen:
A white modal should appear with:
- "Return Later" title (blue-gray)
- Instruction text
- Four suggestion buttons
- AM/PM toggle
- Time picker wheels
- Confirm button

---

## Still Not Working?

### Check Console for Errors

Open **Metro Bundler terminal** and look for:
- ❌ Red error messages
- ❌ "Unable to resolve module"  
- ❌ "Cannot find module"

### If You See Errors:

**Error**: "Unable to resolve module 'ReturnLaterModal'"
**Fix**: Clear cache again, the import is cached

**Error**: Any other error  
**Fix**: Share the full error message

---

## Debug Steps

### 1. Verify Files Exist
```bash
ls -la src/constants/returnLaterModalStyles.ts
ls -la src/components/roomDetail/ReturnLaterModal.tsx
ls -la src/components/roomDetail/TimeSuggestionButton.tsx
```
All should show file sizes (not "No such file")

### 2. Check Console Logs

After clicking "Return Later", check console:
- ✅ See blue messages → Modal is being triggered
- ✅ See green message → Modal is rendering
- ❌ No messages → Click handler not working

### 3. Add Test Button

If modal still doesn't show, add a test button:

Open `src/screens/RoomDetailScreen.tsx`, find line ~420 with `<RoomDetailHeader`, add ABOVE it:

```typescript
<TouchableOpacity
  style={{
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: 'red',
    padding: 20,
    zIndex: 9999,
  }}
  onPress={() => setShowReturnLaterModal(true)}
>
  <Text style={{ color: 'white', fontWeight: 'bold' }}>TEST</Text>
</TouchableOpacity>
```

Save, reload (`Cmd + R`), tap red TEST button.

- ✅ Modal appears → Status button integration issue
- ❌ Modal doesn't appear → Modal component issue

---

## Why This Happens

**Metro Bundler Cache**: When creating new files, Metro sometimes caches the old state where files didn't exist. Clearing cache forces Metro to re-scan all files.

---

## Need Help?

Share these details:

1. **Console output** after clicking "Return Later"
2. **Metro bundler output** (any red errors?)
3. **Test button result** (did red TEST button work?)
4. **File verification** (do all 3 files exist?)

---

**TL;DR**: Run `./FIX_MODAL_NOW.sh`, reload app, try again!


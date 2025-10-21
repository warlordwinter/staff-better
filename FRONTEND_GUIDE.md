# Groups Frontend - What You Should See

## Group Detail Page Layout

When you navigate to a group (click on a group from `/groups`), you should see:

### 1. Header Section
```
[← Back Arrow]  Group Name                    [Add New] [Add Existing] [Message All]
```

- **Back Arrow**: Returns to groups list
- **Group Name**: The name of your group
- **Add New Button** (Green): Adds a blank row to the table for inline editing
- **Add Existing Button** (Blue): Opens modal to select from existing associates
- **Message All Button** (Blue): Send message to all group members

### 2. Quick Add Form (Blue Box)
This is ALWAYS visible, even when there are no members:

```
┌─────────────────────────────────────────────────────────────┐
│ Quick Add New Associate                                     │
│                                                             │
│ [First Name *] [Last Name *] [Phone Number] [Email] [Add Now] │
└─────────────────────────────────────────────────────────────┘
```

**How to use it:**
1. Type first name and last name (required)
2. Optionally add phone and email
3. Click "Add Now"
4. The form clears and the person should appear in the table below

### 3. Associates Table
Shows all members in the group with columns:
- First Name
- Last Name  
- Phone Number
- Email Address
- Actions (Edit, Message, Delete buttons)

### 4. Empty State
When there are no members yet:
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  No associates found in this group.                 │
│  Use the form above to add some!                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Current Status

✅ **Frontend is ready** - All UI elements are in place
❌ **Database table missing** - The `group_members` table needs to be created

### What works NOW (without SQL):
- Page loads and shows the Quick Add form
- You can fill in the form fields
- The UI is fully functional

### What will work AFTER running the SQL:
- Clicking "Add Now" will save the person to the database
- The person will appear in the table
- You can edit, delete, and message group members
- Members will persist when you refresh the page

## Next Steps

1. **Test the UI now** - Go to a group and verify you can see the Quick Add form
2. **Run the SQL** (when ready) - This will enable saving to the database
3. **Test adding members** - After SQL, use the Quick Add form to add people

## Troubleshooting

**If you don't see the Quick Add form:**
- Make sure you're on a group detail page (URL should be `/groups/[some-id]`)
- Check browser console for errors (F12)
- Try hard refresh (Ctrl+Shift+R)

**If "Add Now" doesn't work:**
- This is expected until you run the SQL to create the `group_members` table
- The form will show but saving won't work
- After running the SQL, it will work properly


# Troubleshooting Recent Activity Not Showing

## Possible Issues & Solutions

### 1. No Requests Created Yet
**Symptom**: "Debug: 0 activities found"
**Solution**: Create a test request:
- Go to "Restock" button
- Select a shop
- Create a request with some items
- Go back to home - activity should appear

### 2. Salesman ID Mismatch
**Symptom**: Console shows user ID but no data returned
**Check**: 
- Verify the logged-in user is a salesman
- Check if requests table has `salesman_id` matching the user
**Query to test**:
```sql
SELECT * FROM requests WHERE salesman_id = '<your-user-id>';
```

### 3. Foreign Key Issue with Shops
**Symptom**: Error in console about shops relationship
**Check**:
- Verify shops table exists
- Check if requests have valid `shop_id`
**Fix**: The query should handle missing shops gracefully now

### 4. Database Migration Not Applied
**Symptom**: "relation does not exist" error
**Check**: Ensure all migrations are applied
**Fix**: Run migrations in order

### 5. Auth Issue
**Symptom**: Console shows "No user found"
**Solution**: 
- Log out and log back in
- Check if auth session is valid

## Debug Steps

### Step 1: Check Console Logs
Look for these messages in Expo terminal:
```
Fetching activities for user: <uuid>
Requests data: [array of requests]
Final activities: [array]
```

### Step 2: Check Debug Text
On the mobile app, should show:
```
Debug: X activities found
```

### Step 3: Manual Test Query
Run this in Supabase SQL editor:
```sql
-- Get current user's requests
SELECT 
    r.id,
    r.created_at,
    r.status,
    s.name as shop_name
FROM requests r
LEFT JOIN shops s ON s.id = r.shop_id
WHERE r.salesman_id = '<your-user-id>'
ORDER BY r.created_at DESC
LIMIT 10;
```

### Step 4: Create Test Data
If no activities exist:
1. Go to Shops list
2. Tap on a shop
3. Create a new request
4. Add some items
5. Submit
6. Go back to home

## Expected Behavior

When working correctly:
- Debug line shows: "Debug: 1 activities found" (or more)
- Console shows request data
- Activity appears in the UI with:
  - Icon (📄 for requests)
  - "Request created" or status
  - Shop name
  - Time ago ("Just now", "5m ago", etc.)
  - Status badge (PENDING, etc.)

## Quick Fix Options

### Option 1: Simplify to Just Show Any Request
```typescript
// In fetchStats, use even simpler query:
const { data: requests } = await supabase
    .from('requests')
    .select('*')
    .eq('salesman_id', user.id)
    .limit(5);

// Then process without shop names first
```

### Option 2: Use Mock Data for Testing
```typescript
// Temporarily add mock data:
setRecentActivities([
    {
        id: 'test-1',
        type: 'request',
        action: 'created',
        shopName: 'Test Shop',
        date: new Date().toISOString(),
        status: 'pending'
    }
]);
```

## Next Steps

1. Check the debug count
2. Look at console logs
3. Create a test request if needed
4. Report back what you see

Let me know what the debug line says and I'll fix it immediately!

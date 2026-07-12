# Improved Request History UI Design

## Before vs After Comparison

### ❌ BEFORE (Not Good Looking):
```
┌─────────────────────────────────────────────────┐
│  📄  Stock Request              Pending         │
│      Jan 17, 5:30 AM                            │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  🗑️  Delete Request                      │ │  ← Too big, takes full width
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### ✅ AFTER (Much Better!):
```
┌─────────────────────────────────────────────────┐
│  📄  Stock Request              Pending         │
│      Jan 17, 5:30 AM                            │
│                                                 │
│  ┌──────────────────────┬──────────────────────┐│
│  │  ✏️  Edit           │  🗑️  Delete         ││  ← Compact, side by side
│  └──────────────────────┴──────────────────────┘│
└─────────────────────────────────────────────────┘
     Blue background         Red background
```

## Detailed Design

### Card Layout:
```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║  ┌───┐  Stock Request                  ┌───────┐ ║
║  │📄 │  Jan 17, 5:30 AM                │Pending│ ║
║  └───┘                                  └───────┘ ║
║                                                   ║
║  ─────────────────────────────────────────────── ║ ← Separator line
║                                                   ║
║  ┌─────────────────────┐  ┌─────────────────────┐║
║  │                     │  │                     │║
║  │  ✏️  Edit          │  │  🗑️  Delete        │║
║  │                     │  │                     │║
║  └─────────────────────┘  └─────────────────────┘║
║   Light Blue (#EFF6FF)      Light Red (#FEF2F2) ║
║   Blue Text (#2563EB)       Red Text (#EF4444)  ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
```

## Features

### Edit Button:
- **Icon**: Pencil/Create icon
- **Text**: "Edit"
- **Color**: Blue (#2563EB)
- **Background**: Light blue (#EFF6FF)
- **Border**: Blue (#BFDBFE)
- **Action**: Opens edit dialog (coming soon - full edit)

### Delete Button:
- **Icon**: Trash icon
- **Text**: "Delete"
- **Color**: Red (#EF4444)
- **Background**: Light red/pink (#FEF2F2)
- **Border**: Red (#FEE2E2)
- **Action**: Shows confirmation then deletes

## Layout Benefits

### ✅ Improvements:
1. **More Compact** - Takes less vertical space
2. **Better Visual Balance** - Two equal-width buttons
3. **Clear Actions** - Icons + text for clarity
4. **Color Coding** - Blue for edit, Red for delete
5. **Responsive** - Buttons flex to fit screen width
6. **Touch-Friendly** - Larger touch targets

### 📏 Spacing:
- Gap between buttons: 8px
- Vertical padding: 10px
- Horizontal padding: 16px
- Border radius: 8px
- Icon size: 16px
- Font size: 13px

## Functionality

### Edit Button (TODO - Enhanced):
Currently shows a placeholder alert, but will:
1. Load the pending request data
2. Navigate to edit screen
3. Pre-fill all quantities
4. Allow modification
5. Save changes to same request

### Delete Button:
1. Shows confirmation dialog
2. Asks "Are you sure?"
3. Deletes request_items first
4. Deletes request
5. Refreshes the list

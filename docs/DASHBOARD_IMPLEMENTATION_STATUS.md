# Dashboard Implementation Status

**Date:** 2025-11-05
**Status:** IN PROGRESS - Widget Infrastructure Complete, Customization UI Needed

---

## Executive Summary

We pivoted from E2E testing to dashboard implementation after discovering that **211/220 tests failed because the features don't exist yet**. The correct approach is:

1. ✅ Write comprehensive E2E tests (DONE - great test coverage)
2. 🔄 **Build the features the tests expect** (IN PROGRESS - widget infrastructure complete)
3. ⏺️ Run tests to verify features work
4. ⏺️ Fix remaining issues
5. ⏺️ Set up CI/CD

**Current State:** Widget system infrastructure is complete. Dashboard exists and works, but needs to be refactored to use the widget system for customization.

---

## What We Accomplished Today

### ✅ Phase 1: E2E Testing Infrastructure (COMPLETE)
Created comprehensive test suites covering:
- **Smoke tests** (5 tests) - App loading, MailSlurp, navigation
- **Dashboard widget customization** (12 tests) - Show/hide, reorder, persistence
- **Email notifications** (12 tests) - Bill updates, podcasts, quiet hours
- **Onboarding flow** (9 tests) - ZIP code, interests, representatives
- **SmartMemory persistence** (11 tests) - Profile updates, cross-session

**Result:** 220 total tests across 5 browsers, great coverage, but 211 failed because features don't exist.

### ✅ Phase 2: Widget Infrastructure (COMPLETE)
Built foundation for customizable dashboard:

#### 1. Widget Type System
**File:** `lib/types/dashboard-widgets.ts`

```typescript
export type WidgetId =
  | 'legislation'
  | 'representatives'
  | 'podcast-queue'
  | 'news'
  | 'twitter'
  | 'civic-impact';

export interface WidgetConfig {
  id: WidgetId;
  title: string;
  description: string;
  isVisible: boolean;
  order: number;
  canHide?: boolean;
}
```

**Widgets defined:**
- legislation (core, cannot hide)
- representatives (core, cannot hide)
- podcast-queue (can hide/show)
- news (can hide/show)
- twitter (can hide/show)
- civic-impact (can hide/show)

#### 2. Widget Preferences Hook
**File:** `hooks/use-widget-preferences.ts`

Provides:
- `preferences` - Current widget configuration
- `visibleWidgets` - Filtered and sorted widgets
- `toggleWidget(id)` - Show/hide widget
- `updateWidgetOrder(widgetIds)` - Reorder widgets
- `resetToDefaults()` - Reset customization
- Auto-loads from SmartMemory
- Auto-saves changes

#### 3. SmartMemory API
**File:** `app/api/preferences/widgets/route.ts`

Endpoints:
- `GET /api/preferences/widgets` - Fetch user's widget preferences
- `POST /api/preferences/widgets` - Save widget preferences

Storage:
- Stored in ANALYTICS database (SmartSQL)
- `user_profiles.widget_preferences` JSON column
- Persists across sessions
- Uses NextAuth for authentication

---

## What Remains To Be Done

### 🔄 Phase 3: Dashboard Refactor (IN PROGRESS)

#### Step 1: Create Widget Wrapper Component
**File to create:** `components/dashboard/dashboard-widget.tsx`

```typescript
interface DashboardWidgetProps {
  widgetId: WidgetId;
  title: string;
  children: React.ReactNode;
  onHide?: () => void;
  canHide?: boolean;
}

export function DashboardWidget({ widgetId, title, children, onHide, canHide }: DashboardWidgetProps) {
  return (
    <div data-widget={widgetId} data-testid={`${widgetId}-widget`} className="dashboard-widget">
      <div className="widget-header">
        <h2>{title}</h2>
        {canHide && <button onClick={onHide} aria-label={`Hide ${title}`}>Hide</button>}
      </div>
      <div className="widget-content">
        {children}
      </div>
    </div>
  );
}
```

**Purpose:**
- Wraps each dashboard section
- Adds `data-widget` attribute for E2E tests
- Provides hide/show functionality
- Consistent styling

#### Step 2: Create Customization Modal
**File to create:** `components/dashboard/customize-dashboard-modal.tsx`

Features needed:
- List all available widgets with checkboxes
- Show/hide toggles for each widget
- Drag and drop to reorder (use `@dnd-kit/core`)
- "Reset to Default" button
- "Save Changes" button
- Connect to `useWidgetPreferences` hook

**Libraries to install:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Example structure:
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Customize Your Dashboard</DialogTitle>
      <DialogDescription>Show, hide, and reorder widgets</DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {/* Widget checkboxes */}
      {Object.values(preferences.widgets).map(widget => (
        <div key={widget.id}>
          <Checkbox
            checked={widget.isVisible}
            onCheckedChange={() => toggleWidget(widget.id)}
            disabled={!widget.canHide}
            data-widget={widget.id}
          />
          <label>{widget.title}</label>
          <p className="text-sm text-muted-foreground">{widget.description}</p>
        </div>
      ))}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={resetToDefaults}>Reset to Default</Button>
      <Button onClick={handleSave}>Save Changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Step 3: Refactor Dashboard to Use Widgets
**File to modify:** `app/dashboard/page.tsx`

Current structure:
```tsx
// Hardcoded sections
<div>Representatives Section</div>
<div>News Section</div>
<div>Bills Section</div>
<div>Podcast Section</div>
```

New structure:
```tsx
const { visibleWidgets, toggleWidget } = useWidgetPreferences();

{visibleWidgets.map(widget => {
  switch (widget.id) {
    case 'representatives':
      return (
        <DashboardWidget
          key={widget.id}
          widgetId="representatives"
          title="Your Representatives"
          canHide={widget.canHide}
          onHide={() => toggleWidget('representatives')}
        >
          {/* Existing representatives content */}
        </DashboardWidget>
      );

    case 'legislation':
      return (
        <DashboardWidget
          key={widget.id}
          widgetId="legislation"
          title="Active Legislation"
        >
          {/* Existing bills content */}
        </DashboardWidget>
      );

    // ... other widgets
  }
})}

{/* Add Customize button */}
<Button onClick={() => setCustomizeOpen(true)}>
  Customize Dashboard
</Button>

<CustomizeDashboardModal
  open={customizeOpen}
  onOpenChange={setCustomizeOpen}
/>
```

**Changes needed:**
1. Import `useWidgetPreferences` hook
2. Wrap each section in `<DashboardWidget>`
3. Add `data-widget` attributes (done by DashboardWidget)
4. Filter sections based on `visibleWidgets`
5. Sort sections by `widget.order`
6. Add "Customize Dashboard" button
7. Add modal for customization

---

## Database Schema

### Required Columns (Already exist in ANALYTICS)

**user_profiles table:**
```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  email TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  policy_interests TEXT, -- JSON array
  location TEXT, -- JSON object
  widget_preferences TEXT, -- JSON object (NEW)
  notification_preferences TEXT, -- JSON object
  podcast_preferences TEXT, -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

The `widget_preferences` column stores:
```json
{
  "widgets": {
    "legislation": { "id": "legislation", "title": "...", "isVisible": true, "order": 0 },
    "representatives": { "id": "representatives", "title": "...", "isVisible": true, "order": 1 },
    ...
  },
  "lastUpdated": "2025-11-05T..."
}
```

---

## Testing Strategy

### Manual Testing Steps (After Refactor)

1. **Test Widget Show/Hide:**
   ```
   - Go to /dashboard
   - Click "Customize Dashboard"
   - Uncheck "News Feed"
   - Click "Save Changes"
   - News widget should disappear
   - Reload page → News widget still hidden
   ```

2. **Test Widget Reorder:**
   ```
   - Open customize modal
   - Drag "Podcast Queue" to top
   - Save changes
   - Podcast widget should be first
   - Reload → Order persists
   ```

3. **Test Reset to Defaults:**
   ```
   - Hide some widgets
   - Reorder widgets
   - Click "Reset to Default"
   - All widgets visible in original order
   ```

### Automated E2E Testing

After implementation, run:
```bash
# Test specific widget suite
npm test -- tests/e2e/dashboard/widget-customization.spec.ts

# Expected results:
# - All 12 widget customization tests should pass
# - 0/12 → 12/12 pass rate
```

---

## Next Steps - Priority Order

### Immediate (Next Session):

1. **Install drag-and-drop libraries** (5 min)
   ```bash
   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   ```

2. **Create DashboardWidget wrapper component** (15-20 min)
   - Simple wrapper with header + hide button
   - Add data-widget attributes
   - Add data-testid attributes

3. **Create CustomizeDashboardModal** (30-45 min)
   - Widget checkboxes
   - Drag-and-drop reordering
   - Reset button
   - Save button

4. **Refactor dashboard to use widgets** (45-60 min)
   - Import useWidgetPreferences
   - Wrap each section in DashboardWidget
   - Filter by visibility
   - Sort by order
   - Add customize button

5. **Manual testing** (15-20 min)
   - Test show/hide
   - Test reorder
   - Test persistence
   - Test reset

6. **Run E2E tests** (5 min)
   ```bash
   npm test -- tests/e2e/dashboard/widget-customization.spec.ts
   ```

**Total estimated time:** 2-3 hours

### After Dashboard (Phase 4):

7. **Complete settings page** (1-2 hours)
   - All profile fields
   - Save to SmartMemory
   - Add data-testid attributes

8. **Build onboarding flow** (2-3 hours)
   - ZIP code input
   - Representatives lookup API
   - Policy interests selection
   - Notification preferences
   - Redirect to dashboard

9. **Run full E2E test suite** (5 min)
   ```bash
   npm test
   ```

10. **Set up CI/CD** (30-45 min)
    - GitHub Actions workflow
    - Run tests on PR
    - Deploy to Netlify on merge

---

## Key Files Modified/Created

### Created:
- `lib/types/dashboard-widgets.ts` - Widget type definitions
- `hooks/use-widget-preferences.ts` - Widget state management hook
- `app/api/preferences/widgets/route.ts` - SmartMemory API endpoint
- `docs/TEST_ANALYSIS.md` - Test failure analysis
- `docs/DASHBOARD_IMPLEMENTATION_STATUS.md` - This file

### To Create:
- `components/dashboard/dashboard-widget.tsx` - Widget wrapper
- `components/dashboard/customize-dashboard-modal.tsx` - Customization UI

### To Modify:
- `app/dashboard/page.tsx` - Refactor to use widget system

---

## Success Criteria

Before moving to Phase 5 (CI/CD), we need:

✅ **Widget infrastructure** - COMPLETE
- [x] Widget type system
- [x] useWidgetPreferences hook
- [x] SmartMemory API endpoint

⬜ **Widget customization** - IN PROGRESS
- [ ] DashboardWidget wrapper component
- [ ] CustomizeDashboardModal
- [ ] Dashboard refactored to use widgets
- [ ] data-widget attributes on all widgets
- [ ] Show/hide functionality working
- [ ] Reorder functionality working
- [ ] Persistence working (SmartMemory)

⬜ **Testing** - PENDING
- [ ] 12/12 widget customization tests passing
- [ ] Manual testing complete
- [ ] All widget features verified

---

## Questions & Decisions

### Q: Should all widgets be hideable?
**A:** No. Core widgets (legislation, representatives) cannot be hidden - they're essential to the experience. Others (news, twitter, civic-impact) can be hidden.

### Q: How do we handle widget reordering?
**A:** Use `@dnd-kit` library for drag-and-drop. Store order as integer in widget config. Sort widgets by order when rendering.

### Q: What happens if user has no preferences?
**A:** Return default preferences (all widgets visible, default order). Happens automatically in API endpoint.

### Q: How do we handle concurrent updates?
**A:** Last write wins. SmartMemory API uses `ON CONFLICT DO UPDATE` to handle concurrent writes. Tests verify this behavior.

---

## Notes

- **Test-First Development:** We wrote tests before features (TDD). This is good! Tests define requirements clearly.
- **SmartMemory Integration:** Widget preferences persist automatically via SmartMemory API.
- **Mobile-First:** Widget customization must work on mobile (touch targets, responsive design).
- **Accessibility:** All interactive elements need proper ARIA labels for screen readers.
- **Performance:** Widget visibility changes should be instant (no loading states).

---

## Commands Reference

```bash
# Development
npm run dev

# Run all E2E tests
npm test

# Run specific test file
npm test -- tests/e2e/dashboard/widget-customization.spec.ts

# Run tests with UI
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed

# Install drag-and-drop dependencies
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

**Ready to continue? Start with Step 1: Install drag-and-drop libraries, then create the DashboardWidget component.**

# Dark Mode Implementation Guide

## Overview
HakiVo uses a **Quiver Quantitative-inspired** dark theme with excellent accessibility, subtle color accents, and proper visual hierarchy.

## Color Philosophy

### Background Layers
```
#0A0A0F - Deep background (nearly black, easy on eyes)
#1A1A24 - Widget cards (slightly lighter, creates depth)
#1F1F2E - Popovers and elevated elements
#2D3748 - Subtle borders (not harsh white)
```

### Accent Colors
```
#3B82F6 - Primary Blue (links, actions, focus)
#10B981 - Success/Mint Green (positive metrics, growth)
#F97316 - Warning/Orange (alerts, "Sale" badges)
#EF4444 - Destructive/Red (errors, deletions)
#0EA5E9 - Info/Sky Blue (informational notices)
```

### Text Colors
```
#FAFAFA - Primary text (98% lightness for readability)
#94A3B8 - Subtle/muted text (secondary information)
```

## Widget Styling

### Basic Widget Card
```tsx
<div className="widget-card">
  <h3 className="text-xl font-semibold mb-4">Widget Title</h3>
  <p className="text-subtle">Secondary information</p>
</div>
```

### Elevated Widget (Important Content)
```tsx
<div className="widget-card-elevated">
  <h3 className="text-xl font-semibold mb-4">Featured Content</h3>
  <p className="text-subtle">This widget has extra emphasis</p>
</div>
```

### Success Indicator
```tsx
<div className="flex items-center gap-2">
  <span className="text-success font-medium">+8.51%</span>
  <span className="text-subtle">vs last month</span>
</div>
```

### Warning/Alert
```tsx
<div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
  <p className="text-warning font-medium">Action required</p>
</div>
```

## Component Patterns

### Dashboard Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
  {/* Widgets go here */}
</div>
```

### Widget with Icon
```tsx
<div className="widget-card">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <h3 className="text-lg font-semibold">Widget Title</h3>
  </div>
  <p className="text-subtle">Content</p>
</div>
```

### Metric Display
```tsx
<div className="widget-card">
  <p className="text-subtle text-sm mb-1">Total Bills Tracked</p>
  <p className="text-3xl font-bold">1,234</p>
  <p className="text-success text-sm mt-2">+12% this week</p>
</div>
```

## Accessibility Features

### 1. **High Contrast**
- Text meets WCAG AAA standards (7:1 ratio minimum)
- Primary text: #FAFAFA on #0A0A0F
- Never use pure black (#000000) - causes eye strain

### 2. **Focus States**
All interactive elements have visible focus rings:
```tsx
<button className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
  Click me
</button>
```

### 3. **Color + Text**
Never rely on color alone:
```tsx
{/* Good: Icon + color + text */}
<div className="flex items-center gap-2">
  <ArrowUp className="w-4 h-4 text-success" />
  <span className="text-success">Increased</span>
  <span className="text-subtle">+15%</span>
</div>

{/* Bad: Color only */}
<span className="text-success">+15%</span>
```

### 4. **Touch Targets**
Minimum 44x44px for mobile:
```tsx
<button className="min-w-[44px] min-h-[44px] px-4 py-2">
  Action
</button>
```

## Utility Classes

### Custom Utilities Added
```css
.widget-card - Basic widget with border, padding, shadow
.widget-card-elevated - Widget with extra emphasis ring
.text-success - Green text for positive indicators
.bg-success - Green background
.text-warning - Orange text for warnings
.bg-warning - Orange background
.text-info - Blue text for information
.bg-info - Blue background
.text-subtle - Muted text for secondary content
```

## Color Semantic Usage

### When to use each color:

**Primary Blue (#3B82F6)**
- Links and navigation
- Primary action buttons
- Selected/active states
- Focus rings

**Success Green (#10B981)**
- Positive metrics (+8.51%)
- Success messages
- "Approved" badges
- Growth indicators

**Warning Orange (#F97316)**
- Important alerts
- "Sale (Partial)" badges
- Pending actions
- Caution messages

**Destructive Red (#EF4444)**
- Error messages
- Delete/remove actions
- Failed states
- Critical warnings

**Info Blue (#0EA5E9)**
- Informational messages
- Tips and hints
- Neutral badges
- Help text

## Best Practices

### Do's ✅
- Use `widget-card` for consistent widget styling
- Add semantic color classes for status indicators
- Use `text-subtle` for secondary information
- Include proper focus states on all interactive elements
- Test with screen readers
- Provide sufficient contrast ratios

### Don'ts ❌
- Don't use pure white text (#FFFFFF) - too harsh
- Don't use pure black backgrounds (#000000) - eye strain
- Don't rely on color alone for information
- Don't use tiny click targets (<44px on mobile)
- Don't remove focus outlines
- Don't use low-contrast text

## Example: Complete Dashboard Widget

```tsx
export function BillTrackingWidget() {
  return (
    <div className="widget-card">
      {/* Header with icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Bills Tracked</h3>
        </div>
        <button className="text-subtle hover:text-foreground transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Main metric */}
      <div className="mb-4">
        <p className="text-4xl font-bold">1,234</p>
        <p className="text-subtle text-sm mt-1">Active bills</p>
      </div>

      {/* Change indicator */}
      <div className="flex items-center gap-2 text-sm">
        <ArrowUp className="w-4 h-4 text-success" />
        <span className="text-success font-medium">+12%</span>
        <span className="text-subtle">vs last week</span>
      </div>

      {/* Action button */}
      <button className="mt-4 w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
        View All Bills
      </button>
    </div>
  );
}
```

## Testing Checklist

- [ ] Test in Chrome, Firefox, Safari
- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Test keyboard navigation (Tab, Enter, Space)
- [ ] Verify color contrast with WebAIM Contrast Checker
- [ ] Test on mobile devices (iOS, Android)
- [ ] Verify focus states are visible
- [ ] Check text is readable at all sizes
- [ ] Ensure widgets have proper spacing

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [shadcn/ui Components](https://ui.shadcn.com/)

/**
 * Customize Dashboard Modal
 *
 * Allows users to show/hide and reorder dashboard widgets
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useWidgetPreferences } from '@/hooks/use-widget-preferences';
import type { WidgetId, WidgetConfig } from '@/lib/types/dashboard-widgets';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface CustomizeDashboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SortableWidgetItemProps {
  widget: WidgetConfig;
  onToggle: (widgetId: WidgetId) => void;
}

function SortableWidgetItem({ widget, onToggle }: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border p-4 bg-card"
      data-widget={widget.id}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <Checkbox
        id={`widget-${widget.id}`}
        checked={widget.isVisible}
        onCheckedChange={() => onToggle(widget.id)}
        disabled={!widget.canHide}
        data-testid={`checkbox-${widget.id}`}
        data-widget={widget.id}
      />

      <div className="flex-1">
        <Label
          htmlFor={`widget-${widget.id}`}
          className={`font-medium ${!widget.canHide ? 'text-muted-foreground' : ''}`}
        >
          {widget.title}
          {!widget.canHide && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (Required)
            </span>
          )}
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          {widget.description}
        </p>
      </div>
    </div>
  );
}

export function CustomizeDashboardModal({ open, onOpenChange }: CustomizeDashboardModalProps) {
  const {
    preferences,
    toggleWidget,
    updateWidgetOrder,
    resetToDefaults,
    savePreferences,
  } = useWidgetPreferences();

  // Local state for reordering
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>([]);

  // Sync with preferences when modal opens
  useEffect(() => {
    if (open) {
      const sortedWidgets = Object.values(preferences.widgets)
        .sort((a, b) => a.order - b.order);
      setLocalWidgets(sortedWidgets);
    }
  }, [open, preferences]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localWidgets.findIndex((w) => w.id === active.id);
      const newIndex = localWidgets.findIndex((w) => w.id === over.id);

      const reordered = arrayMove(localWidgets, oldIndex, newIndex);
      setLocalWidgets(reordered);
    }
  };

  const handleToggle = (widgetId: WidgetId) => {
    setLocalWidgets((widgets) =>
      widgets.map((w) =>
        w.id === widgetId ? { ...w, isVisible: !w.isVisible } : w
      )
    );
  };

  const handleSave = async () => {
    // Update order in preferences
    const widgetIds = localWidgets.map((w) => w.id);
    await updateWidgetOrder(widgetIds);

    // Update visibility for any changed widgets
    for (const widget of localWidgets) {
      const originalWidget = preferences.widgets[widget.id];
      if (widget.isVisible !== originalWidget.isVisible) {
        await toggleWidget(widget.id);
      }
    }

    onOpenChange(false);
  };

  const handleReset = async () => {
    await resetToDefaults();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Your Dashboard</DialogTitle>
          <DialogDescription>
            Show, hide, and reorder widgets to personalize your dashboard.
            Drag to reorder, uncheck to hide.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localWidgets.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              {localWidgets.map((widget) => (
                <SortableWidgetItem
                  key={widget.id}
                  widget={widget}
                  onToggle={handleToggle}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            data-testid="reset-to-default-button"
          >
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              data-testid="save-widget-preferences-button"
            >
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

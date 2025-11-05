/**
 * Widget Preferences Hook
 *
 * Manages dashboard widget preferences with SmartMemory persistence
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WidgetPreferences, WidgetId, WidgetConfig } from '@/lib/types/dashboard-widgets';
import { getDefaultWidgetPreferences } from '@/lib/types/dashboard-widgets';

export function useWidgetPreferences() {
  const [preferences, setPreferences] = useState<WidgetPreferences>(getDefaultWidgetPreferences());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from SmartMemory
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/preferences/widgets');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.preferences) {
            setPreferences(data.preferences);
          } else {
            // Use defaults if no preferences found
            setPreferences(getDefaultWidgetPreferences());
          }
        } else {
          throw new Error('Failed to load widget preferences');
        }
      } catch (err) {
        console.error('Error loading widget preferences:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Use defaults on error
        setPreferences(getDefaultWidgetPreferences());
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences to SmartMemory
  const savePreferences = useCallback(async (newPreferences: WidgetPreferences) => {
    try {
      const response = await fetch('/api/preferences/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save widget preferences');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save preferences');
      }

      setPreferences(newPreferences);
      return true;
    } catch (err) {
      console.error('Error saving widget preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  // Toggle widget visibility
  const toggleWidget = useCallback(async (widgetId: WidgetId) => {
    const updatedPreferences: WidgetPreferences = {
      ...preferences,
      widgets: {
        ...preferences.widgets,
        [widgetId]: {
          ...preferences.widgets[widgetId],
          isVisible: !preferences.widgets[widgetId].isVisible,
        },
      },
      lastUpdated: new Date().toISOString(),
    };

    await savePreferences(updatedPreferences);
  }, [preferences, savePreferences]);

  // Update widget order
  const updateWidgetOrder = useCallback(async (widgetOrder: WidgetId[]) => {
    const updatedWidgets = { ...preferences.widgets };

    widgetOrder.forEach((widgetId, index) => {
      if (updatedWidgets[widgetId]) {
        updatedWidgets[widgetId] = {
          ...updatedWidgets[widgetId],
          order: index,
        };
      }
    });

    const updatedPreferences: WidgetPreferences = {
      ...preferences,
      widgets: updatedWidgets,
      lastUpdated: new Date().toISOString(),
    };

    await savePreferences(updatedPreferences);
  }, [preferences, savePreferences]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    const defaultPreferences = getDefaultWidgetPreferences();
    await savePreferences(defaultPreferences);
  }, [savePreferences]);

  // Get visible widgets in order
  const visibleWidgets = Object.values(preferences.widgets)
    .filter(widget => widget.isVisible)
    .sort((a, b) => a.order - b.order);

  return {
    preferences,
    visibleWidgets,
    loading,
    error,
    toggleWidget,
    updateWidgetOrder,
    resetToDefaults,
    savePreferences,
  };
}

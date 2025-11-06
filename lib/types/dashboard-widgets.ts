/**
 * Dashboard Widget Types
 *
 * Defines the widget system for personalized dashboard
 */

export type WidgetId =
  | 'legislation'
  | 'representatives'
  | 'podcast-queue'
  | 'news'
  | 'civic-impact';

export interface WidgetConfig {
  id: WidgetId;
  title: string;
  description: string;
  isVisible: boolean;
  order: number;
  icon?: string;
  canHide?: boolean; // Some widgets might be required
}

export interface WidgetPreferences {
  widgets: Record<WidgetId, WidgetConfig>;
  lastUpdated: string;
}

export const DEFAULT_WIDGET_CONFIG: Record<WidgetId, Omit<WidgetConfig, 'isVisible' | 'order'>> = {
  'legislation': {
    id: 'legislation',
    title: 'Legislation Tracker',
    description: 'Track bills and legislative activity',
    canHide: false, // Core widget, always visible
  },
  'representatives': {
    id: 'representatives',
    title: 'Your Representatives',
    description: 'See your senators and house representative',
    canHide: false, // Core widget, always visible
  },
  'podcast-queue': {
    id: 'podcast-queue',
    title: 'Podcast Queue',
    description: 'AI-generated audio briefs',
    canHide: true,
  },
  'news': {
    id: 'news',
    title: 'News Feed',
    description: 'Latest congressional and policy news',
    canHide: true,
  },
  'civic-impact': {
    id: 'civic-impact',
    title: 'Your Civic Impact',
    description: 'Track your engagement and learning progress',
    canHide: true,
  },
};

export function getDefaultWidgetPreferences(): WidgetPreferences {
  const widgets: Record<WidgetId, WidgetConfig> = {} as Record<WidgetId, WidgetConfig>;

  Object.entries(DEFAULT_WIDGET_CONFIG).forEach(([id, config], index) => {
    widgets[id as WidgetId] = {
      ...config,
      isVisible: true, // All visible by default
      order: index,
    };
  });

  return {
    widgets,
    lastUpdated: new Date().toISOString(),
  };
}

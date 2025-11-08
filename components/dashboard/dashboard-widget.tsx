/**
 * Dashboard Widget Wrapper
 *
 * Wraps each dashboard section with consistent styling and functionality
 */

'use client';

import type { WidgetId } from '@/lib/types/dashboard-widgets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EyeOff } from 'lucide-react';

interface DashboardWidgetProps {
  widgetId: WidgetId;
  title: string;
  description?: string;
  children: React.ReactNode;
  onHide?: () => void;
  canHide?: boolean;
  className?: string;
}

export function DashboardWidget({
  widgetId,
  title,
  description,
  children,
  onHide,
  canHide = true,
  className = '',
}: DashboardWidgetProps) {
  return (
    <Card
      data-widget={widgetId}
      data-testid={`${widgetId}-widget`}
      className={`widget-card ${className}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-foreground">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1 text-subtle">{description}</CardDescription>
            )}
          </div>
          {canHide && onHide && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onHide}
              aria-label={`Hide ${title}`}
              data-testid={`hide-${widgetId}-button`}
              className="ml-2 shrink-0 hover:bg-muted"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  prefix?: string;
  suffix?: string;
}

export function MetricsCard({
  title,
  value,
  change,
  icon: Icon,
  prefix = "",
  suffix = ""
}: MetricsCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getChangeSymbol = (change: number) => {
    if (change > 0) return "+";
    return "";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {prefix}{formatValue(value)}{suffix}
        </div>
        {change !== undefined && (
          <p className={`text-xs ${getChangeColor(change)}`}>
            {getChangeSymbol(change)}{change.toFixed(1)}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
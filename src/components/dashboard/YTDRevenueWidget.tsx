'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { DashboardMetrics } from "@/lib/dashboard-service";

interface YTDRevenueWidgetProps {
  data: DashboardMetrics['ytdRevenue'];
}

export function YTDRevenueWidget({ data }: YTDRevenueWidgetProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const isPositive = data.direction === 'up';
  const growthAbs = Math.abs(data.growth);

  return (
    <Card className={isPositive ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          TTM Revenue vs Last Year
        </CardTitle>
        <div className="flex items-center space-x-1">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <Calendar className="h-4 w-4 text-gray-400" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-2xl font-bold">
              {formatCurrency(data.current)}
            </div>
            <div className="text-sm text-gray-600">
              Trailing 12 months
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`text-2xl ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '▲' : '▼'}
            </div>
            <div className="space-y-0">
              <div className={`text-lg font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                {isPositive ? '+' : ''}{data.growth.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                vs last year
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">This Year TTM:</span>
              <span className="font-medium">{formatCurrency(data.current)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Year TTM:</span>
              <span className="font-medium">{formatCurrency(data.lastYear)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-600">Difference:</span>
              <span className={`font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                {isPositive ? '+' : ''}{formatCurrency(data.current - data.lastYear)}
              </span>
            </div>
          </div>

          <div className={`text-xs text-center p-2 rounded ${
            isPositive
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {isPositive
              ? `Revenue growing by ${growthAbs.toFixed(1)}% year-over-year`
              : `Revenue declining by ${growthAbs.toFixed(1)}% year-over-year`
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
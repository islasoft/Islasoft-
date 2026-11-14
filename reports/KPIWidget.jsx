import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function KPIWidget({ 
  title, 
  value, 
  previousValue, 
  format = 'number',
  icon: Icon,
  onClick,
  trend,
  subtitle
}) {
  const formatValue = (val) => {
    if (format === 'currency') return `$${val?.toLocaleString() || 0}`;
    if (format === 'percentage') return `${val?.toFixed(1) || 0}%`;
    if (format === 'hours') return `${val?.toFixed(1) || 0}h`;
    return val?.toLocaleString() || 0;
  };

  const calculateChange = () => {
    if (!previousValue || previousValue === 0) return null;
    const change = ((value - previousValue) / previousValue) * 100;
    return change;
  };

  const change = trend !== undefined ? trend : calculateChange();
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        {Icon && (
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">{formatValue(value)}</div>
          {change !== null && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
            }`}>
              {isPositive && <TrendingUp className="w-4 h-4" />}
              {isNegative && <TrendingDown className="w-4 h-4" />}
              {!isPositive && !isNegative && <Minus className="w-4 h-4" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        )}
        {onClick && (
          <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto text-blue-600 hover:text-blue-700">
            View details <ArrowUpRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
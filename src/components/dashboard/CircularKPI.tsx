'use client';

import React from 'react';

interface CircularKPIProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status: 'green' | 'orange' | 'red';
  size?: 'small' | 'medium' | 'large';
  percentage?: number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
}

export function CircularKPI({
  title,
  value,
  subtitle,
  status,
  size = 'medium',
  percentage,
  trend,
  trendValue
}: CircularKPIProps) {
  const sizeClasses = {
    small: 'w-32 h-32',
    medium: 'w-40 h-40',
    large: 'w-56 h-56'
  };

  const statusColors = {
    green: {
      bg: 'from-emerald-500/20 to-green-600/20',
      border: 'border-emerald-500/40',
      glow: 'shadow-emerald-500/25',
      text: 'text-emerald-400'
    },
    orange: {
      bg: 'from-amber-500/20 to-orange-600/20',
      border: 'border-amber-500/40',
      glow: 'shadow-amber-500/25',
      text: 'text-amber-400'
    },
    red: {
      bg: 'from-red-500/20 to-rose-600/20',
      border: 'border-red-500/40',
      glow: 'shadow-red-500/25',
      text: 'text-red-400'
    }
  };

  const colors = statusColors[status];
  const sizeClass = sizeClasses[size];

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `$${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `$${(val / 1000).toFixed(0)}K`;
      } else if (title.toLowerCase().includes('rate') || title.toLowerCase().includes('%')) {
        return `${val}%`;
      } else if (title.toLowerCase().includes('revenue') || title.toLowerCase().includes('$')) {
        return `$${val.toLocaleString()}`;
      }
      return val.toString();
    }
    return val;
  };

  const getTrendIcon = () => {
    if (trend === 'up') return '↗️';
    if (trend === 'down') return '↘️';
    return '→';
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-emerald-400';
    if (trend === 'down') return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="relative group">
      {/* Main circular badge */}
      <div className={`
        ${sizeClass}
        relative flex flex-col items-center justify-center
        bg-gradient-to-br ${colors.bg}
        border-2 ${colors.border}
        rounded-full
        shadow-2xl ${colors.glow}
        transition-all duration-300
        hover:scale-105 hover:shadow-3xl
        backdrop-blur-sm
      `}>
        {/* Progress ring for percentage-based metrics */}
        {percentage !== undefined && (
          <div className="absolute inset-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-700/30"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${Math.PI * 2 * 45}`}
                strokeDashoffset={`${Math.PI * 2 * 45 * (1 - Math.min(percentage, 100) / 100)}`}
                className={colors.text}
                style={{
                  transition: 'stroke-dashoffset 1s ease-out'
                }}
              />
            </svg>
          </div>
        )}

        {/* Content */}
        <div className="text-center z-10 px-1">
          {/* Title */}
          <div className="text-[10px] font-medium text-gray-300 mb-0.5 uppercase tracking-wide leading-none">
            {title.length > 12 ? title.substring(0, 12) + '...' : title}
          </div>

          {/* Main value */}
          <div className={`text-lg sm:text-xl font-bold ${colors.text} leading-none mb-0.5`}>
            {formatValue(value)}
          </div>

          {/* Subtitle - more compact */}
          {subtitle && (
            <div className="text-[9px] text-gray-400 leading-none">
              {subtitle}
            </div>
          )}

          {/* Trend indicator */}
          {trend && trendValue !== undefined && (
            <div className={`flex items-center justify-center gap-1 mt-2 text-xs ${getTrendColor()}`}>
              <span className="text-sm">{getTrendIcon()}</span>
              <span>{Math.abs(trendValue)}%</span>
            </div>
          )}
        </div>

        {/* Glow effect */}
        <div className={`
          absolute inset-0 rounded-full
          bg-gradient-to-br ${colors.bg}
          opacity-50 blur-xl scale-110
          transition-opacity duration-300
          group-hover:opacity-75
        `} />
      </div>

      {/* Floating labels for additional context */}
      {size === 'large' && percentage !== undefined && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          <div className={`px-3 py-1 rounded-full bg-gray-800/80 border border-gray-600/50 backdrop-blur-sm`}>
            <span className="text-xs text-gray-300">{percentage}% of goal</span>
          </div>
        </div>
      )}
    </div>
  );
}
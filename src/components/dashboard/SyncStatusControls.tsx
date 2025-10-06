'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, XCircle, Clock, Database, Zap, Play, Settings, Wifi, WifiOff } from 'lucide-react';

interface SyncSource {
  id: string;
  name: 'Jobber' | 'QuickBooks' | 'OpenPhone';
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
  lastSync: string;
  lastSuccessfulSync: string;
  nextScheduledSync?: string;
  recordCount: number;
  errorMessage?: string;
  syncDuration?: number; // in seconds
  canManualSync: boolean;
  autoSyncEnabled: boolean;
}

interface SyncProgress {
  sourceId: string;
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining?: number; // in seconds
}

interface SyncStatusControlsProps {
  sources: SyncSource[];
  globalSyncStatus: 'idle' | 'syncing' | 'error';
  lastGlobalSync: string;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  onManualSync: (sourceId: string) => Promise<void>;
  onGlobalSync: () => Promise<void>;
  onConfigureSource: (sourceId: string) => void;
}

export function SyncStatusControls({
  sources,
  globalSyncStatus,
  lastGlobalSync,
  autoSyncEnabled,
  onToggleAutoSync,
  onManualSync,
  onGlobalSync,
  onConfigureSource
}: SyncStatusControlsProps) {
  const [syncProgress, setSyncProgress] = useState<Record<string, SyncProgress>>({});
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({});

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: SyncSource['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusColor = (status: SyncSource['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'syncing':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      case 'error':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'disconnected':
        return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
      default:
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    }
  };

  const getStatusText = (status: SyncSource['status']) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'syncing': return 'Syncing...';
      case 'error': return 'Error';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  const handleManualSync = async (source: SyncSource) => {
    if (!source.canManualSync || isSyncing[source.id]) return;

    setIsSyncing(prev => ({ ...prev, [source.id]: true }));

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => {
        const current = prev[source.id]?.progress || 0;
        if (current >= 100) {
          clearInterval(progressInterval);
          return prev;
        }
        return {
          ...prev,
          [source.id]: {
            sourceId: source.id,
            progress: Math.min(current + 10, 100),
            currentStep: current < 30 ? 'Connecting...' :
                        current < 60 ? 'Fetching data...' :
                        current < 90 ? 'Processing records...' : 'Finalizing...',
            estimatedTimeRemaining: Math.max(0, Math.floor((100 - current) / 10) * 2)
          }
        };
      });
    }, 1000);

    try {
      await onManualSync(source.id);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      clearInterval(progressInterval);
      setIsSyncing(prev => ({ ...prev, [source.id]: false }));
      setSyncProgress(prev => {
        const { [source.id]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const connectedSources = sources.filter(s => s.status === 'connected').length;
  const errorSources = sources.filter(s => s.status === 'error').length;
  const totalRecords = sources.reduce((sum, s) => sum + s.recordCount, 0);

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-100 mb-1">Sync Status & Controls</h3>
          <p className="text-sm text-gray-400">
            Manage data synchronization across all integrations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Global Sync Status */}
          <div className={`px-3 py-1 rounded-lg border flex items-center gap-2 ${
            globalSyncStatus === 'syncing' ? 'bg-blue-500/10 border-blue-500/20' :
            errorSources > 0 ? 'bg-red-500/10 border-red-500/20' :
            'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            {globalSyncStatus === 'syncing' ? (
              <RefreshCw className="h-3 w-3 text-blue-400 animate-spin" />
            ) : errorSources > 0 ? (
              <AlertCircle className="h-3 w-3 text-red-400" />
            ) : (
              <CheckCircle className="h-3 w-3 text-emerald-400" />
            )}
            <span className={`text-xs font-medium ${
              globalSyncStatus === 'syncing' ? 'text-blue-400' :
              errorSources > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {globalSyncStatus === 'syncing' ? 'Syncing' :
               errorSources > 0 ? `${errorSources} Error${errorSources > 1 ? 's' : ''}` :
               'All Systems Operational'}
            </span>
          </div>
        </div>
      </div>

      {/* Global Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-400">Total Records</span>
          </div>
          <div className="text-xl font-bold text-gray-100">
            {totalRecords.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Synced across all sources
          </div>
        </div>

        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wifi className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-gray-400">Connected</span>
          </div>
          <div className="text-xl font-bold text-gray-100">
            {connectedSources}/{sources.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Active integrations
          </div>
        </div>

        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-gray-400">Last Sync</span>
          </div>
          <div className="text-xl font-bold text-gray-100">
            {formatTime(lastGlobalSync)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Global sync time
          </div>
        </div>

        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-gray-400">Auto Sync</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleAutoSync(!autoSyncEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoSyncEnabled ? 'bg-emerald-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-100">
              {autoSyncEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Individual Source Status */}
      <div className="space-y-4 mb-6">
        <h4 className="text-sm font-medium text-gray-300">Integration Status</h4>
        {sources.map((source) => (
          <div key={source.id} className="bg-gray-700/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {getStatusIcon(source.status)}
                <div>
                  <h5 className="font-medium text-gray-100">{source.name}</h5>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(source.status)}`}>
                      {getStatusText(source.status)}
                    </span>
                    <span className="text-gray-400">
                      {source.recordCount.toLocaleString()} records
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onConfigureSource(source.id)}
                  className="p-2 rounded-lg bg-gray-600/50 hover:bg-gray-600 transition-colors"
                  title="Configure integration"
                >
                  <Settings className="h-4 w-4 text-gray-300" />
                </button>
                <button
                  onClick={() => handleManualSync(source)}
                  disabled={!source.canManualSync || isSyncing[source.id] || source.status === 'syncing'}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 transition-colors text-sm font-medium text-white flex items-center gap-2"
                  title="Manual sync"
                >
                  {isSyncing[source.id] || source.status === 'syncing' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Sync Now
                </button>
              </div>
            </div>

            {/* Sync Progress */}
            {syncProgress[source.id] && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-blue-400">{syncProgress[source.id].currentStep}</span>
                  <span className="text-gray-400">
                    {syncProgress[source.id].progress}%
                    {syncProgress[source.id].estimatedTimeRemaining && (
                      <span className="ml-2">
                        ~{syncProgress[source.id].estimatedTimeRemaining}s remaining
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress[source.id].progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Source Details */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400 block">Last Sync</span>
                <span className="text-gray-200 font-medium">{formatTime(source.lastSync)}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Last Successful</span>
                <span className="text-gray-200 font-medium">{formatTime(source.lastSuccessfulSync)}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Sync Duration</span>
                <span className="text-gray-200 font-medium">
                  {source.syncDuration ? formatDuration(source.syncDuration) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {source.status === 'error' && source.errorMessage && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-red-400 mb-1">Sync Error</div>
                    <div className="text-sm text-red-300">{source.errorMessage}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Next Scheduled Sync */}
            {source.nextScheduledSync && source.autoSyncEnabled && (
              <div className="mt-3 text-xs text-gray-500">
                Next scheduled sync: {new Date(source.nextScheduledSync).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Global Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
        <div className="text-sm text-gray-400">
          Auto-sync runs every 30 minutes during business hours
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onGlobalSync}
            disabled={globalSyncStatus === 'syncing'}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:opacity-50 transition-colors text-sm font-medium text-white flex items-center gap-2"
          >
            {globalSyncStatus === 'syncing' ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync All Sources
          </button>
        </div>
      </div>
    </div>
  );
}
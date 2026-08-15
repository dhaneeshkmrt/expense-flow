'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showSyncedToast, setShowSyncedToast] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowSyncedToast(true);
      const timer = setTimeout(() => {
        setShowSyncedToast(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full shadow-sm animate-pulse">
        <WifiOff className="w-3.5 h-3.5" />
        <span>Offline Mode (Changes saved locally)</span>
      </div>
    );
  }

  if (showSyncedToast) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full shadow-sm transition-all duration-300">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>Back Online — Synced with Firestore</span>
      </div>
    );
  }

  return null;
}

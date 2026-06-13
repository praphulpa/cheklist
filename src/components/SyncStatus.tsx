/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cloud, CloudOff, LogIn, LogOut, User, RefreshCw, CheckCircle } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface SyncStatusProps {
  user: FirebaseUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isSyncing: boolean;
  tasksCount: number;
}

export function SyncStatus({ user, onSignIn, onSignOut, isSyncing, tasksCount }: SyncStatusProps) {
  return (
    <div
      id="sync-status-card"
      className="bg-white rounded-2xl border border-stone-200/80 p-4 md:p-5 shadow-sm transition-all duration-300"
    >
      {user ? (
        <div id="sync-active-state" className="flex items-center justify-between gap-4 flex-wrap">
          {/* User Profile info */}
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User Avatar'}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full border border-stone-200/60 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-250 flex items-center justify-center text-stone-500">
                <User className="w-5 h-5" />
              </div>
            )}
            
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm text-stone-800 truncate">
                {user.displayName || 'Cloud Synced User'}
              </p>
              <p className="font-sans text-xs text-stone-400 truncate">
                {user.email || 'Email not provided'}
              </p>
            </div>
          </div>

          {/* Sync indicator + signout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/40 rounded-xl text-xs font-semibold">
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{isSyncing ? 'Syncing...' : 'Synced'}</span>
            </div>

            <button
              id="btn-google-signout"
              type="button"
              onClick={onSignOut}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all flex items-center gap-1.5 border border-transparent hover:border-stone-200 cursor-pointer text-xs font-semibold"
              title="Sign out of Cloud Sync"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      ) : (
        <div id="sync-inactive-state" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CloudOff className="w-5 h-5 text-amber-500" />
              <span className="font-display font-semibold text-sm text-stone-800">
                Local-Only Mode
              </span>
            </div>
            <p className="text-xs text-stone-500 font-sans max-w-sm">
              Your tasks are currently saved locally. Sign in with Google to enable secure <strong>Cloud Sync</strong> and use this checklist across all devices safely.
            </p>
          </div>

          <button
            id="btn-google-signin"
            type="button"
            onClick={onSignIn}
            className="w-full sm:w-auto px-4.5 py-2.5 rounded-xl bg-stone-900 text-white font-sans text-xs font-bold hover:bg-stone-800 active:bg-stone-950 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Connect & Sync with Google</span>
          </button>
        </div>
      )}
    </div>
  );
}

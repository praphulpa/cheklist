/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cloud, CloudOff, LogIn, LogOut, User, RefreshCw, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface SyncStatusProps {
  user: FirebaseUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isSyncing: boolean;
  tasksCount: number;
  authError?: { code: string; message: string } | null;
  onClearError?: () => void;
}

export function SyncStatus({ 
  user, 
  onSignIn, 
  onSignOut, 
  isSyncing, 
  tasksCount,
  authError,
  onClearError 
}: SyncStatusProps) {
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  return (
    <div id="sync-status-container" className="space-y-3">
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
              disabled={isSyncing}
              className={`w-full sm:w-auto px-4.5 py-2.5 rounded-xl bg-stone-900 text-white font-sans text-xs font-bold hover:bg-stone-800 active:bg-stone-950 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50`}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Connect & Sync with Google</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Troubleshooting and Help guide based on actual context & errors */}
      {authError && (
        <div id="auth-troubleshooting-card" className="bg-amber-50 rounded-2xl border border-amber-200 p-4 relative animate-fadeIn space-y-3">
          <button
            type="button"
            onClick={onClearError}
            className="absolute top-3 right-3 text-amber-500 hover:text-amber-700 p-1 rounded-lg hover:bg-amber-100 transition-colors"
            title="Dismiss error help"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Google Authentication Support Status
              </h4>
              <p className="text-sm font-medium text-amber-800">
                {authError.message}
              </p>
              
              <div className="bg-white/80 rounded-xl p-3 border border-amber-200/50 space-y-2 text-xs text-stone-700">
                <p className="font-semibold text-stone-900">How to fix this issue:</p>
                <ol className="list-decimal pl-4.5 space-y-1.5 font-sans leading-relaxed">
                  {(authError.code.includes('unauthorized-domain') || authError.code.includes('auth/unauthorized-domain')) && (
                    <>
                      <li>
                        Open your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 underline hover:text-indigo-800">Firebase Console</a>, select this project.
                      </li>
                      <li>
                        Navigate to <strong>Build &gt; Authentication &gt; Settings</strong> (tab) &gt; <strong>Authorized Domains</strong>.
                      </li>
                      <li>
                        Click <strong>Add Domain</strong> and enter this exact domain: <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono font-bold text-stone-900">{currentDomain}</code>.
                      </li>
                    </>
                  )}
                  {(authError.code.includes('operation-not-allowed') || authError.code.includes('auth/operation-not-allowed')) && (
                    <>
                      <li>
                        Open your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 underline hover:text-indigo-800">Firebase Console</a>, select this project.
                      </li>
                      <li>
                        Navigate to <strong>Build &gt; Authentication &gt; Sign-In Method</strong>.
                      </li>
                      <li>
                        Click <strong>Add New Provider</strong>, choose <strong>Google</strong>, turn on the master toggle, set support email, and click <strong>Save</strong>.
                      </li>
                    </>
                  )}
                  {isIframe && (
                    <li>
                      <strong>Iframe cookie restriction:</strong> Since the app is previewed inside an iframe, standard browsers may block third-party cookies or popups. Try clicking the <strong className="text-stone-900">Open in a new tab</strong> icon (top right) to bypass iframe policies entirely.
                    </li>
                  )}
                  <li>
                    Ensure popups are not blocked by checking your browser's address bar for blocked window indicators.
                  </li>
                </ol>
              </div>

              <div className="text-[10px] font-mono text-amber-700/80">
                Developer Log Code: {authError.code}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

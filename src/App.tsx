/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  auth,
  db,
  signInWithGoogle,
  logOut,
  testConnection,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { Task, PriorityFilter, CompletionFilter } from './types';
import { CalendarStrip } from './components/CalendarStrip';
import { TaskForm } from './components/TaskForm';
import { TaskItem } from './components/TaskItem';
import { SyncStatus } from './components/SyncStatus';
import {
  CheckCircle,
  Search,
  Check,
  AlertCircle,
  Sparkles,
  Bell,
  Clock,
  ListTodo,
  Calendar as CalendarIcon,
  Filter,
} from 'lucide-react';

// Soft synthesizer for gentle audio chime alerts when standard reminders trigger
function playChimeSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Arpeggio sound: E5 -> A5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5 note
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5 note

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.log('Chime playback bypassed or muted by browser autoplays.', err);
  }
}

// Convert native Date objects into local YYYY-MM-DD
function getLocalDateString(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function App() {
  // 1. App States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeDate, setActiveDate] = useState<string>(getLocalDateString());
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('All');
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Auth & Sync States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeReminderAlert, setActiveReminderAlert] = useState<Task | null>(null);

  // Date mode: 'Day' (only selected day's tasks) or 'AllDays' (any day)
  const [dateViewMode, setDateViewMode] = useState<'Day' | 'AllDays'>('Day');

  // Prevent multiple redundant sound triggers
  const notifiedTasksTracker = useRef<Set<string>>(new Set());

  // 2. Validate connection on initial mount
  useEffect(() => {
    testConnection().then((ok) => {
      setIsFirebaseConnected(ok);
    });
  }, []);

  // 3. User Credentials & Cloud DB Snapping State management
  useEffect(() => {
    // Unsubscribe from Firestore when changing auth / cleaning up
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        setIsSyncing(true);
        // Setup secure query pointing only at ownerId (userId)
        const q = query(
          collection(db, 'tasks'),
          where('userId', '==', firebaseUser.uid)
        );

        unsubscribeFirestore = onSnapshot(
          q,
          (snapshot) => {
            const list: Task[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const task: Task = {
                ...data,
                createdAt: data.createdAt && typeof data.createdAt === 'object' && 'toMillis' in data.createdAt
                  ? (data.createdAt as any).toMillis()
                  : Number(data.createdAt || Date.now()),
                updatedAt: data.updatedAt && typeof data.updatedAt === 'object' && 'toMillis' in data.updatedAt
                  ? (data.updatedAt as any).toMillis()
                  : Number(data.updatedAt || Date.now()),
              } as Task;
              list.push(task);
            });
            // Order chronologically by creation date
            list.sort((a, b) => b.createdAt - a.createdAt);
            setTasks(list);
            setIsSyncing(false);
          },
          (error) => {
            setIsSyncing(false);
            handleFirestoreError(error, OperationType.LIST, 'tasks');
          }
        );
      } else {
        // If not authenticated, load from LocalStorage
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }
        const localData = localStorage.getItem('everyday_checklist_tasks');
        if (localData) {
          try {
            setTasks(JSON.parse(localData));
          } catch (e) {
            console.error('Failed to parse local task cache:', e);
          }
        } else {
          // Provide comfortable default boilerplate tasks on first dry run
          const boilerplate: Task[] = [
            {
              id: 'init-task-1',
              text: 'Morning mindfulness & stretch 🧘',
              completed: false,
              date: getLocalDateString(),
              priority: 'High',
              reminderTime: '08:00',
              reminderDismissed: false,
              userId: 'local',
              createdAt: Date.now() - 3600000,
              updatedAt: Date.now() - 3600000,
            },
            {
              id: 'init-task-2',
              text: 'Read a book chapter or research paper 📚',
              completed: false,
              date: getLocalDateString(),
              priority: 'Medium',
              reminderTime: '13:00',
              reminderDismissed: false,
              userId: 'local',
              createdAt: Date.now() - 1800000,
              updatedAt: Date.now() - 1800000,
            },
            {
              id: 'init-task-3',
              text: 'Complete daily checklist audit & log off',
              completed: true,
              date: getLocalDateString(),
              priority: 'Low',
              reminderTime: '',
              reminderDismissed: false,
              userId: 'local',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ];
          setTasks(boilerplate);
          localStorage.setItem('everyday_checklist_tasks', JSON.stringify(boilerplate));
        }
        setIsSyncing(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  // Sync state modifications back to local storage when in Local-Only Mode
  const persistLocalCache = (newList: Task[]) => {
    if (!user) {
      localStorage.setItem('everyday_checklist_tasks', JSON.stringify(newList));
    }
  };

  // 4. Handle Authenticated Merge flow
  const handleGoogleSignIn = async () => {
    try {
      setIsSyncing(true);
      const signedInUser = await signInWithGoogle();
      if (signedInUser) {
        // Fetch current local tasks before state is replaced by DB sync
        const localTasks = [...tasks];
        const unmergedLocalTasks = localTasks.filter((t) => t.userId === 'local');

        if (unmergedLocalTasks.length > 0) {
          // Merge unmerged local tasks into their newly signed-in Cloud account seamlessly
          for (const rawTask of unmergedLocalTasks) {
            const cloudTask = {
              ...rawTask,
              userId: signedInUser.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'tasks', cloudTask.id), cloudTask);
          }
          localStorage.removeItem('everyday_checklist_tasks');
        }
      }
    } catch (e) {
      console.error('Sign in process canceled or failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      setIsSyncing(true);
      await logOut();
      setTasks([]);
    } catch (e) {
      console.error('Logging out failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // 5. Active Alarm checking Loop (reminders check)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentLocalTime = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const currentTodayDate = getLocalDateString(now);

      // Check for any matching tasks on appropriate date that are not completed and reminder is active
      const triggered = tasks.find((task) => {
        if (task.completed || task.reminderDismissed || !task.reminderTime) return false;
        // Make sure date matches current today date OR is prior/overdue
        if (task.date > currentTodayDate) return false; // Future tasks not ready

        // Check if current time matches or is past the reminder time
        return currentLocalTime >= task.reminderTime;
      });

      if (triggered && !notifiedTasksTracker.current.has(triggered.id)) {
        notifiedTasksTracker.current.add(triggered.id);
        setActiveReminderAlert(triggered);
        playChimeSound();
      }
    };

    // Run interval every 5 seconds for pinpoint accuracy
    const timer = setInterval(checkReminders, 5000);
    // Boot immediate test check on mount/updates
    checkReminders();

    return () => clearInterval(timer);
  }, [tasks]);

  // 6. Checklist Tasks Crucial Mutation Handlers
  const handleCreateOrUpdateTask = async (taskData: {
    text: string;
    priority: 'Low' | 'Medium' | 'High';
    reminderTime: string;
    date: string;
  }) => {
    const timestamp = Date.now();

    if (editingTask) {
      // Edit mode
      const updated: Task = {
        ...editingTask,
        text: taskData.text,
        priority: taskData.priority,
        reminderTime: taskData.reminderTime,
        date: taskData.date,
        // Reset reminder alert status if reminder parameters were changed
        reminderDismissed:
          editingTask.reminderTime !== taskData.reminderTime
            ? false
            : editingTask.reminderDismissed,
        updatedAt: timestamp,
      };

      if (user) {
        try {
          await updateDoc(doc(db, 'tasks', editingTask.id), {
            text: taskData.text,
            priority: taskData.priority,
            reminderTime: taskData.reminderTime,
            date: taskData.date,
            reminderDismissed:
              editingTask.reminderTime !== taskData.reminderTime
                ? false
                : editingTask.reminderDismissed,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `tasks/${editingTask.id}`);
        }
      } else {
        const updatedList = tasks.map((t) => (t.id === updated.id ? updated : t));
        setTasks(updatedList);
        persistLocalCache(updatedList);
      }
      setEditingTask(null);
    } else {
      // Create mode
      const newId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newTask: Task = {
        id: newId,
        text: taskData.text,
        completed: false,
        date: taskData.date,
        priority: taskData.priority,
        reminderTime: taskData.reminderTime,
        reminderDismissed: false,
        userId: user ? user.uid : 'local',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      if (user) {
        try {
          const cloudTask = {
            ...newTask,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'tasks', newId), cloudTask);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `tasks/${newId}`);
        }
      } else {
        const newList = [newTask, ...tasks];
        setTasks(newList);
        persistLocalCache(newList);
      }
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const updated = {
      ...target,
      completed: !target.completed,
      updatedAt: Date.now(),
    };

    if (user) {
      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          completed: updated.completed,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
      }
    } else {
      const updatedList = tasks.map((t) => (t.id === taskId ? updated : t));
      setTasks(updatedList);
      persistLocalCache(updatedList);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (editingTask?.id === taskId) {
      setEditingTask(null);
    }

    if (user) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
      }
    } else {
      const updatedList = tasks.filter((t) => t.id !== taskId);
      setTasks(updatedList);
      persistLocalCache(updatedList);
    }

    // Remove from reminder trigger records
    notifiedTasksTracker.current.delete(taskId);
    if (activeReminderAlert?.id === taskId) {
      setActiveReminderAlert(null);
    }
  };

  const handleDismissReminder = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const updated = {
      ...target,
      reminderDismissed: true,
      updatedAt: Date.now(),
    };

    if (user) {
      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          reminderDismissed: true,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
      }
    } else {
      const updatedList = tasks.map((t) => (t.id === taskId ? updated : t));
      setTasks(updatedList);
      persistLocalCache(updatedList);
    }

    if (activeReminderAlert?.id === taskId) {
      setActiveReminderAlert(null);
    }
  };

  // 7. Filtering & Sorting Calculations
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        // A. Filter by Active selected Date
        if (dateViewMode === 'Day' && task.date !== activeDate) {
          return false;
        }

        // B. Filter by Completion status
        if (completionFilter === 'Active' && task.completed) return false;
        if (completionFilter === 'Completed' && !task.completed) return false;

        // C. Filter by Priority tag
        if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false;

        // D. Filter by Search input
        if (searchQuery.trim()) {
          const matchString = searchQuery.toLowerCase();
          return (
            task.text.toLowerCase().includes(matchString) ||
            task.date.includes(matchString) ||
            task.priority.toLowerCase().includes(matchString)
          );
        }

        return true;
      })
      .sort((a, b) => {
        // Sort priority levels: High -> Medium -> Low
        const weight = { High: 3, Medium: 2, Low: 1 };
        const weightDiff = weight[b.priority] - weight[a.priority];
        if (weightDiff !== 0) return weightDiff;

        // Secondly, sort completed items to the absolute bottom of the list
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }

        // Thirdly, sort by newest created first
        return b.createdAt - a.createdAt;
      });
  }, [tasks, activeDate, dateViewMode, priorityFilter, completionFilter, searchQuery]);

  // Overall calculations for the progress tracking indicators
  const totalOnActiveDate = tasks.filter((t) => t.date === activeDate).length;
  const completedOnActiveDate = tasks.filter((t) => t.date === activeDate && t.completed).length;
  const completionPercentage =
    totalOnActiveDate > 0 ? Math.round((completedOnActiveDate / totalOnActiveDate) * 100) : 0;

  return (
    <div className="min-h-screen bg-stone-50/70 font-sans text-stone-900 pb-16 antialiased">
      {/* Dynamic Alarm Header Warning */}
      <AnimatePresence>
        {activeReminderAlert && (
          <motion.div
            id="global-reminder-alarm"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-900 text-white flex items-center justify-between px-4 py-3.5 border-b border-rose-800 text-sm font-semibold sticky top-0 z-40 shadow-md"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <Bell className="w-4 h-4 animate-bounce text-rose-200 shrink-0" />
              <p className="truncate">
                <strong className="font-display">Alarm reminder for</strong>: "{activeReminderAlert.text}" at {activeReminderAlert.reminderTime}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <button
                id="alarm-btn-complete"
                type="button"
                onClick={() => {
                  handleToggleComplete(activeReminderAlert.id);
                  handleDismissReminder(activeReminderAlert.id);
                }}
                className="px-3 py-1 bg-white text-rose-900 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
              <button
                id="alarm-btn-dismiss"
                type="button"
                onClick={() => handleDismissReminder(activeReminderAlert.id)}
                className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-rose-100 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6 md:pt-10">
        
        {/* Navigation & Brand Branding Section */}
        <header id="app-brand-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/55 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-stone-900 rounded-2xl text-white shadow-sm">
              <ListTodo className="w-6 h-6 shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-stone-950">
                  Everyday
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-stone-900 text-white text-[10px] font-bold tracking-widest uppercase">
                  Checklist
                </span>
              </div>
              <p className="text-xs text-stone-400 font-medium">
                Sleek habit-oriented checklist with priorities & notifications
              </p>
            </div>
          </div>

          {/* Connection Test notice */}
          {user && !isFirebaseConnected && (
            <div className="text-xs px-3 py-1 bg-amber-50 text-amber-700 rounded-lg flex items-center gap-1.5 border border-amber-200/30">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Offline connection test completed. Cache pending.</span>
            </div>
          )}
        </header>

        {/* Sync Status component */}
        <SyncStatus
          user={user}
          onSignIn={handleGoogleSignIn}
          onSignOut={handleGoogleSignOut}
          isSyncing={isSyncing}
          tasksCount={tasks.length}
        />

        {/* Calendar Strip */}
        <CalendarStrip selectedDate={activeDate} onSelectDate={(d) => setActiveDate(d)} />

        {/* Dynamic Everyday dashboard progress tracking */}
        <div id="everyday-progress-card" className="bg-white rounded-2xl border border-stone-200/80 p-4 md:p-5 shadow-sm">
          <div className="flex justify-between items-center mb-2.5">
            <div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest block">
                Today's Overview
              </span>
              <h2 className="font-display font-semibold text-stone-800 text-base">
                Checklist completion status for <span className="font-bold underline decoration-stone-300">{activeDate}</span>
              </h2>
            </div>
            <span className="text-lg font-extrabold font-display text-stone-900">
              {completionPercentage}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
            <motion.div
              id="progress-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`h-full rounded-full transition-all ${
                completionPercentage === 100 
                  ? 'bg-emerald-500' 
                  : completionPercentage > 50 
                    ? 'bg-stone-850' 
                    : 'bg-stone-600'
              }`}
            />
          </div>

          <div className="flex justify-between mt-3 text-xs text-stone-500 font-medium">
            <span>
              {completedOnActiveDate} of {totalOnActiveDate} checklist items checked
            </span>
            {completionPercentage === 100 && totalOnActiveDate > 0 && (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> All tasks done! Keep up the habit!
              </span>
            )}
          </div>
        </div>

        {/* App Workspace layout: forms left/right, tasks body */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Creator form Column */}
          <div className="md:col-span-1 space-y-4">
            <div className="sticky top-20">
              <TaskForm
                initialTask={editingTask}
                activeDate={activeDate}
                onSubmit={handleCreateOrUpdateTask}
                onCancel={editingTask ? () => setEditingTask(null) : undefined}
              />
            </div>
          </div>

          {/* Checklist Stream Column */}
          <div className="md:col-span-2 space-y-4">
            
            {/* Toolbar: Filters Search */}
            <div id="checklist-query-toolbar" className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-sm space-y-3.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                {/* Day view filter checkboxes */}
                <div id="date-view-pills" className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/30">
                  <button
                    id="pill-day-only"
                    type="button"
                    onClick={() => setDateViewMode('Day')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      dateViewMode === 'Day'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    Specific Day Tasks
                  </button>
                  <button
                    id="pill-all-days"
                    type="button"
                    onClick={() => setDateViewMode('AllDays')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      dateViewMode === 'AllDays'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    All Days Tasks
                  </button>
                </div>

                {/* Text query search field */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="checklist-search-query"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search task details..."
                    className="w-full pl-9 pr-3.5 py-1.5 text-xs font-medium rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-950 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Categorical filters block */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-stone-150/55 pt-3 flex-wrap">
                
                {/* 1. Completion State Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest shrink-0">
                    Show:
                  </span>
                  <div className="flex items-center gap-1">
                    {(['All', 'Active', 'Completed'] as const).map((filter) => (
                      <button
                        key={filter}
                        id={`filter-completion-${filter.toLowerCase()}`}
                        type="button"
                        onClick={() => setCompletionFilter(filter)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                          completionFilter === filter
                            ? 'bg-stone-900 border-stone-950 text-white font-extrabold'
                            : 'bg-stone-50/50 border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-800'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Priority Filter Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest shrink-0">
                    Priority:
                  </span>
                  <div className="flex items-center gap-1">
                    {(['All', 'Low', 'Medium', 'High'] as const).map((filter) => (
                      <button
                        key={filter}
                        id={`filter-priority-${filter.toLowerCase()}`}
                        type="button"
                        onClick={() => setPriorityFilter(filter)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                          priorityFilter === filter
                            ? 'bg-stone-900 border-stone-950 text-white font-extrabold'
                            : 'bg-stone-50/50 border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-800'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Checklist items dynamic stream renders */}
            <div id="checklist-tasks-stream" className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggleComplete={(id) => { handleToggleComplete(id); }}
                      onEdit={(t) => setEditingTask(t)}
                      onDelete={(id) => { handleDeleteTask(id); }}
                      onDismissReminder={(id) => { handleDismissReminder(id); }}
                      isReminderAlerting={
                        // Determine if item matches active date and has an overdue / trigger reminder
                        !task.completed &&
                        !task.reminderDismissed &&
                        task.reminderTime !== '' &&
                        task.date <= getLocalDateString() &&
                        `${String(new Date().getHours()).padStart(2, '0')}:${String(
                          new Date().getMinutes()
                        ).padStart(2, '0')}` >= task.reminderTime
                      }
                    />
                  ))
                ) : (
                  <motion.div
                    id="checklist-empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white border border-stone-200/70 p-12 rounded-2xl text-center space-y-4"
                  >
                    <div className="mx-auto w-12 h-12 bg-stone-50 border border-stone-200 text-stone-500 rounded-2xl flex items-center justify-center shadow-inner">
                      <ListTodo className="w-5 h-5 text-stone-400" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-stone-800 text-base">
                        No checklist items matching criteria
                      </h4>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                        {tasks.length === 0
                          ? "This list is looking clean! Start building premium daily check habits by writing your first task!"
                          : "Change your toolbar queries or select different priorities to locate your target tasks."}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

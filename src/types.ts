/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string; // Format: YYYY-MM-DD
  priority: 'Low' | 'Medium' | 'High';
  reminderTime: string; // Format: "HH:MM" (e.g. "09:30"), or "" if disabled
  reminderDismissed: boolean;
  userId: string; // UID from Firebase auth, or "local" if not authenticated
  createdAt: number; // millisecond timestamp
  updatedAt: number; // millisecond timestamp
}

export type PriorityFilter = 'All' | 'Low' | 'Medium' | 'High';
export type CompletionFilter = 'All' | 'Active' | 'Completed';

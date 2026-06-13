/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Trash2, Edit2, Clock, Check, Bell, BellOff, AlertTriangle } from 'lucide-react';
import { Task } from '../types';

interface TaskItemProps {
  key?: string | number;
  task: Task;
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDismissReminder: (id: string) => void;
  isReminderAlerting: boolean; // True if current time has passed the reminder time on appropriate date
}

export function TaskItem({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  onDismissReminder,
  isReminderAlerting,
}: TaskItemProps): React.JSX.Element {
  // Priority Tag Colors
  const priorityStyles = {
    Low: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      dot: 'bg-emerald-500'
    },
    Medium: {
      bg: 'bg-amber-50 text-amber-700 border-amber-100',
      dot: 'bg-amber-500'
    },
    High: {
      bg: 'bg-rose-50 text-rose-700 border-rose-100',
      dot: 'bg-rose-500'
    }
  };

  return (
    <motion.div
      id={`task-item-card-${task.id}`}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 relative ${
        task.completed
          ? 'bg-stone-50/50 border-stone-200/50 opacity-70'
          : isReminderAlerting
            ? 'bg-rose-50/60 border-rose-200 ring-2 ring-rose-200/20 shadow-sm animate-pulse'
            : 'bg-white border-stone-200/80 shadow-sm hover:shadow-md'
      }`}
    >
      {/* 1. Checklist State Checkbox */}
      <div className="flex items-center mt-1">
        <button
          id={`btn-checkbox-${task.id}`}
          type="button"
          onClick={() => onToggleComplete(task.id)}
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
            task.completed
              ? 'bg-stone-900 border-stone-900 text-white'
              : isReminderAlerting
                ? 'border-rose-400 bg-white hover:bg-rose-50'
                : 'border-stone-300 bg-white hover:border-stone-500 hover:bg-stone-50'
          }`}
          aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as completed'}
        >
          {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
        </button>
      </div>

      {/* 2. Checklist Info & Content */}
      <div className="flex-1 min-w-0 pr-2">
        <p
          id={`task-text-${task.id}`}
          className={`font-sans text-sm md:text-base leading-snug break-words transition-all duration-300 ${
            task.completed 
              ? 'text-stone-400 line-through decoration-stone-300/80 decoration-2' 
              : 'text-stone-800 font-medium'
          }`}
        >
          {task.text}
        </p>

        {/* Task Metadata row */}
        <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-xs text-stone-500">
          {/* Priority Pill */}
          <span
            id={`badge-priority-${task.id}`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              priorityStyles[task.priority].bg
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priorityStyles[task.priority].dot}`} />
            {task.priority}
          </span>

          {/* Reminder Metadata Badge */}
          {task.reminderTime && (
            <span
              id={`badge-reminder-${task.id}`}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-semibold ${
                task.completed
                  ? 'bg-stone-100 border-stone-200/50 text-stone-400'
                  : isReminderAlerting
                    ? 'bg-rose-100 border-rose-200 text-rose-800'
                    : 'bg-stone-50 border-stone-200/40 text-stone-600'
              }`}
            >
              <Clock className="w-3" />
              <span>⏰ {task.reminderTime}</span>
              
              {/* Alert Mode active indicator */}
              {isReminderAlerting && !task.completed && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </span>
          )}

          {/* Overdue Check / Alerts Banner */}
          {isReminderAlerting && !task.completed && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 bg-rose-100/55 rounded border border-rose-200/40 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              <span>REMINDER ALERT!</span>
            </span>
          )}
        </div>
      </div>

      {/* 3. Actions Button Column */}
      <div className="flex items-center gap-1.5 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 self-center">
        {/* Dismiss Reminder Button */}
        {task.reminderTime && isReminderAlerting && !task.completed && (
          <button
            id={`btn-dismiss-reminder-${task.id}`}
            type="button"
            onClick={() => onDismissReminder(task.id)}
            className="p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-100/80 rounded-xl transition-colors cursor-pointer"
            title="Snooze / Dismiss active reminder alert"
          >
            <BellOff className="w-4 h-4" />
          </button>
        )}

        {/* Edit Button */}
        <button
          id={`btn-edit-task-${task.id}`}
          type="button"
          onClick={() => onEdit(task)}
          className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          title="Edit task checklist parameters"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        {/* Delete button */}
        <button
          id={`btn-delete-task-${task.id}`}
          type="button"
          onClick={() => onDelete(task.id)}
          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
          title="Delete task item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

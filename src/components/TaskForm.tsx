/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Clock, AlertCircle, Save, X, Calendar } from 'lucide-react';
import { Task } from '../types';

interface TaskFormProps {
  initialTask?: Task | null; // If provided, we are in EDIT mode
  activeDate: string; // Active calendar date YYYY-MM-DD
  onSubmit: (taskData: {
    text: string;
    priority: 'Low' | 'Medium' | 'High';
    reminderTime: string;
    date: string;
  }) => void;
  onCancel?: () => void;
}

export function TaskForm({ initialTask, activeDate, onSubmit, onCancel }: TaskFormProps) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [taskDate, setTaskDate] = useState(activeDate);

  // Sync state if form switches edit targets or if active date changes
  useEffect(() => {
    if (initialTask) {
      setText(initialTask.text);
      setPriority(initialTask.priority);
      setTaskDate(initialTask.date);
      if (initialTask.reminderTime) {
        setHasReminder(true);
        setReminderTime(initialTask.reminderTime);
      } else {
        setHasReminder(false);
        setReminderTime('09:00');
      }
    } else {
      // Clear for new task on current active date
      setText('');
      setPriority('Medium');
      setHasReminder(false);
      setReminderTime('09:00');
      setTaskDate(activeDate);
    }
  }, [initialTask, activeDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    onSubmit({
      text: text.trim(),
      priority,
      reminderTime: hasReminder ? reminderTime : '',
      date: taskDate,
    });

    // Reset fields if creating a new task
    if (!initialTask) {
      setText('');
      setHasReminder(false);
    }
  };

  return (
    <form
      id={initialTask ? `edit-task-form-${initialTask.id}` : 'create-task-form'}
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <h3 className="font-display font-semibold text-stone-800 flex items-center gap-2">
          {initialTask ? (
            <>
              <Save className="w-4 h-4 text-amber-500" />
              <span>Edit Checklist Task</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5 text-indigo-600" />
              <span>Create Checklist Task</span>
            </>
          )}
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-50 transition-colors"
            title="Cancel editing"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Task input description */}
      <div className="space-y-1.5ClassName">
        <label htmlFor="task-text-input" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
          Task Description
        </label>
        <input
          id="task-text-input"
          type="text"
          required
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Drink 3 liters of water, Workout, etc."
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-950 focus:border-transparent transition-all placeholder-stone-400 font-sans text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Priority buttons */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Priority Tag
          </label>
          <div id="priority-options-group" className="grid grid-cols-3 gap-2">
            {(['Low', 'Medium', 'High'] as const).map((level) => {
              const colors = {
                Low: {
                  selected: 'bg-emerald-50 text-emerald-700 border-emerald-400 ring-emerald-100',
                  hover: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                },
                Medium: {
                  selected: 'bg-amber-50 text-amber-700 border-amber-400 ring-amber-100',
                  hover: 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                },
                High: {
                  selected: 'bg-rose-50 text-rose-700 border-rose-400 ring-rose-100',
                  hover: 'hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                }
              };

              const isSelected = priority === level;

              return (
                <button
                  key={level}
                  id={`btn-priority-${level.toLowerCase()}`}
                  type="button"
                  onClick={() => setPriority(level)}
                  className={`py-2 px-2.5 text-xs font-medium rounded-xl border transition-all text-center cursor-pointer ${
                    isSelected
                      ? `${colors[level].selected} font-semibold ring-2 shadow-sm`
                      : `bg-stone-50 text-stone-600 border-stone-200/50 ${colors[level].hover}`
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Date */}
        <div className="space-y-2">
          <label htmlFor="task-date-input" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Target Date
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="task-date-input"
              type="date"
              required
              value={taskDate}
              onChange={(e) => setTaskDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-950 transition-all font-sans"
            />
          </div>
        </div>
      </div>

      {/* Reminder settings */}
      <div className="border-t border-stone-100 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-medium text-stone-700">Set Reminder Alarm</span>
          </div>
          <div className="relative inline-flex items-center cursor-pointer select-none">
            <input
              id="toggle-reminder"
              type="checkbox"
              checked={hasReminder}
              onChange={(e) => setHasReminder(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-stone-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-stone-950 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900" />
          </div>
        </div>

        {hasReminder && (
          <div
            id="reminder-time-config"
            className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200/40 animate-fadeIn"
          >
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Reminder Time:
            </span>
            <input
              id="reminder-time-picker"
              type="time"
              required={hasReminder}
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="px-3 py-1.5 text-sm font-medium border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-950 bg-white"
            />
            <AlertCircle className="w-4 h-4 text-stone-400 ml-auto hidden sm:block" />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-3">
        {onCancel && (
          <button
            id="btn-cancel-task"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-50 active:bg-stone-150 border border-stone-250 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          id="btn-submit-task"
          type="submit"
          className="px-5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 active:bg-stone-950 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          {initialTask ? (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Update Task</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Checklist</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

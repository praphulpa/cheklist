/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

export function CalendarStrip({ selectedDate, onSelectDate }: CalendarStripProps) {
  // Convert selectedDate string to a real Local Date object
  const currentDateObj = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDate]);

  // Format Helper: date object to YYYY-MM-DD in local timezone
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Generate 7 days centered loosely near the selected date (e.g., selected date in middle, or starting from 3 days back)
  const daysRange = useMemo(() => {
    const list: Date[] = [];
    // Start from 3 days before current date object
    for (let i = -3; i <= 3; i++) {
      const d = new Date(currentDateObj);
      d.setDate(currentDateObj.getDate() + i);
      list.push(d);
    }
    return list;
  }, [currentDateObj]);

  const handlePrevDay = () => {
    const prevDate = new Date(currentDateObj);
    prevDate.setDate(currentDateObj.getDate() - 1);
    onSelectDate(formatDateString(prevDate));
  };

  const handleNextDay = () => {
    const nextDate = new Date(currentDateObj);
    nextDate.setDate(currentDateObj.getDate() + 1);
    onSelectDate(formatDateString(nextDate));
  };

  const handleGoToToday = () => {
    onSelectDate(formatDateString(new Date()));
  };

  // Helper arrays for names
  const weekDaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const headerMonthYear = `${months[currentDateObj.getMonth()]} ${currentDateObj.getFullYear()}`;

  return (
    <div id="calendar-strip-container" className="bg-white rounded-2xl border border-stone-200/80 p-4 md:p-5 shadow-sm">
      {/* Title / Calendar Action Header */}
      <div id="calendar-header" className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-stone-500" />
          <h3 className="font-display font-semibold text-lg text-stone-800 tracking-tight">
            {headerMonthYear}
          </h3>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Today Button */}
          <button
            id="btn-goto-today"
            type="button"
            onClick={handleGoToToday}
            className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 rounded-lg transition-colors border border-stone-200/40 cursor-pointer"
          >
            Today
          </button>

          {/* Native Date Picker Helper */}
          <div className="relative group flex items-center">
            <input
              id="calendar-native-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  onSelectDate(e.target.value);
                }
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
            <button
              type="button"
              className="p-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-all border border-stone-200/40"
              aria-label="Select custom date"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center border border-stone-200/60 rounded-lg overflow-hidden bg-stone-50/50">
            <button
              id="btn-prev-day"
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              aria-label="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-stone-200" />
            <button
              id="btn-next-day"
              type="button"
              onClick={handleNextDay}
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              aria-label="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Date Strip Cards */}
      <div id="calendar-day-strip" className="grid grid-cols-7 gap-1.5">
        {daysRange.map((date, idx) => {
          const dateStr = formatDateString(date);
          const isSelected = dateStr === selectedDate;
          const isTdy = formatDateString(new Date()) === dateStr;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <button
              key={idx}
              id={`day-card-${dateStr}`}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-stone-900 text-white shadow-md shadow-stone-900/10 scale-[1.03]'
                  : 'hover:bg-stone-100 text-stone-700 bg-stone-50/30'
              }`}
            >
              {/* Day Short Name */}
              <span className={`text-[10px] font-semibold tracking-wider uppercase mb-1 ${
                isSelected 
                  ? 'text-stone-300' 
                  : isWeekend 
                    ? 'text-stone-400' 
                    : 'text-stone-500'
              }`}>
                {weekDaysShort[date.getDay()]}
              </span>
              {/* Day Number */}
              <span className="font-display text-base font-bold leading-tight">
                {date.getDate()}
              </span>
              {/* Today Accent Dot */}
              {isTdy && (
                <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-red-500'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

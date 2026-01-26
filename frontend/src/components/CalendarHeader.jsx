import React from 'react';
import Button from './ui/Button';
import { ChevronLeft, ChevronRight, Calendar, List, Grid3X3, Grid } from 'lucide-react';
import clsx from 'clsx';

const CalendarHeader = ({ title, view, onViewChange, onPrev, onNext, onToday }) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 p-4 card bg-card">
      <div className="flex items-center gap-4 w-full md:w-auto">
        <Button variant="secondary" size="sm" onClick={onToday} className="hidden md:flex">
          Today
        </Button>

        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            className="p-1 rounded hover:bg-surface text-text-secondary hover:text-primary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={onNext}
            className="p-1 rounded hover:bg-surface text-text-secondary hover:text-primary transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <h2 className="text-xl font-bold truncate">
          {title}
        </h2>
      </div>

      <div className="flex p-1 bg-surface rounded-lg border border-border w-full md:w-auto">
        <ViewOption
          active={view === 'dayGridMonth'}
          onClick={() => onViewChange('dayGridMonth')}
          icon={<Grid size={16} />}
          label="Month"
        />
        <ViewOption
          active={view === 'timeGridWeek'}
          onClick={() => onViewChange('timeGridWeek')}
          icon={<Grid3X3 size={16} />}
          label="Week"
        />
        <ViewOption
          active={view === 'timeGridDay'}
          onClick={() => onViewChange('timeGridDay')}
          icon={<Calendar size={16} />}
          label="Day"
        />
        <ViewOption
          active={view === 'listMonth'}
          onClick={() => onViewChange('listMonth')}
          icon={<List size={16} />}
          label="List"
        />
      </div>
    </div>
  );
};

const ViewOption = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={clsx(
      'flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
      active
        ? 'bg-primary text-white shadow-sm'
        : 'text-text-secondary hover:text-text-primary hover:bg-card'
    )}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default CalendarHeader;

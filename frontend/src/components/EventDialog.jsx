import React from 'react';
import Modal from './ui/Modal';
import { Clock, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import Button from './ui/Button';

const EventDialog = ({ open, onClose, event }) => {
  if (!event) return null;

  // Extended props might contain custom data from backend
  const { extendedProps } = event;
  const start = event.start;
  const end = event.end || event.start;

  // Helper to format date range
  const getDateRange = () => {
    if (!start) return '';
    if (event.allDay) {
      return format(start, 'PPP');
    }
    return `${format(start, 'PPP p')} - ${format(end, 'p')}`;
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white font-bold text-lg">
            {extendedProps?.userName?.charAt(0) || <User size={20} />}
          </div>
          <div>
            <div className="font-semibold">{extendedProps?.userEmail || 'Team Member'}</div>
            <div className="text-xs text-text-secondary">{extendedProps?.userName}</div>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-primary">
              {event.title}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${event.backgroundColor === 'var(--danger-color)'
              ? 'bg-danger/10 text-danger'
              : 'bg-primary/10 text-primary'
              }`} style={{
                color: event.backgroundColor === 'var(--danger-color)' ? 'var(--danger-color)' : 'var(--primary-color)',
                backgroundColor: event.backgroundColor === 'var(--danger-color)' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)'
              }}>
              {extendedProps?.category || 'Holiday'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-text-secondary">
          <Calendar size={20} />
          <span>{getDateRange()}</span>
        </div>

        {extendedProps?.description && (
          <div className="p-3 bg-surface rounded-md border border-border text-sm text-text-secondary">
            {extendedProps.description}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};

export default EventDialog;

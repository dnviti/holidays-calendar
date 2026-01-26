import React, { useState } from 'react';
import Modal from './ui/Modal';
import { Clock, Calendar, User, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Button from './ui/Button';
import EventForm from './EventForm';

const EventDialog = ({ open, onClose, event, onUpdate, onDelete }) => {
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

  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleEdit = () => {
    // Open edit dialog instead of just calling onUpdate
    setShowEditDialog(true);
  };

  const handleEditSubmit = async (updatedData) => {
    try {
      // In a real implementation, we would call the API to update the event
      // For now, we'll just close the dialog and call onUpdate with the updated data
      if (onUpdate) {
        onUpdate({...event, ...updatedData});
      }
      setShowEditDialog(false);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      if (onDelete && event.id) {
        onDelete(event.id);
        onClose();
      }
    }
  };

  return (
    <>
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

          <div className="flex justify-between pt-4">
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                onClick={handleEdit}
                startIcon={<Edit size={16} />}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                startIcon={<Trash2 size={16} />}
              >
                Delete
              </Button>
            </div>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Event Dialog */}
      {showEditDialog && (
        <Modal
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          title="Edit Event"
        >
          <EventForm
            initialData={{
              title: event.title,
              description: event.extendedProps?.description || '',
              start_date: event.start ? event.start.toISOString().split('T')[0] : '',
              end_date: event.end ? event.end.toISOString().split('T')[0] : event.start ? event.start.toISOString().split('T')[0] : '',
              start_time: event.extendedProps?.start_time || '09:00',
              end_time: event.extendedProps?.end_time || '17:00',
              event_type: event.extendedProps?.event_type || 'holiday',
              visibility: event.extendedProps?.visibility || 'private',
              is_all_day: event.allDay || event.extendedProps?.is_all_day || false,
              location: event.extendedProps?.location || '',
              color: event.extendedProps?.color || '#3B82F6',
              business_unit_id: event.extendedProps?.business_unit_id || ''
            }}
            onSubmit={handleEditSubmit}
            onCancel={() => setShowEditDialog(false)}
            businessUnits={[]} // Pass business units if available
          />
        </Modal>
      )}
    </>
  );
};

export default EventDialog;

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Avatar,
  Divider,
  IconButton
} from '@mui/material';
import {
  CalendarToday,
  Edit,
  Delete,
  Close
} from '@mui/icons-material';
import { format } from 'date-fns';
import EventForm from './EventForm';

const EventDialog = ({ open, onClose, event, onUpdate, onDelete, businessUnits = [] }) => {
  const [showEditDialog, setShowEditDialog] = useState(false);

  if (!event) return null;

  const { extendedProps } = event;
  const start = event.start;
  const end = event.end || event.start;

  const getDateRange = () => {
    if (!start) return '';
    if (event.allDay) {
      return format(start, 'PPP');
    }
    return `${format(start, 'PPP p')} - ${format(end, 'p')}`;
  };

  const handleEdit = () => {
    setShowEditDialog(true);
  };

  const handleEditSubmit = async (updatedData) => {
    try {
      if (onUpdate) {
        await onUpdate({ id: event.id, ...updatedData });
      }
      setShowEditDialog(false);
      onClose();
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
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  width: 48,
                  height: 48,
                  fontSize: '1.25rem',
                  fontWeight: 600
                }}
              >
                {extendedProps?.userName?.charAt(0)?.toUpperCase() || 'T'}
              </Avatar>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                  {extendedProps?.userName || 'Team Member'}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h5" component="h3" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {event.title}
              </Typography>
              <Chip
                label={extendedProps?.eventType?.replace('_', ' ') || extendedProps?.category || 'Event'}
                color="primary"
                size="small"
                sx={{ fontWeight: 500 }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
              <CalendarToday sx={{ fontSize: 20 }} />
              <Typography variant="body1">{getDateRange()}</Typography>
            </Box>

            {extendedProps?.description && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {extendedProps.description}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEdit}
              size="small"
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={handleDelete}
              size="small"
            >
              Delete
            </Button>
          </Box>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Event Dialog */}
      {showEditDialog && (
        <Dialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          maxWidth="sm"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: 2
              }
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>Edit Event</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 3 }}>
            <EventForm
              initialData={{
                title: event.title,
                description: event.extendedProps?.description || '',
                start_date: event.start ? event.start.toISOString().split('T')[0] : '',
                end_date: event.end ? event.end.toISOString().split('T')[0] : event.start ? event.start.toISOString().split('T')[0] : '',
                start_time: event.extendedProps?.start_time || '09:00',
                end_time: event.extendedProps?.end_time || '17:00',
                event_type: event.extendedProps?.eventType || 'holiday',
                visibility: event.extendedProps?.visibility || 'private',
                is_all_day: event.allDay || event.extendedProps?.is_all_day || false,
                location: event.extendedProps?.location || '',
                color: event.extendedProps?.color || '#3B82F6',
                business_unit_id: event.extendedProps?.business_unit_id || ''
              }}
              onSubmit={handleEditSubmit}
              onCancel={() => setShowEditDialog(false)}
              businessUnits={businessUnits}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default EventDialog;

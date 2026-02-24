import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  TextField,
  Divider,
  Alert,
  IconButton
} from '@mui/material';
import {
  CalendarToday,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  Warning,
  Close
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const HolidayDialog = ({ open, onClose, event, onUpdate, onDelete, onApprove, onReject, onRequestChange, onEditRequest, businessUnits = [] }) => {
  const { t } = useTranslation('forms');
  const { user } = useAuth();
  const [showManagerNotes, setShowManagerNotes] = useState(false);
  const [managerNotes, setManagerNotes] = useState('');
  const [actionType, setActionType] = useState(null); // 'approve', 'reject', 'request_change'

  if (!event) return null;

  const { extendedProps } = event;
  const start = event.start;
  const end = event.end || event.start;

  const getDateRange = () => {
    if (!start) return '';
    const startStr = format(start, 'PPP');
    if (start.getTime() === end.getTime()) {
      return startStr;
    }
    return `${startStr} - ${format(end, 'PPP')}`;
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      pending: { color: 'warning', icon: <Warning sx={{ fontSize: 16 }} />, label: t('status.pending') },
      approved: { color: 'success', icon: <CheckCircle sx={{ fontSize: 16 }} />, label: t('status.approved') },
      rejected: { color: 'error', icon: <Cancel sx={{ fontSize: 16 }} />, label: t('status.rejected') },
      change_requested: { color: 'warning', icon: <Warning sx={{ fontSize: 16 }} />, label: t('status.changeRequested') },
      cancelled: { color: 'default', icon: <Cancel sx={{ fontSize: 16 }} />, label: t('status.cancelled') }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
        sx={{ fontWeight: 500 }}
      />
    );
  };

  const getHolidayTypeLabel = (type) => {
    const types = {
      vacation: t('types.vacation'),
      sick_leave: t('types.sick_leave'),
      personal: t('types.personal'),
      parental: t('types.parental'),
      other: t('types.other')
    };
    return types[type] || type;
  };

  const handleEdit = () => {
    const eventData = {
      id: event.id,
      title: event.title,
      description: extendedProps?.description || '',
      start_date: start ? format(start, 'yyyy-MM-dd') : '',
      end_date: end ? format(end, 'yyyy-MM-dd') : '',
      holiday_type: extendedProps?.holidayType || 'vacation',
      is_half_day: extendedProps?.is_half_day || false,
      half_day_period: extendedProps?.half_day_period || 'morning',
      business_unit_id: extendedProps?.business_unit_id || ''
    };
    if (onEditRequest) {
      onEditRequest(eventData);
    }
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(t('confirmations.deleteLeaveRequest'))) {
      if (onDelete && event.id) {
        onDelete(event.id);
        onClose();
      }
    }
  };

  const handleManagerAction = (action) => {
    setActionType(action);
    if (action === 'approve') {
      // For approve, notes are optional
      if (window.confirm(t('confirmations.approveLeaveRequest'))) {
        if (onApprove) {
          onApprove(event.id, null);
          onClose();
        }
      }
    } else {
      // For reject and request_change, show notes input
      setShowManagerNotes(true);
    }
  };

  const handleSubmitManagerAction = () => {
    if (!managerNotes && actionType !== 'approve') {
      alert(t('confirmations.provideNotes'));
      return;
    }

    if (actionType === 'reject' && onReject) {
      onReject(event.id, managerNotes);
    } else if (actionType === 'request_change' && onRequestChange) {
      onRequestChange(event.id, managerNotes);
    }

    setShowManagerNotes(false);
    setManagerNotes('');
    setActionType(null);
    onClose();
  };

  const canEdit = user && extendedProps?.user_id === user.id && extendedProps?.status === 'pending';
  const canDelete = user && extendedProps?.user_id === user.id;
  const canManage = user && (user.role === 'admin' || user.role === 'manager') && extendedProps?.status === 'pending';

  return (
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
                  {extendedProps?.userName || t('dialog.teamMember')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {getHolidayTypeLabel(extendedProps?.holidayType)}
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
          {!showManagerNotes ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h5" component="h3" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {event.title}
                </Typography>
                {getStatusChip(extendedProps?.status)}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                <CalendarToday sx={{ fontSize: 20 }} />
                <Typography variant="body1">{getDateRange()}</Typography>
                {extendedProps?.is_half_day && (
                  <Chip
                    label={`${t('dialog.halfDay')} (${extendedProps.half_day_period === 'morning' ? t('leaveRequest.morning') : t('leaveRequest.afternoon')})`}
                    size="small"
                    color="info"
                    sx={{ ml: 1 }}
                  />
                )}
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

              {extendedProps?.has_overlap && (
                <Alert severity="warning" icon={<Warning />}>
                  <Typography variant="body2" fontWeight={500}>
                    {t('dialog.teamOverlap')}
                  </Typography>
                  <Typography variant="caption">
                    {t('dialog.teamOverlapMessage')}
                  </Typography>
                </Alert>
              )}

              {extendedProps?.manager_notes && (
                <Alert severity="info">
                  <Typography variant="body2" fontWeight={500} gutterBottom>
                    {t('dialog.managerNotes')}
                  </Typography>
                  <Typography variant="body2">
                    {extendedProps.manager_notes}
                  </Typography>
                </Alert>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={actionType === 'reject' ? t('dialog.rejectionReason') : t('dialog.changeRequestNotes')}
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                multiline
                rows={4}
                fullWidth
                required
                placeholder={t('dialog.provideFeedback')}
                variant="outlined"
              />
            </Box>
          )}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2, gap: 1 }}>
          {!showManagerNotes ? (
            <>
              <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
                {canEdit && (
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={handleEdit}
                    size="small"
                  >
                    {t('dialog.edit')}
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={handleDelete}
                    size="small"
                  >
                    {t('dialog.cancelRequest')}
                  </Button>
                )}
              </Box>

              {canManage ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => handleManagerAction('approve')}
                  >
                    {t('dialog.approve')}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleManagerAction('request_change')}
                  >
                    {t('dialog.requestChange')}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={() => handleManagerAction('reject')}
                  >
                    {t('dialog.reject')}
                  </Button>
                </Box>
              ) : (
                !canEdit && !canDelete && (
                  <Button variant="outlined" onClick={onClose}>
                    {t('dialog.close')}
                  </Button>
                )
              )}
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowManagerNotes(false);
                  setManagerNotes('');
                  setActionType(null);
                }}
              >
                {t('leaveRequest.cancel')}
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmitManagerAction}
              >
                {t('dialog.submit')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
  );
};

export default HolidayDialog;

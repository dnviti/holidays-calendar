import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  Divider
} from '@mui/material';
import HolidayForm from './HolidayForm';
import { createHoliday, updateHoliday } from '../services/holidayService';

const LeaveRequestDialog = ({ open, onClose, onSuccess, selectedDate, editData = null, businessUnits = [], selectedBusinessUnit = null }) => {
  const { t } = useTranslation('forms');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!editData?.id;

  const handleSubmit = async (holidayData) => {
    setLoading(true);
    setError('');

    try {
      let result;
      if (isEditMode) {
        result = await updateHoliday(editData.id, holidayData);
      } else {
        result = await createHoliday(holidayData);
      }
      onSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message || (isEditMode ? t('leaveRequest.updateFailed') : t('leaveRequest.createFailed')));
    } finally {
      setLoading(false);
    }
  };

  const formInitialData = isEditMode
    ? editData
    : selectedDate
      ? { start_date: selectedDate, end_date: selectedDate }
      : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2
          }
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, pb: 2 }}>
        {isEditMode ? t('leaveRequest.editTitle') : t('leaveRequest.title')}
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3, maxHeight: '80vh', overflowY: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <HolidayForm
          key={editData?.id || 'create'}
          initialData={formInitialData}
          onSubmit={handleSubmit}
          onCancel={onClose}
          businessUnits={businessUnits}
          selectedBusinessUnit={selectedBusinessUnit}
          loading={loading}
        />
      </DialogContent>
    </Dialog>
  );
};

export default LeaveRequestDialog;

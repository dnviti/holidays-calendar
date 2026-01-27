import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  Divider
} from '@mui/material';
import HolidayForm from './HolidayForm';
import { createHoliday } from '../services/holidayService';

const HolidayCreationDialog = ({ open, onClose, onSuccess, selectedDate, businessUnits = [], selectedBusinessUnit = null }) => {
  const { t } = useTranslation('forms');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && selectedDate) {
      // Pre-populate form with selected date
    }
  }, [open, selectedDate]);

  const handleCreateHoliday = async (holidayData) => {
    setLoading(true);
    setError('');

    try {
      // If a date was selected, use it as the start/end date
      if (selectedDate) {
        holidayData.start_date = selectedDate;
        holidayData.end_date = selectedDate;
      }

      const newHoliday = await createHoliday(holidayData);
      onSuccess(newHoliday);
      onClose();
    } catch (err) {
      setError(err.message || t('leaveRequest.createFailed'));
    } finally {
      setLoading(false);
    }
  };

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
        {t('leaveRequest.title')}
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3, maxHeight: '80vh', overflowY: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <HolidayForm
          initialData={selectedDate ? { start_date: selectedDate, end_date: selectedDate } : null}
          onSubmit={handleCreateHoliday}
          onCancel={onClose}
          businessUnits={businessUnits}
          selectedBusinessUnit={selectedBusinessUnit}
          loading={loading}
        />
      </DialogContent>
    </Dialog>
  );
};

export default HolidayCreationDialog;

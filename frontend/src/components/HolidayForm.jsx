import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  FormControlLabel,
  Checkbox,
  Box,
  Stack,
  Grid,
  CircularProgress
} from '@mui/material';
import { checkOverlaps } from '../services/holidayService';
import { toast } from 'sonner';
import TeamAvailabilityPanel from './TeamAvailabilityPanel';

const HolidayForm = ({ onSubmit, onCancel, initialData = null, businessUnits = [], selectedBusinessUnit = null, loading = false }) => {
  const { t } = useTranslation('forms');
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    start_date: initialData?.start_date || format(new Date(), 'yyyy-MM-dd'),
    end_date: initialData?.end_date || format(new Date(), 'yyyy-MM-dd'),
    holiday_type: initialData?.holiday_type || 'vacation',
    is_half_day: initialData?.is_half_day || false,
    half_day_period: initialData?.half_day_period || 'morning',
    business_unit_id: initialData?.business_unit_id || selectedBusinessUnit || ''
  });

  const [checkingOverlaps, setCheckingOverlaps] = useState(false);
  const [overlaps, setOverlaps] = useState(null);

  // Auto-select the BU when there is only one available and none is pre-selected
  useEffect(() => {
    if (!formData.business_unit_id && businessUnits.length === 1) {
      setFormData(prev => ({ ...prev, business_unit_id: businessUnits[0].id }));
    }
  }, [businessUnits, formData.business_unit_id]);

  const holidayTypeOptions = [
    { value: 'vacation', label: t('types.vacation') },
    { value: 'sick_leave', label: t('types.sick_leave') },
    { value: 'personal', label: t('types.personal') },
    { value: 'parental', label: t('types.parental') },
    { value: 'other', label: t('types.other') }
  ];

  const halfDayPeriodOptions = [
    { value: 'morning', label: t('leaveRequest.morning') },
    { value: 'afternoon', label: t('leaveRequest.afternoon') }
  ];

  useEffect(() => {
    // Check for overlaps when dates change
    const checkForOverlaps = async () => {
      if (formData.start_date && formData.end_date && formData.business_unit_id) {
        setCheckingOverlaps(true);
        try {
          const result = await checkOverlaps(
            formData.business_unit_id,
            formData.start_date,
            formData.end_date,
            initialData?.id
          );
          setOverlaps(result);
        } catch (error) {
          console.error('Error checking overlaps:', error);
        } finally {
          setCheckingOverlaps(false);
        }
      }
    };

    // Debounce overlap checking
    const timeoutId = setTimeout(checkForOverlaps, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.start_date, formData.end_date, formData.business_unit_id, initialData?.id]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate dates
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error(t('validation.endDateAfterStart'));
      return;
    }

    // Validate business unit
    if (!formData.business_unit_id) {
      toast.error(t('validation.selectBusinessUnit'));
      return;
    }

    onSubmit(formData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <TextField
          fullWidth
          label={t('labels.title')}
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          required
          placeholder={t('placeholders.titleExample')}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <TextField
          fullWidth
          label={t('labels.description')}
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          multiline
          rows={3}
          placeholder={t('placeholders.descriptionOptional')}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <FormControl fullWidth required>
          <InputLabel>{t('labels.businessUnit')}</InputLabel>
          <Select
            name="business_unit_id"
            value={formData.business_unit_id}
            onChange={handleInputChange}
            label={t('labels.businessUnit')}
          >
            {businessUnits.map(bu => (
              <MenuItem key={bu.id} value={bu.id}>
                {bu.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('labels.startDate')}
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleInputChange}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('labels.endDate')}
              name="end_date"
              type="date"
              value={formData.end_date}
              onChange={handleInputChange}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
        </Grid>

        <FormControl fullWidth>
          <InputLabel>{t('leaveRequest.leaveType')}</InputLabel>
          <Select
            name="holiday_type"
            value={formData.holiday_type}
            onChange={handleInputChange}
            label={t('leaveRequest.leaveType')}
          >
            {holidayTypeOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Checkbox
              name="is_half_day"
              checked={formData.is_half_day}
              onChange={handleInputChange}
            />
          }
          label={t('leaveRequest.halfDay')}
        />

        {formData.is_half_day && (
          <FormControl fullWidth>
            <InputLabel>{t('leaveRequest.halfDayPeriod')}</InputLabel>
            <Select
              name="half_day_period"
              value={formData.half_day_period}
              onChange={handleInputChange}
              label={t('leaveRequest.halfDayPeriod')}
            >
              {halfDayPeriodOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {(formData.start_date && formData.end_date && formData.business_unit_id) && (
          <TeamAvailabilityPanel
            loading={checkingOverlaps}
            overlaps={overlaps}
            startDate={formData.start_date}
            endDate={formData.end_date}
          />
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2 }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
          >
            {t('leaveRequest.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (initialData ? t('leaveRequest.update') : t('leaveRequest.submit'))}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default HolidayForm;

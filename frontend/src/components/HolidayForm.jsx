import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import { Card } from './ui/Card';
import { checkOverlaps } from '../services/holidayService';
import { toast } from 'sonner';

const HolidayForm = ({ onSubmit, onCancel, initialData = null, businessUnits = [], selectedBusinessUnit = null }) => {
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

  const holidayTypeOptions = [
    { value: 'vacation', label: 'Vacation' },
    { value: 'sick_leave', label: 'Sick Leave' },
    { value: 'personal', label: 'Personal' },
    { value: 'parental', label: 'Parental Leave' },
    { value: 'other', label: 'Other' }
  ];

  const halfDayPeriodOptions = [
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' }
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
      toast.error('End date must be after or equal to start date');
      return;
    }

    // Validate business unit
    if (!formData.business_unit_id) {
      toast.error('Please select a business unit');
      return;
    }

    onSubmit(formData);
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Title *</label>
          <Input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            placeholder="e.g., Summer Vacation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Optional details about your leave"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Business Unit *</label>
          <Select
            name="business_unit_id"
            value={formData.business_unit_id}
            onChange={handleInputChange}
            options={businessUnits.map(bu => ({ value: bu.id, label: bu.name }))}
            placeholder="Select a business unit"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Start Date *</label>
            <Input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">End Date *</label>
            <Input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Leave Type</label>
          <Select
            name="holiday_type"
            value={formData.holiday_type}
            onChange={handleInputChange}
            options={holidayTypeOptions}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_half_day"
            name="is_half_day"
            checked={formData.is_half_day}
            onChange={handleInputChange}
            className="mr-2"
          />
          <label htmlFor="is_half_day" className="text-sm font-medium text-text-secondary">Half Day</label>
        </div>

        {formData.is_half_day && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Half Day Period</label>
            <Select
              name="half_day_period"
              value={formData.half_day_period}
              onChange={handleInputChange}
              options={halfDayPeriodOptions}
            />
          </div>
        )}

        {checkingOverlaps && (
          <div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
            Checking for overlapping holidays...
          </div>
        )}

        {overlaps?.has_overlaps && (
          <div className="p-3 bg-amber-50 text-amber-700 rounded-md text-sm">
            <p className="font-medium mb-1">⚠️ Overlap Warning</p>
            <p className="mb-2">The following team members are also off during this period:</p>
            <ul className="list-disc list-inside">
              {overlaps.overlapping_holidays.map((h) => (
                <li key={h.id}>
                  {h.user_name}: {format(new Date(h.start_date), 'MMM dd')} - {format(new Date(h.end_date), 'MMM dd')}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {initialData ? 'Update Request' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default HolidayForm;

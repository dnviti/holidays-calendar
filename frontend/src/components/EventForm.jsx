import React, { useState } from 'react';
import { format } from 'date-fns';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import { Card } from './ui/Card';

const EventForm = ({ onSubmit, onCancel, initialData = null, businessUnits = [] }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    start_date: initialData?.start_date || format(new Date(), 'yyyy-MM-dd'),
    end_date: initialData?.end_date || format(new Date(), 'yyyy-MM-dd'),
    start_time: initialData?.start_time || '09:00',
    end_time: initialData?.end_time || '17:00',
    event_type: initialData?.event_type || 'other',
    visibility: initialData?.visibility || 'private',
    is_all_day: initialData?.is_all_day !== undefined ? initialData.is_all_day : true,
    location: initialData?.location || '',
    color: initialData?.color || '#3B82F6',
    business_unit_id: initialData?.business_unit_id || ''
  });

  const eventTypeOptions = [
    { value: 'holiday', label: 'Holiday' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'conference', label: 'Conference' },
    { value: 'training', label: 'Training' },
    { value: 'team_building', label: 'Team Building' },
    { value: 'company_event', label: 'Company Event' },
    { value: 'personal', label: 'Personal' },
    { value: 'other', label: 'Other' }
  ];

  const visibilityOptions = [
    { value: 'private', label: 'Private' },
    { value: 'public', label: 'Public' },
    { value: 'business_unit', label: 'Business Unit' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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
            placeholder="Event title"
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
            placeholder="Event description"
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

        {!formData.is_all_day && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Start Time</label>
              <Input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleInputChange}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">End Time</label>
              <Input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleInputChange}
              />
            </div>
          </div>
        )}

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_all_day"
            name="is_all_day"
            checked={formData.is_all_day}
            onChange={handleInputChange}
            className="mr-2"
          />
          <label htmlFor="is_all_day" className="text-sm font-medium text-text-secondary">All Day Event</label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Event Type</label>
            <Select
              name="event_type"
              value={formData.event_type}
              onChange={handleInputChange}
              options={eventTypeOptions}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Visibility</label>
            <Select
              name="visibility"
              value={formData.visibility}
              onChange={handleInputChange}
              options={visibilityOptions}
            />
          </div>
        </div>

        {formData.visibility === 'business_unit' && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Business Unit</label>
            <Select
              name="business_unit_id"
              value={formData.business_unit_id}
              onChange={handleInputChange}
              options={businessUnits.map(bu => ({ value: bu.id, label: bu.name }))}
              placeholder="Select a business unit"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Location</label>
          <Input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="Event location"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              name="color"
              value={formData.color}
              onChange={handleInputChange}
              className="w-10 h-10 border border-border rounded cursor-pointer"
            />
            <Input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleInputChange}
              placeholder="#3B82F6"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {initialData ? 'Update Event' : 'Create Event'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default EventForm;
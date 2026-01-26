import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { toast } from 'sonner';

const BusinessUnits = () => {
  const [units, setUnits] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', primary_color: '#3B82F6', secondary_color: '#1E40AF' });

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const response = await api.get('/business-units');
      setUnits(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/business-units', formData);
      toast.success('Business Unit created');
      setIsModalOpen(false);
      fetchUnits();
    } catch (error) {
      toast.error('Failed to create Business Unit');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Business Units</h1>
        <Button onClick={() => setIsModalOpen(true)}>Create New Unit</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {units.map(unit => (
          <Card key={unit.id} className="relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: unit.primary_color }} />
            <div className="pl-4">
              <h3 className="text-xl font-bold mb-2">{unit.name}</h3>
              <p className="text-sm text-secondary mb-4">{unit.description || 'No description'}</p>
              <div className="flex gap-2 text-sm">
                <span className="px-2 py-1 rounded bg-surface border border-border">
                  {unit.member_count || 0} Members
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Business Unit">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Description"
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="color"
              label="Primary Color"
              value={formData.primary_color}
              onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
              className="h-10"
            />
            <Input
              type="color"
              label="Secondary Color"
              value={formData.secondary_color}
              onChange={e => setFormData({ ...formData, secondary_color: e.target.value })}
              className="h-10"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BusinessUnits;

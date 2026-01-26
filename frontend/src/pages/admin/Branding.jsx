import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'sonner';

const AdminBranding = () => {
  const { branding, updateBranding } = useTheme();
  const { register, handleSubmit, reset } = useForm();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (branding) {
      reset(branding);
    }
  }, [branding, reset]);

  const onSubmit = async (data) => {
    try {
      const response = await api.put('/branding', data);
      updateBranding(response.data);
      toast.success('Branding updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update branding');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('logo_type', 'main');

    setUploading(true);
    try {
      const response = await api.post('/branding/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Reload branding to see change
      const brandingRes = await api.get('/branding');
      updateBranding(brandingRes.data);
      toast.success('Logo uploaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Branding & Customization</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Application Name" {...register('app_name')} />

            <div>
              <label className="label">Logo</label>
              <div className="flex items-center gap-4">
                {branding?.logo_url && (
                  <div className="p-2 border border-border rounded bg-surface">
                    <img src={branding.logo_url} alt="Logo" className="h-10" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input type="color" label="Primary Color" {...register('primary_color')} className="h-12" />
            <Input type="color" label="Secondary Color" {...register('secondary_color')} className="h-12" />
            <Input type="color" label="Accent Color" {...register('accent_color')} className="h-12" />
            <Input type="color" label="Info Color" {...register('info_color')} className="h-12" />
            <Input type="color" label="Success Color" {...register('success_color')} className="h-12" />
            <Input type="color" label="Warning Color" {...register('warning_color')} className="h-12" />
            <Input type="color" label="Danger Color" {...register('danger_color')} className="h-12" />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg">Save Changes</Button>
        </div>
      </form>
    </div>
  );
};

export default AdminBranding;

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { toast } from 'sonner';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Avatar
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';

const AdminBranding = () => {
  const { t } = useTranslation('admin');
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBranding, setEditingBranding] = useState(true); // Always editing the single branding config
  const [formData, setFormData] = useState({
    app_name: '',
    logo_url: '',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    accent_color: '#8B5CF6',
    info_color: '#0EA5E9',
    success_color: '#10B981',
    warning_color: '#F59E0B',
    danger_color: '#EF4444'
  });
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const response = await api.get('/branding');
      setBranding(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching branding:', error);
      toast.error(t('branding.messages.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    if (branding) {
      setFormData({
        app_name: branding.app_name || '',
        logo_url: branding.logo_url || '',
        primary_color: branding.primary_color || '#3B82F6',
        secondary_color: branding.secondary_color || '#1E40AF',
        accent_color: branding.accent_color || '#8B5CF6',
        info_color: branding.info_color || '#0EA5E9',
        success_color: branding.success_color || '#10B981',
        warning_color: branding.warning_color || '#F59E0B',
        danger_color: branding.danger_color || '#EF4444'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setLogoFile(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      // Preview the selected image
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          logo_url: event.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (logoFile) {
        // If logo file is selected, use the logo upload endpoint
        const submitData = new FormData();

        // Add all form fields to FormData
        Object.keys(formData).forEach(key => {
          if (key !== 'logo_url') { // Don't add the preview URL to the form data
            submitData.append(key, formData[key]);
          }
        });

        // Add logo file
        submitData.append('file', logoFile);
        submitData.append('logo_type', 'main');

        const response = await api.post('/branding/logo', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setBranding(response.data);
        toast.success(t('branding.messages.updateSuccess'));
      } else {
        // If no logo change, use PUT request with JSON
        const { logo_url, ...jsonFormData } = formData; // Exclude logo_url from JSON submission
        const response = await api.put('/branding', jsonFormData);

        setBranding(response.data);
        toast.success(t('branding.messages.updateSuccess'));
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error(error.response?.data?.detail || t('branding.messages.saveFailed'));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography>Loading branding settings...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Branding Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={handleOpenDialog}
        >
          Edit Branding
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ flex: 1, maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Setting</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Preview</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Application Name</TableCell>
              <TableCell>{branding?.app_name || 'Not set'}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Logo</TableCell>
              <TableCell>{branding?.logo_url ? 'Logo uploaded' : 'No logo'}</TableCell>
              <TableCell>
                {branding?.logo_url && (
                  <Avatar src={branding.logo_url} alt="Logo" sx={{ width: 40, height: 40 }} />
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Primary Color</TableCell>
              <TableCell>{branding?.primary_color || '#3B82F6'}</TableCell>
              <TableCell>
                <Box sx={{
                  width: 30,
                  height: 30,
                  backgroundColor: branding?.primary_color || '#3B82F6',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Secondary Color</TableCell>
              <TableCell>{branding?.secondary_color || '#1E40AF'}</TableCell>
              <TableCell>
                <Box sx={{
                  width: 30,
                  height: 30,
                  backgroundColor: branding?.secondary_color || '#1E40AF',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Accent Color</TableCell>
              <TableCell>{branding?.accent_color || '#8B5CF6'}</TableCell>
              <TableCell>
                <Box sx={{
                  width: 30,
                  height: 30,
                  backgroundColor: branding?.accent_color || '#8B5CF6',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Info Color</TableCell>
              <TableCell>{branding?.info_color || '#0EA5E9'}</TableCell>
              <TableCell>
                <Box sx={{
                  width: 30,
                  height: 30,
                  backgroundColor: branding?.info_color || '#0EA5E9',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Success Color</TableCell>
              <TableCell>{branding?.success_color || '#10B981'}</TableCell>
              <TableCell>
                <Box sx={{
                  width: 30,
                  height: 30,
                  backgroundColor: branding?.success_color || '#10B981',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Warning Color</TableCell>
              <TableCell>{branding?.warning_color || '#F59E0B'}</TableCell>
              <TableCell>
                <Box sx={{
                  width: 30,
                  height: 30,
                  backgroundColor: branding?.warning_color || '#F59E0B',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Danger Color</TableCell>
              <TableCell>{branding?.danger_color || '#EF4444'}</TableCell>
              <TableCell>
                <Box sx={{
                  width: 30,
                  height: 30,
                  backgroundColor: branding?.danger_color || '#EF4444',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Branding Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Branding Configuration
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Update branding configuration below.
          </DialogContentText>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="dense"
              name="app_name"
              label="Application Name"
              fullWidth
              variant="outlined"
              value={formData.app_name}
              onChange={handleChange}
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Logo Upload
              </Typography>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={uploading}
              />
              {formData.logo_url && !logoFile && (
                <Box sx={{ mt: 1 }}>
                  <Avatar src={formData.logo_url} alt="Current Logo" sx={{ width: 50, height: 50 }} />
                </Box>
              )}
              {logoFile && (
                <Box sx={{ mt: 1 }}>
                  <Avatar src={URL.createObjectURL(logoFile)} alt="New Logo" sx={{ width: 50, height: 50 }} />
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 2 }}>
              <TextField
                margin="dense"
                name="primary_color"
                label="Primary Color"
                type="color"
                fullWidth
                variant="outlined"
                value={formData.primary_color}
                onChange={handleChange}
              />

              <TextField
                margin="dense"
                name="secondary_color"
                label="Secondary Color"
                type="color"
                fullWidth
                variant="outlined"
                value={formData.secondary_color}
                onChange={handleChange}
              />

              <TextField
                margin="dense"
                name="accent_color"
                label="Accent Color"
                type="color"
                fullWidth
                variant="outlined"
                value={formData.accent_color}
                onChange={handleChange}
              />

              <TextField
                margin="dense"
                name="info_color"
                label="Info Color"
                type="color"
                fullWidth
                variant="outlined"
                value={formData.info_color}
                onChange={handleChange}
              />

              <TextField
                margin="dense"
                name="success_color"
                label="Success Color"
                type="color"
                fullWidth
                variant="outlined"
                value={formData.success_color}
                onChange={handleChange}
              />

              <TextField
                margin="dense"
                name="warning_color"
                label="Warning Color"
                type="color"
                fullWidth
                variant="outlined"
                value={formData.warning_color}
                onChange={handleChange}
              />

              <TextField
                margin="dense"
                name="danger_color"
                label="Danger Color"
                type="color"
                fullWidth
                variant="outlined"
                value={formData.danger_color}
                onChange={handleChange}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBranding;

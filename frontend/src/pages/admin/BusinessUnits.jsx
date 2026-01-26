import React, { useState, useEffect } from 'react';
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
  Tooltip
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';

const BusinessUnits = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF'
  });

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const response = await api.get('/business-units');
      setUnits(response.data);
    } catch (error) {
      console.error('Error fetching business units:', error);
      toast.error('Failed to fetch business units');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (unit = null) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        name: unit.name,
        description: unit.description || '',
        primary_color: unit.primary_color || '#3B82F6',
        secondary_color: unit.secondary_color || '#1E40AF'
      });
    } else {
      setEditingUnit(null);
      setFormData({
        name: '',
        description: '',
        primary_color: '#3B82F6',
        secondary_color: '#1E40AF'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUnit(null);
    setFormData({
      name: '',
      description: '',
      primary_color: '#3B82F6',
      secondary_color: '#1E40AF'
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingUnit) {
        // Update existing unit
        await api.put(`/business-units/${editingUnit.id}`, formData);
        toast.success('Business Unit updated successfully');
      } else {
        // Create new unit
        await api.post('/business-units', formData);
        toast.success('Business Unit created successfully');
      }

      handleCloseDialog();
      fetchUnits();
    } catch (error) {
      console.error('Error saving business unit:', error);
      toast.error(error.response?.data?.detail || 'Failed to save business unit');
    }
  };

  const handleDelete = async (unitId) => {
    if (window.confirm('Are you sure you want to delete this business unit?')) {
      try {
        await api.delete(`/business-units/${unitId}`);
        toast.success('Business Unit deleted successfully');
        fetchUnits();
      } catch (error) {
        console.error('Error deleting business unit:', error);
        toast.error(error.response?.data?.detail || 'Failed to delete business unit');
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography>Loading business units...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Business Unit Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Business Unit
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ flex: 1, maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Members</TableCell>
              <TableCell>Primary Color</TableCell>
              <TableCell>Secondary Color</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell>{unit.name}</TableCell>
                <TableCell>{unit.description || '-'}</TableCell>
                <TableCell>{unit.member_count || 0}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        backgroundColor: unit.primary_color,
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        mr: 1
                      }}
                    />
                    {unit.primary_color}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        backgroundColor: unit.secondary_color,
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        mr: 1
                      }}
                    />
                    {unit.secondary_color}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="Edit Business Unit">
                      <IconButton size="small" onClick={() => handleOpenDialog(unit)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Business Unit">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(unit.id)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Business Unit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUnit ? 'Edit Business Unit' : 'Create New Business Unit'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editingUnit
              ? 'Update business unit information below.'
              : 'Enter new business unit information.'}
          </DialogContentText>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="dense"
              name="name"
              label="Name"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <TextField
              margin="dense"
              name="description"
              label="Description"
              fullWidth
              variant="outlined"
              value={formData.description}
              onChange={handleChange}
              sx={{ mt: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
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
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUnit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BusinessUnits;

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
  OutlinedInput,
  FormHelperText
} from '@mui/material';
import { Add, Edit, Delete, PersonAdd, Close } from '@mui/icons-material';

const Users = () => {
  const { t } = useTranslation('admin');
  const [users, setUsers] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userBusinessUnits, setUserBusinessUnits] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    display_name: '',
    first_name: '',
    last_name: '',
    role: 'employee',
    password: '',
    business_unit_ids: []
  });

  useEffect(() => {
    fetchUsers();
    fetchBusinessUnits();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Fetching all users...');
      const response = await api.get('/users');
      console.log('All users response:', response.data);
      console.log('Users with business units:', response.data.map(u => ({
        email: u.email,
        business_units: u.business_units
      })));
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t('users.messages.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessUnits = async () => {
    try {
      const response = await api.get('/business-units');
      setBusinessUnits(response.data);
    } catch (error) {
      console.error('Error fetching business units:', error);
      toast.error(t('users.messages.fetchBusinessUnitsFailed'));
    }
  };

  const fetchUserBusinessUnits = async (userId) => {
    try {
      console.log('Fetching business units for user:', userId);
      const response = await api.get(`/users/${userId}`);
      console.log('User data received:', response.data);
      console.log('Business units:', response.data.business_units);
      setUserBusinessUnits(response.data.business_units || []);
    } catch (error) {
      console.error('Error fetching user business units:', error);
      toast.error(t('users.messages.fetchUserBusinessUnitsFailed'));
    }
  };

  const handleOpenDialog = async (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        display_name: user.display_name,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role,
        password: '',
        business_unit_ids: []
      });
      // Fetch user's business units
      await fetchUserBusinessUnits(user.id);
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        display_name: '',
        first_name: '',
        last_name: '',
        role: 'employee',
        password: '',
        business_unit_ids: []
      });
      setUserBusinessUnits([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setUserBusinessUnits([]);
    setFormData({
      email: '',
      display_name: '',
      first_name: '',
      last_name: '',
      role: 'employee',
      password: '',
      business_unit_ids: []
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

    // Validate business units for new users
    if (!editingUser && formData.business_unit_ids.length === 0) {
      toast.error(t('forms:validation.selectAtLeastOne', { item: t('users.form.businessUnits').toLowerCase() }));
      return;
    }

    try {
      if (editingUser) {
        // Update existing user (business units managed separately)
        const { business_unit_ids, ...updateData } = formData;
        await api.put(`/users/${editingUser.id}`, updateData);
        toast.success(t('users.messages.updateSuccess'));
      } else {
        // Create new user with business units
        await api.post('/users', formData);
        toast.success(t('users.messages.createSuccess'));
      }

      handleCloseDialog();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(error.response?.data?.detail || t('users.messages.saveFailed'));
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm(t('users.messages.confirmDelete'))) {
      try {
        await api.delete(`/users/${userId}`);
        toast.success(t('users.messages.deleteSuccess'));
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error(error.response?.data?.detail || t('users.messages.deleteFailed'));
      }
    }
  };

  const handleAddBusinessUnit = async (buId) => {
    if (!editingUser) return;

    try {
      console.log('Adding business unit:', buId, 'to user:', editingUser.id);
      const response = await api.post(`/users/${editingUser.id}/business-units/${buId}`);
      console.log('Add response:', response.data);

      // Refresh the business units and main user list
      await Promise.all([
        fetchUserBusinessUnits(editingUser.id),
        fetchUsers()
      ]);

      toast.success(t('users.messages.businessUnitAddSuccess'));
    } catch (error) {
      console.error('Error adding business unit:', error);
      toast.error(error.response?.data?.detail || t('users.messages.businessUnitAddFailed'));
    }
  };

  const handleRemoveBusinessUnit = async (buId) => {
    if (!editingUser) return;

    // Check if this is the last business unit
    if (userBusinessUnits.length <= 1) {
      toast.error(t('users.messages.businessUnitRequired'));
      return;
    }

    try {
      console.log('Removing business unit:', buId, 'from user:', editingUser.id);
      await api.delete(`/users/${editingUser.id}/business-units/${buId}`);

      // Refresh the business units and main user list
      await Promise.all([
        fetchUserBusinessUnits(editingUser.id),
        fetchUsers()
      ]);

      toast.success(t('users.messages.businessUnitRemoveSuccess'));
    } catch (error) {
      console.error('Error removing business unit:', error);
      toast.error(error.response?.data?.detail || t('users.messages.businessUnitRemoveFailed'));
    }
  };

  const getUserRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'bu_manager':
        return 'warning';
      case 'employee':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography>Loading users...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => handleOpenDialog()}
        >
          Add User
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ flex: 1, maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Business Units</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.display_name} {user.first_name && user.last_name && `(${user.first_name} ${user.last_name})`}
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.role}
                    color={getUserRoleColor(user.role)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {user.business_units && user.business_units.length > 0 ? (
                      user.business_units.map((bu) => (
                        <Chip
                          key={bu.id}
                          label={bu.name}
                          size="small"
                          variant="outlined"
                          sx={{ mb: 0.5 }}
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No business units
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Active' : 'Inactive'}
                    color={user.is_active ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="Edit User">
                      <IconButton size="small" onClick={() => handleOpenDialog(user)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete User">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(user.id)}
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

      {/* User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editingUser 
              ? 'Update user information below.' 
              : 'Enter new user information. A temporary password will be generated if none is provided.'}
          </DialogContentText>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="dense"
              name="email"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={formData.email}
              onChange={handleChange}
              required
            />
            
            <TextField
              margin="dense"
              name="display_name"
              label="Display Name"
              fullWidth
              variant="outlined"
              value={formData.display_name}
              onChange={handleChange}
              required
              sx={{ mt: 2 }}
            />
            
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField
                margin="dense"
                name="first_name"
                label="First Name"
                fullWidth
                variant="outlined"
                value={formData.first_name}
                onChange={handleChange}
              />
              
              <TextField
                margin="dense"
                name="last_name"
                label="Last Name"
                fullWidth
                variant="outlined"
                value={formData.last_name}
                onChange={handleChange}
              />
            </Box>
            
            <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                label="Role"
                onChange={handleChange}
              >
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="bu_manager">Business Unit Manager</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </Select>
            </FormControl>

            {/* Business Units Section */}
            {!editingUser ? (
              // Create mode: Multi-select dropdown
              <FormControl fullWidth margin="dense" sx={{ mt: 2 }} required>
                <InputLabel>Business Units *</InputLabel>
                <Select
                  multiple
                  name="business_unit_ids"
                  value={formData.business_unit_ids}
                  label="Business Units *"
                  onChange={handleChange}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const bu = businessUnits.find(b => b.id === value);
                        return bu ? (
                          <Chip key={value} label={bu.name} size="small" />
                        ) : null;
                      })}
                    </Box>
                  )}
                >
                  {businessUnits.map((bu) => (
                    <MenuItem key={bu.id} value={bu.id}>
                      {bu.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select at least one business unit</FormHelperText>
              </FormControl>
            ) : (
              // Edit mode: Show current BUs with add/remove interface
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Business Units *
                </Typography>

                {/* Current Business Units */}
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                  {userBusinessUnits.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No business units assigned
                    </Typography>
                  ) : (
                    userBusinessUnits.map((bu) => (
                      <Chip
                        key={bu.id}
                        label={bu.name}
                        onDelete={() => handleRemoveBusinessUnit(bu.id)}
                        deleteIcon={<Close />}
                        sx={{ mb: 1 }}
                      />
                    ))
                  )}
                </Stack>

                {/* Add Business Unit */}
                <FormControl fullWidth size="small">
                  <InputLabel>Add Business Unit</InputLabel>
                  <Select
                    label="Add Business Unit"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddBusinessUnit(e.target.value);
                      }
                    }}
                  >
                    {businessUnits
                      .filter(bu => !userBusinessUnits.some(ubu => ubu.id === bu.id))
                      .map((bu) => (
                        <MenuItem key={bu.id} value={bu.id}>
                          {bu.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {!editingUser && (
              <TextField
                margin="dense"
                name="password"
                label="Password"
                type="password"
                fullWidth
                variant="outlined"
                value={formData.password}
                onChange={handleChange}
                helperText="Leave blank to generate a random password"
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
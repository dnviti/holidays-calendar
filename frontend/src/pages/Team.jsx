import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Box,
  Typography,
  Card as MuiCard,
  CardContent as MuiCardContent,
  Grid,
  Avatar,
  Chip,
  Stack
} from '@mui/material';

const Team = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      // First get user's managed business units
      const buResponse = await api.get('/business-units');
      const managedUnits = buResponse.data.filter(bu =>
        bu.manager_id === user.id || user.role === 'admin'
      );

      if (managedUnits.length === 0) {
        setTeamMembers([]);
        return;
      }

      // For each unit, get members
      // In a real app we might want a dedicated endpoint for "all managed employees"
      // But here we'll iterate
      const membersMap = new Map();

      for (const bu of managedUnits) {
        const membersRes = await api.get(`/business-units/${bu.id}/members`);
        membersRes.data.forEach(member => {
          if (!membersMap.has(member.id)) {
            membersMap.set(member.id, { ...member, business_unit_names: [bu.name] });
          } else {
            membersMap.get(member.id).business_unit_names.push(bu.name);
          }
        });
      }

      setTeamMembers(Array.from(membersMap.values()));
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Team
      </Typography>

      <Grid container spacing={3}>
        {teamMembers.map(member => (
          <Grid xs={12} sm={6} md={4} key={member.id}>
            <MuiCard>
              <MuiCardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={member.avatar_url} sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                    {member.display_name?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" component="h3">
                      {member.display_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {member.email}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      {member.business_unit_names?.map((bu, idx) => (
                        <Chip
                          key={idx}
                          label={bu}
                          size="small"
                          sx={{
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText'
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </MuiCardContent>
            </MuiCard>
          </Grid>
        ))}
      </Grid>

      {teamMembers.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography variant="body1" color="text.secondary">
            You don't have any team members yet.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Team;

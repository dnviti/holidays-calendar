import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Team</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamMembers.map(member => (
          <Card key={member.id}>
            <CardContent className="flex items-center gap-4 py-6">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center font-bold text-lg border border-border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
                  {member.display_name?.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-bold">{member.display_name}</h3>
                <p className="text-sm text-secondary">{member.email}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {member.business_unit_names?.map(bu => (
                    <span key={bu} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)' }}>
                      {bu}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teamMembers.length === 0 && (
        <p className="text-secondary text-center py-10">You don't have any team members yet.</p>
      )}
    </div>
  );
};

export default Team;

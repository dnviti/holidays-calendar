import React from 'react';
import { differenceInCalendarDays, parseISO, max, min } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import { Users, CheckCircle } from 'lucide-react';

/**
 * Computes the bar left% and width% for an overlapping holiday relative to
 * the form's requested date range.
 */
function computeBar(formStart, formEnd, hStart, hEnd) {
  const totalDays = differenceInCalendarDays(formEnd, formStart) + 1;
  const visibleStart = max([hStart, formStart]);
  const visibleEnd = min([hEnd, formEnd]);
  const left = (differenceInCalendarDays(visibleStart, formStart) / totalDays) * 100;
  const width = ((differenceInCalendarDays(visibleEnd, visibleStart) + 1) / totalDays) * 100;
  return { left: Math.max(0, left), width: Math.max(2, width) };
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const STATUS_COLORS = {
  approved: { bar: '#22C55E', chip: 'success' },
  pending: { bar: '#F59E0B', chip: 'warning' },
  default: { bar: '#3B82F6', chip: 'default' },
};

const TeamAvailabilityPanel = ({ loading, overlaps, startDate, endDate }) => {
  const { t } = useTranslation('forms');

  // Don't render if dates are not set or invalid
  if (!startDate || !endDate || startDate > endDate) return null;

  const formStart = parseISO(startDate);
  const formEnd = parseISO(endDate);

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Panel header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.25,
          backgroundColor: 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Users size={15} />
        <Typography variant="caption" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t('overlapCheck.teamAvailability')}
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          <Typography variant="caption" color="text.secondary">
            {startDate} → {endDate}
          </Typography>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ px: 2, py: 1.5 }}>
        {loading ? (
          // Skeleton loading state
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[1, 2].map((i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="40%" height={16} />
                  <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 1, mt: 0.5 }} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : !overlaps || !overlaps.has_overlaps ? (
          // All clear state
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <CheckCircle size={16} color="#22C55E" />
            <Typography variant="body2" color="text.secondary">
              {t('overlapCheck.allClear')}
            </Typography>
          </Box>
        ) : (
          // Overlap rows
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {overlaps.overlapping_holidays.map((h) => {
              const hStart = parseISO(String(h.start_date));
              const hEnd = parseISO(String(h.end_date));
              const { left, width } = computeBar(formStart, formEnd, hStart, hEnd);
              const statusKey = h.status || 'default';
              const colors = STATUS_COLORS[statusKey] || STATUS_COLORS.default;
              const statusLabel =
                statusKey === 'approved'
                  ? t('overlapCheck.statusApproved')
                  : statusKey === 'pending'
                  ? t('overlapCheck.statusPending')
                  : statusKey;

              return (
                <Box key={h.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {/* Avatar */}
                  <Avatar
                    sx={{
                      width: 30,
                      height: 30,
                      fontSize: 11,
                      fontWeight: 'bold',
                      bgcolor: 'primary.main',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(h.user_name)}
                  </Avatar>

                  {/* Name + bar */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" fontWeight="medium" noWrap sx={{ flex: 1, minWidth: 0 }}>
                        {h.user_name}
                      </Typography>
                      <Chip
                        label={statusLabel}
                        size="small"
                        color={colors.chip}
                        variant="outlined"
                        sx={{ height: 18, fontSize: 10, px: 0.25 }}
                      />
                    </Box>

                    {/* Timeline bar track */}
                    <Box
                      sx={{
                        position: 'relative',
                        height: 8,
                        borderRadius: 1,
                        backgroundColor: 'action.selected',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: `${left}%`,
                          width: `${width}%`,
                          height: '100%',
                          borderRadius: 1,
                          backgroundColor: colors.bar,
                          opacity: 0.85,
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TeamAvailabilityPanel;

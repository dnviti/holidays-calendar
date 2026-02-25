import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Skeleton,
} from '@mui/material';
import { Users, CheckCircle } from 'lucide-react';
import OverlapHeatmap from './OverlapHeatmap';

const TeamAvailabilityPanel = ({ loading, overlaps, startDate, endDate }) => {
  const { t } = useTranslation('forms');

  // Don't render if dates are not set or invalid
  if (!startDate || !endDate || startDate > endDate) return null;

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

      {/* Content — fixed minHeight prevents layout shift between loading/loaded states */}
      <Box sx={{ px: 2, py: 1.5, minHeight: 40, transition: 'min-height 0.2s ease' }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton variant="text" width="60%" sx={{ fontSize: '0.875rem' }} />
          </Box>
        ) : !overlaps || !overlaps.has_overlaps ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <CheckCircle size={16} color="#22C55E" />
            <Typography variant="body2" color="text.secondary">
              {t('overlapCheck.allClear')}
            </Typography>
          </Box>
        ) : (
          <OverlapHeatmap
            overlaps={overlaps}
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </Box>
    </Box>
  );
};

export default TeamAvailabilityPanel;

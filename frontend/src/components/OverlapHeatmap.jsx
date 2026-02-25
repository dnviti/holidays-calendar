import React, { useState, useEffect, useMemo } from 'react';
import {
  eachDayOfInterval,
  format,
  parseISO,
  getDay,
  max,
  min,
  isWithinInterval,
} from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Tooltip,
  Avatar,
  Chip,
  Skeleton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { checkOverlaps } from '../services/holidayService';

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const STATUS_CHIP_COLORS = {
  approved: 'success',
  pending: 'warning',
};

/**
 * Build a density map: for each day in the range, count how many people are absent
 * and collect their names + status.
 */
function computeDensityMap(overlappingHolidays, rangeStart, rangeEnd) {
  const map = new Map();

  for (const h of overlappingHolidays) {
    const hStart = parseISO(String(h.start_date));
    const hEnd = parseISO(String(h.end_date));
    const visibleStart = max([hStart, rangeStart]);
    const visibleEnd = min([hEnd, rangeEnd]);

    if (visibleStart > visibleEnd) continue;

    const days = eachDayOfInterval({ start: visibleStart, end: visibleEnd });
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd');
      if (!map.has(key)) {
        map.set(key, { count: 0, users: [] });
      }
      const entry = map.get(key);
      entry.count += 1;
      entry.users.push({ name: h.user_name, status: h.status });
    }
  }

  return map;
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Returns the MUI color for a given absence count.
 */
function getDensityColor(count, theme) {
  if (count === 0) return theme.palette.action.hover;
  if (count === 1) return theme.palette.warning.light;
  if (count === 2) return theme.palette.warning.main;
  return theme.palette.error.light; // 3+
}

function getDensityTextColor(count, theme) {
  if (count <= 0) return theme.palette.text.secondary;
  if (count >= 2) return theme.palette.warning.contrastText;
  return theme.palette.text.primary;
}

const OverlapHeatmap = ({ overlaps, startDate, endDate, compact = false }) => {
  const { t } = useTranslation('forms');
  const theme = useTheme();

  const rangeStart = useMemo(() => parseISO(startDate), [startDate]);
  const rangeEnd = useMemo(() => parseISO(endDate), [endDate]);

  const days = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd]
  );

  const densityMap = useMemo(
    () =>
      computeDensityMap(
        overlaps?.overlapping_holidays || [],
        rangeStart,
        rangeEnd
      ),
    [overlaps, rangeStart, rangeEnd]
  );

  // Compute leading empty cells to align to weekday (Monday = 0)
  const firstDayOfWeek = (getDay(rangeStart) + 6) % 7; // convert Sunday=0 to Monday=0

  const cellSize = compact ? 20 : 28;
  const fontSize = compact ? 9 : 11;

  const legendItems = [
    { count: 0, label: t('overlapCheck.legend0') },
    { count: 1, label: t('overlapCheck.legend1') },
    { count: 2, label: t('overlapCheck.legend2') },
    { count: 3, label: t('overlapCheck.legend3') },
  ];

  // Build unique user list with their date ranges
  const userSummaries = useMemo(() => {
    if (!overlaps?.overlapping_holidays) return [];
    const seen = new Map();
    for (const h of overlaps.overlapping_holidays) {
      const key = h.user_name;
      if (!seen.has(key)) {
        seen.set(key, {
          name: h.user_name,
          status: h.status,
          start_date: h.start_date,
          end_date: h.end_date,
        });
      }
    }
    return Array.from(seen.values());
  }, [overlaps]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Weekday headers */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(7, ${cellSize}px)`,
          gap: '2px',
          justifyContent: 'center',
        }}
      >
        {DAY_LABELS.map((label) => (
          <Box
            key={label}
            sx={{
              width: cellSize,
              height: compact ? 14 : 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: compact ? 8 : 10,
                fontWeight: 600,
                color: 'text.secondary',
                lineHeight: 1,
              }}
            >
              {label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(7, ${cellSize}px)`,
          gap: '2px',
          justifyContent: 'center',
        }}
      >
        {/* Leading empty cells */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <Box key={`empty-${i}`} sx={{ width: cellSize, height: cellSize }} />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const entry = densityMap.get(key) || { count: 0, users: [] };
          const bgColor = getDensityColor(entry.count, theme);
          const textColor = getDensityTextColor(entry.count, theme);

          const tooltipContent =
            entry.count > 0
              ? entry.users
                  .map(
                    (u) =>
                      `${u.name} (${u.status === 'approved' ? t('overlapCheck.statusApproved') : t('overlapCheck.statusPending')})`
                  )
                  .join('\n')
              : t('overlapCheck.noAbsences');

          return (
            <Tooltip
              key={key}
              title={
                <Box sx={{ whiteSpace: 'pre-line' }}>
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    display="block"
                  >
                    {format(day, 'd MMM')}
                  </Typography>
                  <Typography variant="caption">{tooltipContent}</Typography>
                </Box>
              }
              arrow
              placement="top"
            >
              <Box
                sx={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: 0.5,
                  backgroundColor: bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'default',
                  transition: 'transform 0.1s',
                  '&:hover': {
                    transform: 'scale(1.15)',
                    zIndex: 1,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize,
                    fontWeight: entry.count > 0 ? 700 : 400,
                    color: textColor,
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                >
                  {format(day, 'd')}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Legend */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          mt: 0.5,
        }}
      >
        {legendItems.map((item) => (
          <Box
            key={item.count}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <Box
              sx={{
                width: compact ? 10 : 12,
                height: compact ? 10 : 12,
                borderRadius: 0.5,
                backgroundColor: getDensityColor(item.count, theme),
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <Typography
              variant="caption"
              sx={{ fontSize: compact ? 9 : 10, color: 'text.secondary' }}
            >
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* User summary list */}
      {userSummaries.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
            mt: 0.5,
            pt: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          {userSummaries.map((u) => (
            <Box
              key={u.name}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Avatar
                sx={{
                  width: compact ? 18 : 22,
                  height: compact ? 18 : 22,
                  fontSize: compact ? 8 : 9,
                  fontWeight: 'bold',
                  bgcolor: 'primary.main',
                  flexShrink: 0,
                }}
              >
                {getInitials(u.name)}
              </Avatar>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 500,
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: compact ? 10 : 11,
                }}
              >
                {u.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: compact ? 9 : 10, flexShrink: 0 }}
              >
                {format(parseISO(String(u.start_date)), 'd MMM')} →{' '}
                {format(parseISO(String(u.end_date)), 'd MMM')}
              </Typography>
              <Chip
                label={
                  u.status === 'approved'
                    ? t('overlapCheck.statusApproved')
                    : t('overlapCheck.statusPending')
                }
                size="small"
                color={STATUS_CHIP_COLORS[u.status] || 'default'}
                variant="outlined"
                sx={{
                  height: compact ? 16 : 18,
                  fontSize: compact ? 8 : 10,
                  flexShrink: 0,
                }}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

/**
 * Wrapper that lazily fetches overlap data and renders OverlapHeatmap.
 * Used by HolidayDialog and Approvals where overlap details aren't preloaded.
 */
export const OverlapHeatmapLoader = ({
  businessUnitId,
  startDate,
  endDate,
  excludeHolidayId,
  compact = true,
}) => {
  const [overlaps, setOverlaps] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchOverlaps = async () => {
      try {
        const data = await checkOverlaps(
          businessUnitId,
          startDate,
          endDate,
          excludeHolidayId
        );
        if (!cancelled) setOverlaps(data);
      } catch {
        // silently fail — the panel just won't show data
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOverlaps();
    return () => {
      cancelled = true;
    };
  }, [businessUnitId, startDate, endDate, excludeHolidayId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1, minHeight: 150 }}>
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={14} width="40%" sx={{ borderRadius: 0.5 }} />
        <Skeleton variant="rectangular" height={14} width="55%" sx={{ borderRadius: 0.5 }} />
      </Box>
    );
  }

  if (!overlaps || !overlaps.has_overlaps) {
    return null;
  }

  return (
    <OverlapHeatmap
      overlaps={overlaps}
      startDate={startDate}
      endDate={endDate}
      compact={compact}
    />
  );
};

export default OverlapHeatmap;

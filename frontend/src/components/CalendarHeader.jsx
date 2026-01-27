import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  CalendarMonth,
  ViewWeek,
  ViewDay,
  List
} from '@mui/icons-material';

const CalendarHeader = ({ title, view, onViewChange, onPrev, onNext, onToday }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Paper
      elevation={1}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        mb: 2,
        p: 2,
        borderRadius: 2
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          width: { xs: '100%', md: 'auto' }
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={onToday}
          sx={{
            display: { xs: 'none', md: 'flex' },
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 500
          }}
        >
          Today
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            onClick={onPrev}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            onClick={onNext}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
          >
            <ChevronRight />
          </IconButton>
        </Box>

        <Typography
          variant="h6"
          component="h2"
          sx={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {title}
        </Typography>
      </Box>

      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={(_, newView) => newView && onViewChange(newView)}
        size="small"
        sx={{
          width: { xs: '100%', md: 'auto' },
          '& .MuiToggleButton-root': {
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 500,
            px: 2,
            py: 1
          }
        }}
      >
        <ToggleButton value="dayGridMonth" aria-label="month view">
          <CalendarMonth sx={{ mr: { xs: 0, sm: 1 }, fontSize: 20 }} />
          {!isMobile && <span>Month</span>}
        </ToggleButton>
        <ToggleButton value="timeGridWeek" aria-label="week view">
          <ViewWeek sx={{ mr: { xs: 0, sm: 1 }, fontSize: 20 }} />
          {!isMobile && <span>Week</span>}
        </ToggleButton>
        <ToggleButton value="timeGridDay" aria-label="day view">
          <ViewDay sx={{ mr: { xs: 0, sm: 1 }, fontSize: 20 }} />
          {!isMobile && <span>Day</span>}
        </ToggleButton>
        <ToggleButton value="listMonth" aria-label="list view">
          <List sx={{ mr: { xs: 0, sm: 1 }, fontSize: 20 }} />
          {!isMobile && <span>List</span>}
        </ToggleButton>
      </ToggleButtonGroup>
    </Paper>
  );
};

export default CalendarHeader;

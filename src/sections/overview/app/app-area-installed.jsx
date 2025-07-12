import { useState, useCallback } from 'react';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import { fNumber } from 'src/utils/format-number';
import { Chart, useChart, ChartLegends } from 'src/components/chart';
import dayjs from 'dayjs';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function AppAreaInstalled({ title, subheader, tasks, sx, view = 'week', onViewChange, periodOffset = 0, onNavigate, ...other }) {
  const theme = useTheme();

  // Get the start of the current week and month with offset
  const baseDate = dayjs().add(periodOffset, view === 'week' ? 'week' : 'month');
  const startOfWeek = baseDate.startOf('week');
  const startOfMonth = baseDate.startOf('month');
  const daysInMonth = baseDate.daysInMonth();

  // Generate array of days for week or month
  const days = view === 'week'
    ? Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day').format('ddd'))
    : Array.from({ length: daysInMonth }, (_, i) => startOfMonth.add(i, 'day').format('D'));

  // Process tasks data
  const processTasksData = () => {
    const len = view === 'week' ? 7 : daysInMonth;
    const series = [
      { name: 'To Do', data: Array(len).fill(0) },
      { name: 'In Progress', data: Array(len).fill(0) },
      { name: 'Completed', data: Array(len).fill(0) },
      { name: 'Overdue', data: Array(len).fill(0) },
    ];

    // Helper to check if a task is overdue (within the context of tasks due in the period)
    const isOverdueFiltered = (task) => {
      const now = dayjs();
      const due = dayjs(task.due_date);
      return due.isValid() && due.isBefore(now) && task.status !== 'completed';
    };

    tasks.forEach(task => {
      const taskDate = dayjs(task.due_date);
      // Only process tasks with valid due dates within the selected range
      if (taskDate.isValid()) {
        const dayIndex = view === 'week'
          ? taskDate.diff(startOfWeek, 'day')
          : taskDate.diff(startOfMonth, 'day');

        if (dayIndex >= 0 && dayIndex < len) {
          if (isOverdueFiltered(task)) {
            series[3].data[dayIndex]++; // Use index 3 for Overdue
          } else if (task.status === 'completed') {
            series[2].data[dayIndex]++;
          } else if (task.status === 'in_progress' || task.status === 'in-progress') {
            series[1].data[dayIndex]++;
          } else {
            series[0].data[dayIndex]++;
          }
        }
      }
    });
    return series;
  };

  const chartColors = [
    theme.palette.info.light,       // To Do (Swapped from In Progress)
    theme.palette.warning.light,    // In Progress (Swapped from To Do)
    theme.palette.success.main,    // Completed
    theme.palette.error.main,      // Overdue color
  ];

  const chartOptions = useChart({
    chart: { stacked: true },
    colors: chartColors,
    stroke: { width: 0 },
    xaxis: {
      categories: days,
      labels: {
        style: {
          colors: theme.palette.text.secondary,
        },
      },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      tickAmount: 4,
      labels: {
        formatter: (val) => Math.round(val),
      },
    },
    tooltip: {
      y: { formatter: (value) => fNumber(value) },
      shared: true,
      intersect: false
    },
    plotOptions: {
      bar: {
        columnWidth: '40%',
        borderRadius: 4,
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
  });

  const series = processTasksData();

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              size="small"
              onClick={() => onNavigate && onNavigate(-1)}
              disabled={periodOffset <= -12} // Limit to 12 periods back
              sx={{ color: 'text.secondary' }}
            >
              <Iconify icon="eva:arrow-ios-back-fill" />
            </IconButton>
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={(_, val) => val && onViewChange && onViewChange(val)}
              size="small"
            >
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
            </ToggleButtonGroup>
            <IconButton
              size="small"
              onClick={() => onNavigate && onNavigate(1)}
              disabled={periodOffset >= 12} // Limit to 12 periods ahead
              sx={{ color: 'text.secondary' }}
            >
              <Iconify icon="eva:arrow-ios-forward-fill" />
            </IconButton>
          </Stack>
        }
        sx={{ mb: 3 }}
      />
      <ChartLegends
        colors={chartColors}
        labels={['To Do', 'In Progress', 'Completed', 'Overdue']}
        values={[
          series[0].data.reduce((a, b) => a + b, 0),
          series[1].data.reduce((a, b) => a + b, 0),
          series[2].data.reduce((a, b) => a + b, 0),
          series[3].data.reduce((a, b) => a + b, 0),
        ].map(value => fNumber(value))}
        sx={{ px: 3, gap: 3 }}
      />
      <Chart
        type="bar"
        series={series}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{
          pl: 1,
          py: 2.5,
          pr: 2.5,
          height: 320,
        }}
      />
    </Card>
  );
}

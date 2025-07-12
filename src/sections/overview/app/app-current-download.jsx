import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import { Chart, useChart, ChartLegends } from 'src/components/chart';
import { fNumber } from 'src/utils/format-number';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import dayjs from 'dayjs';
import { Iconify } from 'src/components/iconify';

export function AppCurrentDownload({ title, subheader, tasks = [], sx, view = 'week', onViewChange, periodOffset = 0, onNavigate, ...other }) {
  const theme = useTheme();

  // Helper to check if a task is overdue
  function isOverdue(task) {
    const now = dayjs();
    const dueDate = dayjs(task.due_date);
    return dueDate.isBefore(now) && task.status !== 'completed';
  }

  // Get week/month range with offset
  const baseDate = dayjs().add(periodOffset, view === 'week' ? 'week' : 'month');
  const startOfWeek = baseDate.startOf('week').toDate();
  const endOfWeek = baseDate.endOf('week').toDate();
  const startOfMonth = baseDate.startOf('month').toDate();
  const endOfMonth = baseDate.endOf('month').toDate();

  // Filter tasks for week or month
  const filteredTasks = tasks.filter(task => {
    const due = new Date(task.due_date);
    if (view === 'week') {
      return due >= startOfWeek && due <= endOfWeek;
    } else {
      return due >= startOfMonth && due <= endOfMonth;
    }
  });

  // Count tasks by status
  let todo = 0, inProgress = 0, completed = 0, overdue = 0;
  filteredTasks.forEach(task => {
    if (isOverdue(task)) overdue++;
    else if (task.status === 'completed') completed++;
    else if (task.status === 'in-progress') inProgress++;
    else todo++;
  });

  const chartSeries = [todo, inProgress, completed, overdue];
  const chartLabels = ['To Do', 'In Progress', 'Completed', 'Overdue'];
  const chartColors = [
    theme.palette.info.light,      // To Do
    theme.palette.warning.light,   // In Progress
    theme.palette.success.main,    // Completed
    theme.palette.error.main,      // Overdue
  ];

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    labels: ['To Do', 'In Progress', 'Completed', 'Overdue'],
    stroke: { width: 0 },
    tooltip: {
      y: {
        formatter: (value) => fNumber(value),
        title: { formatter: (seriesName) => `${seriesName}` },
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            value: { formatter: (value) => fNumber(value) },
            total: {
              formatter: () => fNumber(filteredTasks.length),
            },
          },
        },
      },
    },
    // Ensure all label text colors are the same as primary text color
    legend: {
      labels: {
        colors: theme.palette.text.primary,
      },
    },
  });

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
      />
      <Chart
        type="donut"
        series={chartSeries}
        options={chartOptions}
        sx={{
          my: 6,
          mx: 'auto',
          width: { xs: 240, xl: 260 },
          height: { xs: 240, xl: 260 },
        }}
      />
      <Divider sx={{ borderStyle: 'dashed' }} />
      <ChartLegends
        labels={chartLabels}
        colors={chartColors}
        sx={{ p: 3, justifyContent: 'center' }}
      />
    </Card>
  );
}

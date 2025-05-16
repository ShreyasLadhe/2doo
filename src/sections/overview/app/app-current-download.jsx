import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import { Chart, useChart, ChartLegends } from 'src/components/chart';
import { fNumber } from 'src/utils/format-number';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

export function AppCurrentDownload({ title, subheader, tasks = [], sx, view = 'week', onViewChange, ...other }) {
  const theme = useTheme();

  // Helper to check if a task is overdue
  function isOverdue(task) {
    const today = new Date().toISOString().slice(0, 10);
    return task.due_date < today && task.status !== 'completed';
  }

  // Get week/month range
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

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
    labels: chartLabels,
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
  });

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_, val) => val && onViewChange && onViewChange(val)}
            size="small"
            sx={{ ml: 2 }}
          >
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
          </ToggleButtonGroup>
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

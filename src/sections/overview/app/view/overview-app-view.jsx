'use client';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { Dialog, DialogContent, DialogActions, Typography, Stack, Checkbox, Pagination, Tooltip } from '@mui/material';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import TextField from '@mui/material/TextField';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Masonry from '@mui/lab/Masonry';
import { FiGrid, FiSearch } from 'react-icons/fi';
import { m } from 'framer-motion';

import { DashboardContent } from 'src/layouts/dashboard';
import { SeoIllustration } from 'src/assets/illustrations';
import { _appAuthors, _appRelated, _appFeatured, _appInvoices, _appInstalled, _appTasks } from 'src/_mock';

import { useAuthContext } from 'src/auth/hooks';

import { AppWelcome } from '../app-welcome';
import { AppAreaInstalled } from '../app-area-installed';
import { AppWidgetSummary } from '../app-widget-summary';
import { AppCurrentDownload } from '../app-current-download';
import { AppTaskList } from '../app-task-list';
import { AppTaskForm } from '../app-task-form';
import { supabase } from 'src/lib/supabase';
import { ConfettiAnimation } from 'src/components/confetti-animation';

// ----------------------------------------------------------------------

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper to format YYYY-MM-DD HH:mm to DD-MM-YYYY HH:mm
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [datePart, timePart] = dateStr.split(' ');
  const [year, month, day] = datePart.split('-');
  return `${day}-${month}-${year} ${timePart || '00:00'}`;
}

// Helper to split date and time (for due_date - no timezone conversion)
function splitDateTime(dateStr) {
  if (!dateStr) return { date: '', time: '' };
  let datePart = '', timePart = '';
  // Handle ISO strings from database that might have 'T' or just space
  if (dateStr.includes('T')) {
    [datePart, timePart] = dateStr.split('T');
    timePart = timePart.split(/[+Z]/)[0]; // Remove timezone offset or Z
  } else {
    [datePart, timePart] = dateStr.split(' ');
  }
  const [year, month, day] = datePart.split('-');
  // Handle time format that might include seconds
  const [hour = '00', minute = '00'] = (timePart || '').split(':').slice(0, 2);
  return {
    date: `${day}-${month}-${year}`,
    time: `${hour}:${minute}`,
  };
}

// Helper to split and format completed_at (with GMT+5:30 conversion)
function splitAndFormatCompletedAt(dateStr) {
  if (!dateStr) return { date: '', time: '' };

  // Parse the UTC date string from Supabase
  const dateTime = dayjs.utc(dateStr);

  // Convert to GMT+5:30 (Asia/Kolkata) and format
  const targetTimezone = 'Asia/Kolkata';
  const formattedDateTime = dateTime.tz(targetTimezone).format('DD-MM-YYYY HH:mm');

  const [datePart, timePart] = formattedDateTime.split(' ');

  return {
    date: datePart,
    time: timePart || '00:00',
  };
}

// Helper to get current time with GMT+5:30 offset
function getCurrentTimeGMT530() {
  const now = new Date();
  const offsetMinutes = 5 * 60 + 30;
  const offsetMilliseconds = offsetMinutes * 60 * 1000;
  // Get the current UTC time in milliseconds
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  // Add the GMT+5:30 offset
  const targetTime = new Date(utcTime + offsetMilliseconds);

  const year = targetTime.getFullYear();
  const month = `${targetTime.getMonth() + 1}`.padStart(2, '0');
  const day = `${targetTime.getDate()}`.padStart(2, '0');
  const hours = `${targetTime.getHours()}`.padStart(2, '0');
  const minutes = `${targetTime.getMinutes()}`.padStart(2, '0');
  const seconds = `${targetTime.getSeconds()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}+05:30`;
}

export function OverviewAppView() {
  const { user } = useAuthContext();
  const theme = useTheme();
  const [openTaskForm, setOpenTaskForm] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [dense, setDense] = useState(false);
  const [tab, setTab] = useState('today');
  const [listPage, setListPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [downloadView, setDownloadView] = useState('week');
  const [areaView, setAreaView] = useState('week');
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchAnchorEl, setSearchAnchorEl] = useState(null);
  const [dateAnchorEl, setDateAnchorEl] = useState(null);
  const [tagAnchorEl, setTagAnchorEl] = useState(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [tagExpanded, setTagExpanded] = useState(false);
  const [cardView, setCardView] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [page, setPage] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);
  const [animatingTaskId, setAnimatingTaskId] = useState(null);

  // Determine initial view based on screen width
  useEffect(() => {
    const handleResize = () => {
      // Assuming 'sm' breakpoint is 600px. Use card view if screen width is less than 600px
      if (window.innerWidth < 600) {
        setCardView(true);
      } else {
        setCardView(false);
      }
    };

    // Set initial view
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Clean up event listener
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  // Moved fetchTasks logic into a useCallback
  const fetchTasks = useCallback(async () => {
    if (!user?.id) {
      setTasks([]);
      return;
    }
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('id', { ascending: true });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      setTasks([]);
      return;
    }

    const taskIds = tasksData.map(task => task.task_id);
    const { data: subtasksData } = await supabase
      .from('subtasks')
      .select('*')
      .in('task_id', taskIds);

    // Fetch tags for these tasks
    const { data: taskTagsData } = await supabase
      .from('task_tags')
      .select('task_id, tags:tag_id (tag_id, name, color)')
      .in('task_id', taskIds);

    let tasksWithSubtasks = tasksData.map(task => {
      const tags = (taskTagsData || [])
        .filter(tt => tt.task_id === task.task_id)
        .map(tt => tt.tags)
        .filter(Boolean);
      return {
        ...task,
        subtasks: subtasksData ? subtasksData.filter(st => st.task_id === task.task_id) : [],
        tags,
      };
    });

    // Mark overdue and sort
    const now = dayjs();
    tasksWithSubtasks = tasksWithSubtasks.map(task => {
      // Check if due_date is before now and status is not completed
      const isOverdue = task.due_date ? dayjs(task.due_date).isBefore(now) && task.status !== 'completed' : false;
      return { ...task, isOverdue };
    });
    // Sort: overdue first, then by priority, then due date
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    tasksWithSubtasks.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return b.isOverdue - a.isOverdue;
      const pa = priorityOrder[a.priority] ?? 4;
      const pb = priorityOrder[b.priority] ?? 4;
      if (pa !== pb) return pa - pb;
      // Use dayjs for accurate sorting by due date and time
      const dateA = dayjs(a.due_date);
      const dateB = dayjs(b.due_date);
      if (dateA.isValid() && dateB.isValid()) {
        return dateA.diff(dateB);
      }
      // Handle invalid dates (e.g., null) - place tasks with no due date at the end
      if (dateA.isValid() && !dateB.isValid()) return -1;
      if (!dateA.isValid() && dateB.isValid()) return 1;
      return 0; // Both invalid or both null
    });

    setTasks(tasksWithSubtasks);
  }, [user?.id]);

  // Fetch tasks for current user on component mount or when user.id changes
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Fetch tags for the user
  useEffect(() => {
    async function fetchTags() {
      if (!user?.id) return;
      const { data } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id);
      setAvailableTags(data || []);
    }
    fetchTags();
  }, [user?.id]);

  const handleOpenTaskForm = () => {
    setEditingTask(null);
    setOpenTaskForm(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setOpenTaskForm(true);
  };

  const handleCloseTaskForm = () => {
    setOpenTaskForm(false);
    setEditingTask(null);
  };

  // Modified handleCreateTask to call the main fetchTasks
  const handleCreateOrUpdateTask = () => {
    setTimeout(() => {
      fetchTasks();
    }, 500);
  };

  // Delete task and its subtasks with confirmation
  const handleDeleteTask = async (task) => {
    setTaskToDelete(task);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    await supabase.from('subtasks').delete().eq('task_id', taskToDelete.task_id);
    await supabase.from('tasks').delete().eq('id', taskToDelete.id);
    setConfirmDeleteOpen(false);
    setTaskToDelete(null);
    fetchTasks();
  };

  const cancelDelete = () => {
    setConfirmDeleteOpen(false);
    setTaskToDelete(null);
  };

  // Mark task as complete
  const handleMarkCompleteTask = async (task) => {
    setAnimatingTaskId(task.id);
    setShowConfetti(true);

    // Wait for strikethrough animation to complete before updating the database
    setTimeout(async () => {
      await supabase.from('tasks').update({
        status: 'completed',
        completed_at: getCurrentTimeGMT530()
      }).eq('id', task.id);

      await fetchTasks();
      setAnimatingTaskId(null);

      // Hide confetti after 1 second
      setTimeout(() => {
        setShowConfetti(false);
      }, 1000);
    }, 1000); // Increased from 500ms to 1000ms to ensure strikethrough completes
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setListPage(1);
  };

  // Filtering logic for search, date range, and tags
  let filteredTasks = tasks;
  if (searchText) {
    filteredTasks = filteredTasks.filter(task =>
      task.title?.toLowerCase().includes(searchText.toLowerCase())
    );
  }
  if (startDate) {
    filteredTasks = filteredTasks.filter(task => task.due_date >= dayjs(startDate).format('YYYY-MM-DD'));
  }
  if (endDate) {
    filteredTasks = filteredTasks.filter(task => task.due_date <= dayjs(endDate).format('YYYY-MM-DD'));
  }
  if (selectedTags.length > 0) {
    filteredTasks = filteredTasks.filter(task =>
      task.tags && task.tags.some(tag => selectedTags.some(sel => sel.tag_id === tag.tag_id))
    );
  }

  // Filtering logic for tabs
  const todayStart = dayjs().startOf('day');
  const todayEnd = dayjs().endOf('day');
  const tomorrowStart = dayjs().add(1, 'day').startOf('day');
  const tomorrowEnd = dayjs().add(1, 'day').endOf('day');
  const weekStart = dayjs().startOf('week');
  const weekEnd = dayjs().endOf('week');
  const monthStart = dayjs().startOf('month');
  const monthEnd = dayjs().endOf('month');

  if (tab === 'today') {
    filteredTasks = [
      ...filteredTasks.filter(task => task.isOverdue && task.status !== 'completed'), // Overdue and not completed
      ...filteredTasks.filter(task =>
        task.due_date &&
        dayjs(task.due_date).isBetween(todayStart, todayEnd, 'minute', '[]') && // Within today's date range inclusive
        (task.status !== 'completed' || (task.status === 'completed' && task.completed_at && dayjs.utc(task.completed_at).tz(dayjs.tz.guess()).isBetween(todayStart, todayEnd, 'minute', '[]')))
      ),
    ];
  } else if (tab === 'tomorrow') {
    filteredTasks = [
      ...filteredTasks.filter(task => task.isOverdue && task.status !== 'completed'), // Overdue and not completed
      ...filteredTasks.filter(task =>
        task.due_date &&
        dayjs(task.due_date).isBetween(tomorrowStart, tomorrowEnd, 'minute', '[]') && // Within tomorrow's date range inclusive
        (task.status !== 'completed' || (task.status === 'completed' && task.completed_at && dayjs.utc(task.completed_at).tz(dayjs.tz.guess()).isBetween(tomorrowStart, tomorrowEnd, 'minute', '[]')))
      ),
    ];
  } else if (tab === 'week') {
    filteredTasks = [
      ...filteredTasks.filter(task => task.isOverdue && task.status !== 'completed'), // Overdue and not completed
      ...filteredTasks.filter(
        task =>
          task.due_date &&
          dayjs(task.due_date).isBetween(weekStart, weekEnd, 'minute', '[]') && // Within this week's date range inclusive
          (task.status !== 'completed' || (task.status === 'completed' && task.completed_at && dayjs.utc(task.completed_at).tz(dayjs.tz.guess()).isBetween(weekStart, weekEnd, 'minute', '[]')))
      ),
    ];
  } else if (tab === 'month') {
    filteredTasks = [
      ...filteredTasks.filter(task => task.isOverdue && task.status !== 'completed'), // Overdue and not completed
      ...filteredTasks.filter(task =>
        task.due_date &&
        dayjs(task.due_date).isBetween(monthStart, monthEnd, 'minute', '[]') && // Within this month's date range inclusive
        (task.status !== 'completed' || (task.status === 'completed' && task.completed_at && dayjs.utc(task.completed_at).tz(dayjs.tz.guess()).isBetween(monthStart, monthEnd, 'minute', '[]')))
      ),
    ];

    // Remove duplicates by task ID
    const uniqueTaskIds = new Set();
    filteredTasks = filteredTasks.filter(task => {
      if (uniqueTaskIds.has(task.id)) {
        return false;
      }
      uniqueTaskIds.add(task.id);
      return true;
    });
  } else if (tab === 'completed') {
    filteredTasks = filteredTasks.filter(task => task.status === 'completed');
  }

  const ROWS_PER_PAGE = dense ? 15 : 10;
  const totalListPages = Math.ceil(filteredTasks.length / ROWS_PER_PAGE);
  const paginatedListTasks = filteredTasks.slice((listPage - 1) * ROWS_PER_PAGE, listPage * ROWS_PER_PAGE);

  const tasksForTheWeek = tasks.filter(task =>
    task.due_date >= weekStart.format('YYYY-MM-DD') &&
    task.due_date <= weekEnd.format('YYYY-MM-DD')
  );

  const CARDS_PER_PAGE = 9;
  const totalPages = Math.ceil(filteredTasks.length / CARDS_PER_PAGE);
  const paginatedTasks = filteredTasks.slice((page - 1) * CARDS_PER_PAGE, page * CARDS_PER_PAGE);

  // Helper function to chunk array into groups of 3
  function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  const handleSubtaskToggle = async (subtask) => {
    await supabase
      .from('subtasks')
      .update({ completed: !subtask.completed })
      .eq('id', subtask.id);
    // Immediately fetch tasks to update the UI
    await fetchTasks();
  };

  return (
    <DashboardContent maxWidth="xl">
      {showConfetti && <ConfettiAnimation />}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 12 }}>
          <AppWelcome
            title={(
              <>
                🙏 <br /> Namaste {' '}
                <Box
                  component={m.span}
                  animate={{ backgroundPosition: '200% center' }}
                  transition={{
                    duration: 10,
                    ease: 'linear',
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                  sx={[
                    (theme) => ({
                      ...theme.mixins.textGradient(
                        `300deg, ${theme.vars.palette.primary.main} 0%, ${theme.vars.palette.secondary.main} 25%, ${theme.vars.palette.primary.main} 50%, ${theme.vars.palette.secondary.main} 75%, ${theme.vars.palette.primary.main} 100%`
                      ),
                      backgroundSize: '400%',
                    }),
                  ]}
                >
                  {user?.displayName?.split(' ')[0]}
                </Box>
              </>
            )}
            description="What are we ticking off today?"
            img={<SeoIllustration hideBackground />}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 12 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            {/* Search Icon/Input */}
            {searchExpanded ? (
              <TextField
                label="Search by Title"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                size="small"
                autoFocus
                onBlur={() => setSearchExpanded(false)}
                sx={{ minWidth: { xs: '100%', sm: 220 }, transition: 'min-width 0.2s' }}
              />
            ) : (
              <Tooltip title="Search Tasks">
                <IconButton onClick={() => setSearchExpanded(true)}>
                  <FiSearch size={24} />
                </IconButton>
              </Tooltip>
            )}
            {/* Date Range Icon */}
            <Tooltip title="Filter by Date Range">
              <IconButton onClick={e => setDateAnchorEl(e.currentTarget)}>
                <Iconify icon="solar:calendar-bold" />
              </IconButton>
            </Tooltip>
            <Popover
              open={Boolean(dateAnchorEl)}
              anchorEl={dateAnchorEl}
              onClose={() => setDateAnchorEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
              <Box sx={{ p: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Due Date"
                    value={startDate}
                    onChange={setStartDate}
                    slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
                  />
                  <DatePicker
                    label="End Due Date"
                    value={endDate}
                    onChange={setEndDate}
                    slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
                  />
                </LocalizationProvider>
              </Box>
            </Popover>
            {/* Tag Filter Icon/Input */}
            {tagExpanded ? (
              <Autocomplete
                multiple
                options={availableTags}
                getOptionLabel={option => option.name}
                value={selectedTags}
                onChange={(_, newValue) => setSelectedTags(newValue)}
                renderTags={(selected, getTagProps) =>
                  selected.map((option, index) => (
                    <Chip {...getTagProps({ index })} key={option.tag_id} label={option.name} color="info" variant="soft" />
                  ))
                }
                renderInput={params => <TextField {...params} label="Filter by Tags" placeholder="Tags" size="small" autoFocus onBlur={() => setTagExpanded(false)} />}
                sx={{ minWidth: { xs: '100%', sm: 220 }, transition: 'min-width 0.2s' }}
              />
            ) : (
              <Tooltip title="Filter by Tags">
                <IconButton onClick={() => setTagExpanded(true)}>
                  <Iconify icon="solar:tag-bold" />
                </IconButton>
              </Tooltip>
            )}
            {/* Card/List View Toggle */}
            <IconButton
              color={cardView ? 'primary' : 'default'}
              onClick={() => setCardView((v) => !v)}
              title={cardView ? 'Switch to List View' : 'Switch to Grid View'}
              sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}
            >
              {cardView ? <Iconify icon='solar:list-bold' width={24} /> : <FiGrid size={24} />}
              <Typography variant="body2" sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
                {cardView ? 'List View' : 'Grid View'}
              </Typography>
            </IconButton>

            <Button
              variant="contained"
              color="primary"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={handleOpenTaskForm}
              sx={{
                ml: { xs: 0, sm: 2 },
                width: { xs: '100%', sm: 'auto' },
                mt: { xs: 1, sm: 0 }
              }}
            >
              New Task
            </Button>
            {/* Expand/Compress All button for Grid View */}
            {cardView && (
              <Tooltip title={Object.values(expanded).filter(Boolean).length === paginatedTasks.length ? 'Compress All' : 'Expand All'}>
                <IconButton
                  variant="outlined"
                  color="inherit"
                  onClick={() => {
                    const allExpanded = Object.values(expanded).filter(Boolean).length === paginatedTasks.length;
                    if (allExpanded) {
                      // Compress all
                      const newExpanded = {};
                      paginatedTasks.forEach(task => { newExpanded[task.id] = false; });
                      setExpanded(newExpanded);
                    } else {
                      // Expand all
                      const newExpanded = {};
                      paginatedTasks.forEach(task => { newExpanded[task.id] = true; });
                      setExpanded(newExpanded);
                    }
                  }}
                  sx={{
                    ml: { xs: 0, sm: 1 },
                    width: { xs: 'auto' },
                    mt: { xs: 1, sm: 0 },
                    display: { xs: 'none', sm: 'flex' },
                    alignItems: 'center'
                  }}
                >
                  {Object.values(expanded).filter(Boolean).length === paginatedTasks.length
                    ? <Iconify icon="eva:arrow-ios-upward-fill" />
                    : <Iconify icon="eva:arrow-ios-downward-fill" />
                  }
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="Today" value="today" />
            <Tab label="Tomorrow" value="tomorrow" />
            <Tab label="This Week" value="week" />
            <Tab label="This Month" value="month" />
            <Tab label="Completed" value="completed" />
          </Tabs>
          {cardView ? (
            <>
              {paginatedTasks?.length === 0 ? (
                <Box sx={{
                  textAlign: 'center',
                  py: { xs: 6, sm: 8 },
                  px: { xs: 2, sm: 3 },
                }}>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{
                      fontStyle: 'italic',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}
                  >
                    Yay! No tasks here. Grab a coffee and relax ☕
                  </Typography>
                </Box>
              ) : (
                <>
                  {Object.values(expanded).some(Boolean) || window.innerWidth < 600 ? (
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={4}>
                      {paginatedTasks.map((task) => {
                        const { date, time } = splitDateTime(task.due_date);
                        const completionDateTime = task.status === 'completed' && task.completed_at ? splitAndFormatCompletedAt(task.completed_at) : null;
                        return (
                          <Card key={task.id} sx={{
                            borderRadius: 3,
                            boxShadow: 3,
                            p: 2,
                            width: { xs: '100%', sm: 420 },
                            minHeight: 180,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            border: (theme) =>
                              task.isOverdue
                                ? `2px solid ${theme.palette.error.main}`
                                : task.status === 'completed'
                                  ? `2px solid ${theme.palette.success.main}`
                                  : `2px solid ${theme.palette.primary.main}`,
                            color: (theme) =>
                              task.isOverdue
                                ? theme.palette.error.main
                                : task.status === 'completed'
                                  ? theme.palette.success.main
                                  : undefined,
                            '&:hover': {
                              borderColor: (theme) =>
                                task.isOverdue
                                  ? theme.palette.error.dark
                                  : task.status === 'completed'
                                    ? theme.palette.success.dark
                                    : theme.palette.primary.dark,
                            },
                          }}>
                            <CardContent sx={{ pb: '0!important', position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Stack direction="row" alignItems="center">
                                  <Checkbox
                                    checked={task.status === 'completed'}
                                    onChange={() => handleMarkCompleteTask(task)}
                                    color="success"
                                    sx={{ mr: 1 }}
                                    disabled={task.status === 'completed'}
                                  />
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography
                                      variant="h6"
                                      fontWeight={700}
                                      gutterBottom
                                      className={`strikethrough-animation ${animatingTaskId === task.id ? 'animate' : ''}`}
                                      sx={{
                                        ...(task.status === 'completed' && {
                                          textDecoration: 'line-through',
                                          color: 'success.main',
                                        }),
                                        ...(task.isOverdue && {
                                          color: (theme) => theme.palette.error.main,
                                        }),
                                      }}
                                    >
                                      {task.title}
                                    </Typography>
                                    {task.isOverdue && (
                                      <Chip
                                        label="Overdue"
                                        color="error"
                                        variant="filled"
                                        sx={{
                                          height: 20,
                                          fontSize: '0.75rem',
                                          color: 'white',
                                          bgcolor: (theme) => theme.palette.error.dark,
                                        }}
                                      />
                                    )}
                                  </Box>
                                </Stack>
                                <Chip label={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} size="small" color={(task.priority === 'high' && 'error') || (task.priority === 'medium' && 'warning') || 'success'} />
                              </Stack>
                              <Typography variant="body2" color="text.secondary" sx={{
                                mb: 1,
                                ...(task.status === 'completed' && {
                                  textDecoration: 'line-through',
                                  color: 'success.main',
                                }),
                                ...(task.isOverdue && {
                                  color: (theme) => theme.palette.error.main,
                                }),
                              }}>
                                {task.description}
                              </Typography>
                              {task.subtasks && task.subtasks.length > 0 && (
                                <Box sx={{ mb: 1 }}>
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={(task.subtasks.filter(sub => sub.completed).length / task.subtasks.length) * 100}
                                      sx={{
                                        flex: 1,
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: (theme) => theme.palette.grey[200],
                                        '& .MuiLinearProgress-bar': {
                                          borderRadius: 4,
                                          backgroundColor: (theme) =>
                                            task.subtasks.every(sub => sub.completed)
                                              ? theme.palette.success.main
                                              : theme.palette.primary.main,
                                        },
                                      }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                      {task.subtasks.filter(sub => sub.completed).length}/{task.subtasks.length}
                                    </Typography>
                                  </Stack>
                                </Box>
                              )}
                              {(expanded[task.id] || window.innerWidth < 600) && task.subtasks && task.subtasks.length > 0 && (
                                <Box sx={{ mb: 1, mt: 1 }}>
                                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Subtasks</Typography>
                                  <Stack spacing={1}>
                                    {task.subtasks.map((sub) => (
                                      <Box key={sub.id} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', p: 1, borderRadius: 1, bgcolor: 'background.paper', color: sub.completed ? 'success.dark' : 'text.primary', border: '1px solid', borderColor: 'grey.200' }}>
                                        <Checkbox
                                          checked={sub.completed}
                                          onChange={async () => {
                                            await supabase
                                              .from('subtasks')
                                              .update({ completed: !sub.completed })
                                              .eq('id', sub.id);
                                            fetchTasks();
                                          }}
                                          sx={{ mr: 1 }}
                                        />
                                        <Typography
                                          variant="body2"
                                          sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: sub.completed ? 'line-through' : 'none' }}
                                        >
                                          {sub.title}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Stack>
                                </Box>
                              )}
                              {completionDateTime && (
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                  <Chip
                                    label={
                                      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', p: 0 }}>
                                        <span style={{ fontWeight: 500 }}>Completed: {completionDateTime.date}</span>
                                        <span style={{ color: '#aaa', fontSize: '0.95em', marginLeft: 8 }}>{completionDateTime.time}</span>
                                      </Box>
                                    }
                                    size="small"
                                    icon={<Iconify icon="solar:check-circle-bold-duotone" />}
                                    variant="soft"
                                    color="success"
                                  />
                                </Stack>
                              )}
                              {!completionDateTime && (
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                  <Chip
                                    label={
                                      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', p: 0 }}>
                                        <span style={{ fontWeight: 500 }}>Due: {date}</span>
                                        <span style={{ color: '#aaa', fontSize: '0.95em', marginLeft: 8 }}>{time}</span>
                                      </Box>
                                    }
                                    size="small"
                                    icon={<Iconify icon="solar:calendar-bold" />}
                                    variant="soft"
                                  />
                                </Stack>
                              )}
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mt: 2 }}>
                                <Box>
                                  {task.tags && task.tags.length > 0 && (
                                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                      {task.tags.map((tag) => (
                                        <Chip key={tag.tag_id} label={tag.name} size="small" color="info" variant="soft" />
                                      ))}
                                    </Stack>
                                  )}
                                </Box>
                                <Stack direction="row" spacing={1} alignItems="flex-end">
                                  <IconButton size="small" onClick={() => handleEditTask(task)} sx={{ color: 'primary.main' }}>
                                    <Iconify icon="solar:pen-bold" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteTask(task)}
                                    sx={{ color: 'error.main' }}
                                    title="Delete Task"
                                  >
                                    <Iconify icon="solar:trash-bin-trash-bold" />
                                  </IconButton>
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Masonry>
                  ) : (
                    <>
                      {chunkArray(paginatedTasks, 3).map((row, rowIndex, arr) => (
                        <Grid container spacing={4} justifyContent="center" alignItems="stretch" sx={{ width: '100%', margin: 0, mb: rowIndex !== arr.length - 1 ? 8 : 0 }} key={rowIndex}>
                          {row.map((task) => {
                            const { date, time } = splitDateTime(task.due_date);
                            const completionDateTime = task.status === 'completed' && task.completed_at ? splitAndFormatCompletedAt(task.completed_at) : null;
                            return (
                              <Grid item xs={12} sm={6} md={4} key={task.id} display="flex" justifyContent="center">
                                <Card sx={{
                                  borderRadius: 3,
                                  boxShadow: 3,
                                  p: 2,
                                  width: 420,
                                  minHeight: 180,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  border: (theme) =>
                                    task.isOverdue
                                      ? `2px solid ${theme.palette.error.main}`
                                      : task.status === 'completed'
                                        ? `2px solid ${theme.palette.success.main}`
                                        : `2px solid ${theme.palette.primary.main}`,
                                  color: (theme) =>
                                    task.isOverdue
                                      ? theme.palette.error.main
                                      : task.status === 'completed'
                                        ? theme.palette.success.main
                                        : undefined,
                                  '&:hover': {
                                    borderColor: (theme) =>
                                      task.isOverdue
                                        ? theme.palette.error.dark
                                        : task.status === 'completed'
                                          ? theme.palette.success.dark
                                          : theme.palette.primary.dark,
                                  },
                                }}>
                                  <CardContent sx={{ pb: '0!important', position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                      <Stack direction="row" alignItems="center">
                                        <Checkbox
                                          checked={task.status === 'completed'}
                                          onChange={() => handleMarkCompleteTask(task)}
                                          color="success"
                                          sx={{ mr: 1 }}
                                          disabled={task.status === 'completed'}
                                        />
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Typography
                                            variant="h6"
                                            fontWeight={700}
                                            gutterBottom
                                            className={`strikethrough-animation ${animatingTaskId === task.id ? 'animate' : ''}`}
                                            sx={{
                                              ...(task.status === 'completed' && {
                                                textDecoration: 'line-through',
                                                color: 'success.main',
                                              }),
                                              ...(task.isOverdue && {
                                                color: (theme) => theme.palette.error.main,
                                              }),
                                            }}
                                          >
                                            {task.title}
                                          </Typography>
                                          {task.isOverdue && (
                                            <Chip
                                              label="Overdue"
                                              color="error"
                                              variant="filled"
                                              sx={{
                                                height: 30,
                                                fontSize: '1rem',
                                                mr: '1rem',
                                                color: 'white',
                                                bgcolor: (theme) => theme.palette.error.dark,
                                              }}
                                            />
                                          )}
                                        </Box>
                                      </Stack>
                                      <Chip label={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} size="small" color={(task.priority === 'high' && 'error') || (task.priority === 'medium' && 'warning') || 'success'} />
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary" sx={{
                                      mb: 1,
                                      ...(task.status === 'completed' && {
                                        textDecoration: 'line-through',
                                        color: 'success.main',
                                      }),
                                      ...(task.isOverdue && {
                                        color: (theme) => theme.palette.error.main,
                                      }),
                                    }}>
                                      {task.description}
                                    </Typography>
                                    {task.subtasks && task.subtasks.length > 0 && (
                                      <Box sx={{ mb: 1 }}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                          <LinearProgress
                                            variant="determinate"
                                            value={(task.subtasks.filter(sub => sub.completed).length / task.subtasks.length) * 100}
                                            sx={{
                                              flex: 1,
                                              height: 8,
                                              borderRadius: 4,
                                              backgroundColor: (theme) => theme.palette.grey[200],
                                              '& .MuiLinearProgress-bar': {
                                                borderRadius: 4,
                                                backgroundColor: (theme) =>
                                                  task.subtasks.every(sub => sub.completed)
                                                    ? theme.palette.success.main
                                                    : theme.palette.primary.main,
                                              },
                                            }}
                                          />
                                          <Typography variant="caption" color="text.secondary">
                                            {task.subtasks.filter(sub => sub.completed).length}/{task.subtasks.length}
                                          </Typography>
                                        </Stack>
                                      </Box>
                                    )}
                                    {(expanded[task.id] || window.innerWidth < 600) && task.subtasks && task.subtasks.length > 0 && (
                                      <Box sx={{ mb: 1, mt: 1 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Subtasks</Typography>
                                        <Stack spacing={1}>
                                          {task.subtasks.map((sub) => (
                                            <Box key={sub.id} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', p: 1, borderRadius: 1, bgcolor: 'background.paper', color: sub.completed ? 'success.dark' : 'text.primary', border: '1px solid', borderColor: 'grey.200' }}>
                                              <Checkbox
                                                checked={sub.completed}
                                                onChange={async () => {
                                                  await supabase
                                                    .from('subtasks')
                                                    .update({ completed: !sub.completed })
                                                    .eq('id', sub.id);
                                                  fetchTasks();
                                                }}
                                                sx={{ mr: 1 }}
                                              />
                                              <Typography
                                                variant="body2"
                                                sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: sub.completed ? 'line-through' : 'none' }}
                                              >
                                                {sub.title}
                                              </Typography>
                                            </Box>
                                          ))}
                                        </Stack>
                                      </Box>
                                    )}
                                    {completionDateTime && (
                                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                        <Chip
                                          label={
                                            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', p: 0 }}>
                                              <span style={{ fontWeight: 500 }}>Completed: {completionDateTime.date}</span>
                                              <span style={{ color: '#aaa', fontSize: '0.95em', marginLeft: 8 }}>{completionDateTime.time}</span>
                                            </Box>
                                          }
                                          size="small"
                                          icon={<Iconify icon="solar:check-circle-bold-duotone" />}
                                          variant="soft"
                                          color="success"
                                        />
                                      </Stack>
                                    )}
                                    {!completionDateTime && (
                                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                        <Chip
                                          label={
                                            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', p: 0 }}>
                                              <span style={{ fontWeight: 500 }}>Due: {date}</span>
                                              <span style={{ color: '#aaa', fontSize: '0.95em', marginLeft: 8 }}>{time}</span>
                                            </Box>
                                          }
                                          size="small"
                                          icon={<Iconify icon="solar:calendar-bold" />}
                                          variant="soft"
                                        />
                                      </Stack>
                                    )}
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mt: 2 }}>
                                      <Box>
                                        {task.tags && task.tags.length > 0 && (
                                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                            {task.tags.map((tag) => (
                                              <Chip key={tag.tag_id} label={tag.name} size="small" color="info" variant="soft" />
                                            ))}
                                          </Stack>
                                        )}
                                      </Box>
                                      <Stack direction="row" spacing={1} alignItems="flex-end">
                                        <IconButton size="small" onClick={() => handleEditTask(task)} sx={{ color: 'primary.main' }}>
                                          <Iconify icon="solar:pen-bold" />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleDeleteTask(task)}
                                          sx={{ color: 'error.main' }}
                                          title="Delete Task"
                                        >
                                          <Iconify icon="solar:trash-bin-trash-bold" />
                                        </IconButton>
                                      </Stack>
                                    </Stack>
                                  </CardContent>
                                </Card>
                              </Grid>
                            );
                          })}
                          {Array.from({ length: 3 - row.length }).map((_, idx) => (
                            <Grid item xs={12} sm={6} md={4} key={`empty-${idx}`} style={{ visibility: 'hidden' }} />
                          ))}
                        </Grid>
                      ))}
                    </>
                  )}
                </>
              )}
              {totalPages > 1 && paginatedTasks?.length > 0 && (
                <Stack alignItems="center" sx={{ mt: 4 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                    shape="rounded"
                  />
                </Stack>
              )}
            </>
          ) : (
            <AppTaskList
              title="Task List"
              subheader="Your current tasks"
              tableData={paginatedListTasks}
              headCells={[
                { id: 'title', label: 'Task', minWidth: 500 },
                { id: 'description', label: 'Description', minWidth: 260 },
                { id: 'subtasks', label: 'Subtasks', minWidth: 120 },
                { id: 'dueDate', label: 'Due Date', minWidth: 120 },
                { id: 'priority', label: 'Priority' },
                { id: 'actions', label: 'Actions' },
              ]}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onMarkCompleteTask={handleMarkCompleteTask}
              dense={dense}
              onToggleDense={() => setDense((d) => !d)}
              page={listPage}
              totalPages={totalListPages}
              onPageChange={setListPage}
              availableTags={availableTags}
              selectedTags={selectedTags}
              onTagFilterChange={setSelectedTags}
              animatingTaskId={animatingTaskId}
              onSubtaskToggle={handleSubtaskToggle}
            />
          )}
        </Grid>

        { /*<Grid size={{ xs: 12, md: 4 }}>
          <AppFeatured list={_appFeatured} />
        </Grid> */}

        { /*<Grid size={{ xs: 12, md: 4 }}>
          <AppWidgetSummary
            title="Total active users"
            percent={2.6}
            total={18765}
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [15, 18, 12, 51, 68, 11, 39, 37],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AppWidgetSummary
            title="Total installed"
            percent={0.2}
            total={4876}
            chart={{
              colors: [theme.palette.info.main],
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [20, 41, 63, 33, 28, 35, 50, 46],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AppWidgetSummary
            title="Total downloads"
            percent={-0.1}
            total={678}
            chart={{
              colors: [theme.palette.error.main],
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [18, 19, 31, 8, 16, 37, 12, 33],
            }}
          />
        </Grid> */}

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AppCurrentDownload
            title={`Tasks This ${downloadView === 'week' ? 'Week' : 'Month'}`}
            subheader={`Breakdown by status (${downloadView === 'week' ? 'week' : 'month'})`}
            tasks={tasks}
            view={downloadView}
            onViewChange={setDownloadView}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <AppAreaInstalled
            title={`${areaView === 'week' ? 'Weekly' : 'Monthly'} Task Distribution`}
            subheader={`Tasks by status for the current ${areaView === 'week' ? 'week' : 'month'}`}
            tasks={tasks}
            view={areaView}
            onViewChange={setAreaView}
          />
        </Grid>

        {/* <Grid size={{ xs: 12, lg: 8 }}>
          <AppNewInvoice
            title="New invoice"
            tableData={_appInvoices}
            headCells={[
              { id: 'id', label: 'Invoice ID' },
              { id: 'category', label: 'Category' },
              { id: 'price', label: 'Price' },
              { id: 'status', label: 'Status' },
              { id: '' },
            ]}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AppTopRelated title="Related applications" list={_appRelated} />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AppTopInstalledCountries title="Top installed countries" list={_appInstalled} />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AppTopAuthors title="Top authors" list={_appAuthors} />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
            <AppWidget
              title="Conversion"
              total={38566}
              icon="solar:user-rounded-bold"
              chart={{ series: 48 }}
            />

            <AppWidget
              title="Applications"
              total={55566}
              icon="solar:letter-bold"
              chart={{
                series: 75,
                colors: [theme.vars.palette.info.light, theme.vars.palette.info.main],
              }}
              sx={{ bgcolor: 'info.dark', [`& .${svgColorClasses.root}`]: { color: 'info.light' } }}
            />
          </Box>
        </Grid> */}

        <AppTaskForm
          open={openTaskForm}
          onClose={handleCloseTaskForm}
          onSubmit={handleCreateOrUpdateTask}
          editTask={editingTask}
        />
        <Dialog open={confirmDeleteOpen} onClose={cancelDelete}>
          <DialogContent>
            <Typography>Do you really want to delete this task?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete} color="inherit">Cancel</Button>
            <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
          </DialogActions>
        </Dialog>
      </Grid>
    </DashboardContent>
  );
}

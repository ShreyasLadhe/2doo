"use client"

import { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Checkbox from '@mui/material/Checkbox';
import { Iconify } from 'src/components/iconify';
import { AppTaskList } from 'src/sections/overview/app/app-task-list';
import { AppTaskForm } from 'src/sections/overview/app/app-task-form';
import { supabase } from 'src/lib/supabase';
import Pagination from '@mui/material/Pagination';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import LinearProgress from '@mui/material/LinearProgress';
import Grow from '@mui/material/Grow';
import { useAuthContext } from 'src/auth/hooks';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Masonry from '@mui/lab/Masonry';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Autocomplete from '@mui/material/Autocomplete';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ConfettiAnimation } from 'src/components/confetti-animation';
import { FiGrid, FiSearch } from 'react-icons/fi';
dayjs.extend(utc);
dayjs.extend(timezone);

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [datePart, timePart] = dateStr.split(' ');
  const [year, month, day] = datePart.split('-');
  return `${day}-${month}-${year} ${timePart || '00:00'}`;
}

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

export default function MyTasksPage() {
  const { user } = useAuthContext();
  const [tasks, setTasks] = useState([]);
  const [openTaskForm, setOpenTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardView, setCardView] = useState(false);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({}); // {taskId: true/false}
  const [openSubtasksTask, setOpenSubtasksTask] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [listPage, setListPage] = useState(1);
  const [dense, setDense] = useState(false);
  const [subtaskPopover, setSubtaskPopover] = useState({ anchorEl: null, subtaskId: null, text: '' });
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchAnchorEl, setSearchAnchorEl] = useState(null);
  const [dateAnchorEl, setDateAnchorEl] = useState(null);
  const [tagAnchorEl, setTagAnchorEl] = useState(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [tagExpanded, setTagExpanded] = useState(false);
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

  // Filtering logic for search, date range, and tags
  let filteredTasks = tasks;
  if (searchText) {
    filteredTasks = filteredTasks.filter(task =>
      task.title?.toLowerCase().includes(searchText.toLowerCase())
    );
  }
  if (startDate) {
    filteredTasks = filteredTasks.filter(task =>
      task.due_date && dayjs(task.due_date).isAfter(dayjs(startDate).startOf('day'), 'minute')
    );
  }
  if (endDate) {
    filteredTasks = filteredTasks.filter(task =>
      task.due_date && dayjs(task.due_date).isBefore(dayjs(endDate).endOf('day'), 'minute')
    );
  }
  if (selectedTags.length > 0) {
    filteredTasks = filteredTasks.filter(task =>
      task.tags && task.tags.some(tag => selectedTags.some(sel => sel.tag_id === tag.tag_id))
    );
  }

  const CARDS_PER_PAGE = 9;
  const CARDS_PER_ROW = 3;
  const totalPages = Math.ceil(filteredTasks.length / CARDS_PER_PAGE);
  const paginatedTasks = filteredTasks.slice((page - 1) * CARDS_PER_PAGE, page * CARDS_PER_PAGE);
  const ROWS_PER_PAGE = dense ? 15 : 10;
  const totalListPages = Math.ceil(filteredTasks.length / ROWS_PER_PAGE);
  const paginatedListTasks = filteredTasks.slice((listPage - 1) * ROWS_PER_PAGE, listPage * ROWS_PER_PAGE);

  // Helper function to chunk array into groups of 3
  function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  // Function to fetch tasks
  const fetchTasks = async () => {
    setLoading(true);
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user?.id)
      .order('id', { ascending: true });
    if (tasksError) {
      setTasks([]);
      setLoading(false);
      return;
    }
    // Fetch all subtasks for these tasks
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
    // Attach subtasks and tags to tasks
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
    setLoading(false);
  };

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

  // Fetch tasks and subtasks from Supabase
  useEffect(() => {
    fetchTasks();
  }, [user?.id]);

  useEffect(() => {
    document.title = 'My Tasks - 2DOO';
  }, []);

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

  const handleCreateTask = () => {
    setTimeout(() => {
      fetchTasks();
    }, 500);
  };

  const handleExpandClick = (taskId) => {
    setExpanded((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Handle view switching
  const handleViewSwitch = () => {
    setCardView((v) => !v);
  };

  // Delete task and its subtasks
  const handleDeleteTask = async (task) => {
    setTaskToDelete(task);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    await supabase.from('subtasks').delete().eq('task_id', taskToDelete.task_id);
    await supabase.from('tasks').delete().eq('id', taskToDelete.id);
    setConfirmDeleteOpen(false);
    setTaskToDelete(null);
    await fetchTasks();
    setLoading(false);
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

  return (
    <Container maxWidth="xl" sx={{ py: 5 }}>
      {showConfetti && <ConfettiAnimation />}
      <Typography variant="h3" fontWeight={700} gutterBottom>
        My Tasks
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end" sx={{ width: '100%', flexWrap: 'wrap', gap: 1 }}>
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
          {/* Date Range Icon/Popover */}
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
            onClick={handleViewSwitch}
            title={cardView ? 'Switch to List View' : 'Switch to Grid View'}
            disableRipple
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              '&:hover': {
                backgroundColor: 'transparent'
              },
              '&:active': {
                backgroundColor: 'transparent'
              }
            }}
          >
            {cardView ? <Iconify icon='solar:list-bold' width={24} /> : <FiGrid size={24} />}
            <Typography variant="body2" sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
              {cardView ? 'List View' : 'Grid View'}
            </Typography>
          </IconButton>
          {/* New Task Button at the far right */}
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
                  display: { xs: 'flex' },
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
      </Box>
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
                            <Stack direction="row" alignItems="center">
                              <Chip label={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} size="small" color={(task.priority === 'high' && 'error') || (task.priority === 'medium' && 'warning') || 'success'} />
                            </Stack>
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
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
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
                              <Chip
                                label={
                                  <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', p: 0 }}>
                                    <span style={{ fontWeight: 500, color: 'text.secondary' }}>Due: {date}</span>
                                    <span style={{ color: '#aaa', fontSize: '0.95em', marginLeft: 8 }}>{time}</span>
                                  </Box>
                                }
                                size="small"
                                icon={<Iconify icon="solar:calendar-bold" />}
                                variant="soft"
                                sx={{ bgcolor: 'background.neutral' }}
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
                            {/* Tags bottom left */}
                            <Box>
                              {task.tags && task.tags.length > 0 && (
                                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                  {task.tags.map((tag) => (
                                    <Chip key={tag.tag_id} label={tag.name} size="small" color="info" variant="soft" />
                                  ))}
                                </Stack>
                              )}
                            </Box>
                            {/* Edit/Delete bottom right */}
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
                                            height: 20,
                                            fontSize: '0.75rem',
                                            color: 'white',
                                            bgcolor: (theme) => theme.palette.error.dark,
                                          }}
                                        />
                                      )}
                                    </Box>
                                  </Stack>
                                  <Stack direction="row" alignItems="center">
                                    <Chip label={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} size="small" color={(task.priority === 'high' && 'error') || (task.priority === 'medium' && 'warning') || 'success'} />
                                  </Stack>
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
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
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
                                    <Chip
                                      label={
                                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', p: 0 }}>
                                          <span style={{ fontWeight: 500, color: 'text.secondary' }}>Due: {date}</span>
                                          <span style={{ color: '#aaa', fontSize: '0.95em', marginLeft: 8 }}>{time}</span>
                                        </Box>
                                      }
                                      size="small"
                                      icon={<Iconify icon="solar:calendar-bold" />}
                                      variant="soft"
                                      sx={{ bgcolor: 'background.neutral' }}
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
                                  {/* Tags bottom left */}
                                  <Box>
                                    {task.tags && task.tags.length > 0 && (
                                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                        {task.tags.map((tag) => (
                                          <Chip key={tag.tag_id} label={tag.name} size="small" color="info" variant="soft" />
                                        ))}
                                      </Stack>
                                    )}
                                  </Box>
                                  {/* Edit/Delete bottom right */}
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
                      {/* Fill empty columns if needed */}
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
        <>
          <AppTaskList
            title="All Tasks"
            subheader="Manage all your tasks in one place."
            tableData={paginatedListTasks}
            headCells={[
              { id: 'title', label: 'Task', minWidth: 500 },
              { id: 'description', label: 'Description', minWidth: 260 },
              { id: 'subtasks', label: 'Subtasks', minWidth: 120 },
              { id: 'dueDate', label: 'Due Date', minWidth: 120 },
              { id: 'priority', label: 'Priority' },
              { id: 'actions', label: 'Actions' },
            ]}
            hideViewAll={true}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onMarkCompleteTask={handleMarkCompleteTask}
            dense={dense}
            onToggleDense={() => setDense((d) => !d)}
            animatingTaskId={animatingTaskId}
          />
          {totalListPages > 1 && (
            <Stack alignItems="center" sx={{ mt: 4 }}>
              <Pagination
                count={totalListPages}
                page={listPage}
                onChange={(_, value) => setListPage(value)}
                color="primary"
                shape="rounded"
              />
            </Stack>
          )}
        </>
      )}
      <AppTaskForm
        open={openTaskForm}
        onClose={handleCloseTaskForm}
        onSubmit={handleCreateTask}
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
    </Container>
  );
}
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

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
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

  // Filtering logic for search, date range, and tags
  let filteredTasks = tasks;
  if (searchText) {
    filteredTasks = filteredTasks.filter(task =>
      task.title?.toLowerCase().includes(searchText.toLowerCase())
    );
  }
  if (startDate) {
    filteredTasks = filteredTasks.filter(task => task.due_date >= new Date(startDate).toISOString().slice(0, 10));
  }
  if (endDate) {
    filteredTasks = filteredTasks.filter(task => task.due_date <= new Date(endDate).toISOString().slice(0, 10));
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
    const today = new Date().toISOString().slice(0, 10);
    tasksWithSubtasks = tasksWithSubtasks.map(task => {
      const isOverdue = task.due_date < today && task.status !== 'completed';
      return { ...task, isOverdue };
    });
    // Sort: overdue first, then by priority, then due date
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    tasksWithSubtasks.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return b.isOverdue - a.isOverdue;
      const pa = priorityOrder[a.priority] ?? 4;
      const pb = priorityOrder[b.priority] ?? 4;
      if (pa !== pb) return pa - pb;
      return (a.due_date || '').localeCompare(b.due_date || '');
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
    fetchTasks(); // Fetch fresh data when switching views
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
    setLoading(true);
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
    await fetchTasks();
    setLoading(false);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 5 }}>
      <Typography variant="h3" fontWeight={700} gutterBottom>
        My Tasks
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end" sx={{ width: '100%' }}>
          {/* Search Icon/Input */}
          {searchExpanded ? (
            <TextField
              label="Search by Title"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              size="small"
              autoFocus
              onBlur={() => setSearchExpanded(false)}
              sx={{ minWidth: 220, transition: 'min-width 0.2s' }}
            />
          ) : (
            <IconButton onClick={() => setSearchExpanded(true)}>
              <Iconify icon="solar:magnifer-bold" />
            </IconButton>
          )}
          {/* Date Range Icon/Popover (unchanged) */}
          <IconButton onClick={e => setDateAnchorEl(e.currentTarget)}>
            <Iconify icon="solar:calendar-bold" />
          </IconButton>
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
              sx={{ minWidth: 220, transition: 'min-width 0.2s' }}
            />
          ) : (
            <IconButton onClick={() => setTagExpanded(true)}>
              <Iconify icon="solar:tag-bold" />
            </IconButton>
          )}
          {/* Card/List View Toggle */}
          <IconButton
            color={cardView ? 'primary' : 'default'}
            onClick={handleViewSwitch}
            title={cardView ? 'Switch to List View' : 'Switch to Card View'}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <Iconify icon={cardView ? 'solar:list-bold' : 'solar:card-bold'} width={24} />
            <Typography variant="body2" sx={{ ml: 1 }}>
              {cardView ? 'List View' : 'Card View'}
            </Typography>
          </IconButton>
          {/* New Task Button at the far right */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenTaskForm}
            sx={{ ml: 2 }}
          >
            New Task
          </Button>
          {/* Expand/Compress All button for card view */}
          {cardView && (
            <Button
              variant="outlined"
              startIcon={
                Object.values(expanded).filter(Boolean).length === paginatedTasks.length
                  ? <Iconify icon="eva:arrow-ios-upward-fill" />
                  : <Iconify icon="eva:arrow-ios-downward-fill" />
              }
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
                // Always switch to Masonry layout when expanding/compressing all
                if (!cardView) setCardView(true);
              }}
              sx={{ ml: 1 }}
            >
              {Object.values(expanded).filter(Boolean).length === paginatedTasks.length ? 'Compress All' : 'Expand All'}
            </Button>
          )}
        </Stack>
      </Box>
      {cardView ? (
        <>
          {Object.values(expanded).some(Boolean) ? (
            <Masonry columns={3} spacing={4}>
              {paginatedTasks.map((task) => (
                <Card key={task.id} sx={{
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
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          gutterBottom
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
                      </Stack>
                      <Chip label={task.priority} size="small" color={(task.priority === 'high' && 'error') || (task.priority === 'medium' && 'warning') || 'success'} />
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
                    {expanded[task.id] && task.subtasks && task.subtasks.length > 0 && (
                      <Box sx={{ mb: 1, mt: 1 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Subtasks</Typography>
                        <Stack spacing={1}>
                          {task.subtasks.map((sub) => (
                            <Box key={sub.id} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', p: 1, borderRadius: 1, bgcolor: sub.completed ? 'success.lighter' : 'background.paper', color: sub.completed ? 'success.dark' : 'text.primary', border: '1px solid', borderColor: sub.completed ? 'success.main' : 'grey.200' }}>
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
                              <IconButton size="small" onClick={() => {
                                setEditingSubtask({ ...sub, task });
                                setEditSubtaskDialogOpen(true);
                              }} sx={{ color: 'primary.main' }}>
                                <Iconify icon="solar:pen-bold" />
                              </IconButton>
                              <IconButton size="small" onClick={async () => {
                                await supabase
                                  .from('subtasks')
                                  .delete()
                                  .eq('id', sub.id);
                                fetchTasks();
                              }} sx={{ color: 'error.main' }}>
                                <Iconify icon="solar:trash-bin-trash-bold" />
                              </IconButton>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Chip label={`Due: ${formatDateDisplay(task.due_date)}`} size="small" icon={<Iconify icon="solar:calendar-bold" />} variant="outlined" />
                    </Stack>
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
              ))}
            </Masonry>
          ) : (
            <>
              {chunkArray(paginatedTasks, 3).map((row, rowIndex, arr) => (
                <Grid container spacing={4} justifyContent="center" alignItems="stretch" sx={{ width: '100%', margin: 0, mb: rowIndex !== arr.length - 1 ? 8 : 0 }} key={rowIndex}>
                  {row.map((task) => (
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
                              <Typography
                                variant="h6"
                                fontWeight={700}
                                gutterBottom
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
                            </Stack>
                            <Chip label={task.priority} size="small" color={(task.priority === 'high' && 'error') || (task.priority === 'medium' && 'warning') || 'success'} />
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
                          {expanded[task.id] && task.subtasks && task.subtasks.length > 0 && (
                            <Box sx={{ mb: 1, mt: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1 }}>Subtasks</Typography>
                              <Stack spacing={1}>
                                {task.subtasks.map((sub) => (
                                  <Box key={sub.id} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', p: 1, borderRadius: 1, bgcolor: sub.completed ? 'success.lighter' : 'background.paper', color: sub.completed ? 'success.dark' : 'text.primary', border: '1px solid', borderColor: sub.completed ? 'success.main' : 'grey.200' }}>
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
                                    <IconButton size="small" onClick={() => {
                                      setEditingSubtask({ ...sub, task });
                                      setEditSubtaskDialogOpen(true);
                                    }} sx={{ color: 'primary.main' }}>
                                      <Iconify icon="solar:pen-bold" />
                                    </IconButton>
                                    <IconButton size="small" onClick={async () => {
                                      await supabase
                                        .from('subtasks')
                                        .delete()
                                        .eq('id', sub.id);
                                      fetchTasks();
                                    }} sx={{ color: 'error.main' }}>
                                      <Iconify icon="solar:trash-bin-trash-bold" />
                                    </IconButton>
                                  </Box>
                                ))}
                              </Stack>
                            </Box>
                          )}
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Chip label={`Due: ${formatDateDisplay(task.due_date)}`} size="small" icon={<Iconify icon="solar:calendar-bold" />} variant="outlined" />
                          </Stack>
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
                  ))}
                  {/* Fill empty columns if needed */}
                  {Array.from({ length: 3 - row.length }).map((_, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={`empty-${idx}`} style={{ visibility: 'hidden' }} />
                  ))}
                </Grid>
              ))}
            </>
          )}
          {totalPages > 1 && (
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
              { id: 'title', label: 'Task', minWidth: 200 },
              { id: 'description', label: 'Description', minWidth: 220 },
              { id: 'dueDate', label: 'Due Date', minWidth: 120 },
              { id: 'priority', label: 'Priority', minWidth: 100 },
              { id: 'actions', label: 'Actions', minWidth: 150 },
            ]}
            hideViewAll={true}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onMarkCompleteTask={handleMarkCompleteTask}
            dense={dense}
            onToggleDense={() => setDense((d) => !d)}
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
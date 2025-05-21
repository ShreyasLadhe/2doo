import { usePopover } from 'minimal-shared/hooks';
import { useState, useEffect } from 'react';
import { paths } from 'src/routes/paths';
import { supabase } from 'src/lib/supabase';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Pagination from '@mui/material/Pagination';
import Autocomplete from '@mui/material/Autocomplete';
import Tooltip from '@mui/material/Tooltip';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { TableHeadCustom } from 'src/components/table';
import { CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

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

export function AppTaskList({
  title = 'Task List',
  subheader = 'Your current tasks',
  tableData = [],
  headCells = [
    { id: 'title', label: 'Task', width: '25%' },
    { id: 'description', label: 'Description', width: '40%' },
    { id: 'subtasks', label: 'Subtasks', width: 120 },
    { id: 'dueDate', label: 'Due Date', width: 120 },
    { id: 'priority', label: 'Priority', width: 100 },
    { id: 'actions', label: 'Actions', width: 150 },
  ],
  sx,
  hideViewAll = false,
  onEditTask,
  onDeleteTask,
  onMarkCompleteTask,
  dense = false,
  onToggleDense,
  page = 1,
  totalPages = 1,
  onPageChange,
  availableTags = [],
  selectedTags = [],
  onTagFilterChange = () => { },
  animatingTaskId,
  onSubtaskToggle,
  ...other
}) {
  const [viewTask, setViewTask] = useState(null);
  const [expandedSubtasks, setExpandedSubtasks] = useState({});

  // Handler to fetch latest subtasks before opening dialog
  const handleViewTask = async (row) => {
    const { data: subtasks } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', row.task_id);
    setViewTask({ ...row, subtasks: subtasks || [] });
  };

  const toggleSubtasks = (taskId) => {
    setExpandedSubtasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleSubtaskToggle = async (subtask) => {
    await supabase
      .from('subtasks')
      .update({ completed: !subtask.completed })
      .eq('id', subtask.id);
    // Refresh the task view
    if (viewTask) {
      handleViewTask(viewTask);
    }
    // Call the parent's onSubtaskToggle to refresh the task list
    if (onSubtaskToggle) {
      onSubtaskToggle(subtask);
    }
  };

  const renderActions = (task) => (
    <Stack direction="row" spacing={1}>
      <IconButton
        size="small"
        onClick={() => onEditTask(task)}
        sx={{ color: 'primary.main' }}
      >
        <Iconify icon="solar:pen-bold" />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => handleViewTask(task)}
        sx={{ color: 'info.main' }}
      >
        <Iconify icon="solar:list-bold" />
      </IconButton>
    </Stack>
  );

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        sx={{ mb: 3 }}
        action={
          onToggleDense && (
            <Tooltip title={dense ? 'Switch to default spacing' : 'Switch to dense spacing'}>
              <IconButton
                color={dense ? 'primary' : 'default'}
                size="small"
                onClick={onToggleDense}
                sx={{ width: 40, height: 40 }}
              >
                <Iconify icon={dense ? 'solar:list-bold' : 'solar:list-down-bold-duotone'} width={24} />
              </IconButton>
            </Tooltip>
          )
        }
      />

      {tableData?.length === 0 ? (
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
        <Scrollbar sx={{ minHeight: 402, maxWidth: '100%' }}>
          <Table
            sx={{
              minWidth: { xs: '100%', sm: 1100 },
              width: '100%',
              tableLayout: 'fixed',
              mx: 'auto',
              '& .MuiTableCell-root': {
                px: { xs: 1, sm: 2 },
                py: { xs: 1.5, sm: 2 },
              }
            }}
            size={dense ? 'small' : 'medium'}
          >
            <TableHeadCustom headCells={headCells} />

            <TableBody>
              {tableData?.map((row) => (
                <RowItem
                  key={row.id}
                  row={row}
                  onView={() => handleViewTask(row)}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  onMarkCompleteTask={onMarkCompleteTask}
                  dense={dense}
                  animatingTaskId={animatingTaskId}
                  expandedSubtasks={expandedSubtasks}
                  onToggleSubtasks={toggleSubtasks}
                  onSubtaskToggle={handleSubtaskToggle}
                />
              ))}
            </TableBody>
          </Table>
        </Scrollbar>
      )}

      {totalPages > 1 && tableData?.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => onPageChange && onPageChange(value)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      <Divider sx={{ borderStyle: 'dashed' }} />

      {!hideViewAll && (
        <Box sx={{ p: 2, textAlign: 'right' }}>
          <Button
            size="small"
            color="inherit"
            endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ ml: -0.5 }} />}
            component="a"
            href={paths.dashboard.myTasks}
          >
            View all tasks
          </Button>
        </Box>
      )}

      <TaskViewDialog task={viewTask} onClose={() => setViewTask(null)} />
    </Card>
  );
}

AppTaskList.propTypes = {
  title: PropTypes.string,
  subheader: PropTypes.string,
  tableData: PropTypes.array,
  headCells: PropTypes.array,
  sx: PropTypes.object,
  hideViewAll: PropTypes.bool,
  onEditTask: PropTypes.func,
  onDeleteTask: PropTypes.func,
  onMarkCompleteTask: PropTypes.func,
  dense: PropTypes.bool,
  onToggleDense: PropTypes.func,
  page: PropTypes.number,
  totalPages: PropTypes.number,
  onPageChange: PropTypes.func,
  availableTags: PropTypes.array,
  selectedTags: PropTypes.array,
  onTagFilterChange: PropTypes.func,
  animatingTaskId: PropTypes.string,
  onSubtaskToggle: PropTypes.func,
};

// ----------------------------------------------------------------------

function TaskViewDialog({ task, onClose }) {
  const [checked, setChecked] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [editSubtask, setEditSubtask] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subtaskToDelete, setSubtaskToDelete] = useState(null);

  // Initialize subtasks and checked state from task prop
  useEffect(() => {
    if (task && Array.isArray(task.subtasks)) {
      setSubtasks(task.subtasks);
      setChecked(task.subtasks.map((sub) => !!sub.completed));
    }
  }, [task]);

  if (!task) return null;
  const completed = checked.filter(Boolean).length;
  const total = subtasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Toggle subtask completion and update Supabase
  const handleToggle = async (index) => {
    const subtask = subtasks[index];
    const newChecked = [...checked];
    newChecked[index] = !newChecked[index];
    setChecked(newChecked);
    await supabase
      .from('subtasks')
      .update({ completed: newChecked[index] })
      .eq('subtask_id', subtask.subtask_id);
    setSubtasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], completed: newChecked[index] };
      return updated;
    });
  };

  // Edit subtask handlers
  const openEditDialog = (subtask) => {
    setEditSubtask(subtask);
    setEditTitle(subtask.title);
    setEditDialogOpen(true);
  };
  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditSubtask(null);
    setEditTitle('');
  };
  const handleEditSubtask = async () => {
    await supabase
      .from('subtasks')
      .update({ title: editTitle })
      .eq('id', editSubtask.id);
    setSubtasks((prev) => prev.map(s => s.id === editSubtask.id ? { ...s, title: editTitle } : s));
    closeEditDialog();
  };

  // Delete subtask handlers
  const openDeleteDialog = (subtask) => {
    setSubtaskToDelete(subtask);
    setDeleteDialogOpen(true);
  };
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSubtaskToDelete(null);
  };
  const handleDeleteSubtask = async () => {
    await supabase
      .from('subtasks')
      .delete()
      .eq('id', subtaskToDelete.id);
    setSubtasks((prev) => prev.filter(s => s.id !== subtaskToDelete.id));
    setChecked((prev) => prev.filter((_, idx) => subtasks[idx].id !== subtaskToDelete.id));
    closeDeleteDialog();
  };

  // In the TaskViewDialog, update the display for due date and completion date.
  const { date: dueDate, time: dueTime } = splitDateTime(task.due_date);
  const completionDateTime = task.status === 'completed' && task.completed_at ? splitAndFormatCompletedAt(task.completed_at) : null;

  // Priority chip color
  const priorityColor =
    (task.priority === 'overdue' && 'error') ||
    (task.priority === 'high' && 'error') ||
    (task.priority === 'medium' && 'warning') ||
    'success';

  // Status chip color
  const statusColor =
    (task.status === 'completed' && 'success') ||
    (task.status === 'in-progress' && 'warning') ||
    'default';

  return (
    <Dialog open={!!task} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent dividers sx={{ bgcolor: 'background.default', p: 0 }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>{task.title}</Typography>
          {task.description && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {task.description}
            </Typography>
          )}
          <Divider sx={{ mb: 2 }} />
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            {/* Display Completion Date/Time if completed */}
            {completionDateTime && (
              <Chip label={<>Completed: {completionDateTime.date} {completionDateTime.time}</>} icon={<Iconify icon="solar:check-circle-bold-duotone" />} variant="soft" color="success" />
            )}

            {/* Display Due Date/Time if not completed */}
            {!completionDateTime && (
              <Chip label={`Due: ${dueDate} ${dueTime}`} icon={<Iconify icon="solar:calendar-bold" />} variant="outlined" />
            )}
            <Chip label={task.priority} color={priorityColor} icon={<Iconify icon="solar:flag-bold" />} />
            <Chip label={task.status} color={statusColor} icon={<Iconify icon="solar:check-circle-bold" />} />
          </Stack>
          <Divider sx={{ my: 2 }} />
          {subtasks.length > 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>
                Subtasks
              </Typography>
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 2 }} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {completed} of {total} subtasks completed ({progress}%)
                </Typography>
              </Box>
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 2 }}>
                <List dense>
                  {subtasks.map((sub, idx) => (
                    <ListItem key={sub.subtask_id || sub.id || idx} disableGutters sx={{ py: 0.5 }}
                      secondaryAction={
                        <Stack direction="row" spacing={1}>
                          <IconButton size="small" onClick={() => openEditDialog(sub)} sx={{ color: 'primary.main' }}>
                            <Iconify icon="solar:pen-bold" />
                          </IconButton>
                          <IconButton size="small" onClick={() => openDeleteDialog(sub)} sx={{ color: 'error.main' }}>
                            <Iconify icon="solar:trash-bin-trash-bold" />
                          </IconButton>
                        </Stack>
                      }
                    >
                      <Checkbox
                        checked={checked[idx] || false}
                        onChange={() => handleToggle(idx)}
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="body2">{sub.title}</Typography>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>
          )}
        </Paper>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
      {/* Edit Subtask Dialog */}
      <Dialog open={editDialogOpen} onClose={closeEditDialog}>
        <DialogContent>
          <Typography variant="h6">Edit Subtask</Typography>
          <TextField
            fullWidth
            label="Subtask Title"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog} color="inherit">Cancel</Button>
          <Button onClick={handleEditSubtask} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      {/* Delete Subtask Dialog */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogContent>
          <Typography>Do you really want to delete this subtask?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} color="inherit">Cancel</Button>
          <Button onClick={handleDeleteSubtask} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function RowItem({ row, onView, onEditTask, onDeleteTask, onMarkCompleteTask, dense, animatingTaskId, expandedSubtasks, onToggleSubtasks, onSubtaskToggle }) {
  const menuActions = usePopover();

  const handleEdit = () => {
    menuActions.onClose();
    if (onEditTask) onEditTask(row);
  };

  const handleDelete = () => {
    menuActions.onClose();
    if (onDeleteTask) onDeleteTask(row);
  };

  const handleMarkComplete = () => {
    menuActions.onClose();
    if (onMarkCompleteTask) onMarkCompleteTask(row);
  };

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        <MenuItem onClick={handleEdit}>
          <Iconify icon="solar:pen-bold" />
          Edit
        </MenuItem>

        <MenuItem onClick={handleMarkComplete} title="Mark as Complete">
          <Iconify icon="eva:checkmark-circle-2-fill" />
          Mark Complete
        </MenuItem>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }} title="Delete Task">
          <Iconify icon="solar:trash-bin-trash-bold" />
          Delete
        </MenuItem>
      </MenuList>
    </CustomPopover>
  );

  // In the due date/completion date cell, use the correct formatting function.
  const { date: dueDate, time: dueTime } = splitDateTime(row.due_date);
  const hasSubtasks = row.subtasks && row.subtasks.length > 0;
  const completedSubtasks = hasSubtasks ? row.subtasks.filter(sub => sub.completed).length : 0;
  const totalSubtasks = hasSubtasks ? row.subtasks.length : 0;
  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <>
      <TableRow
        sx={{
          ...(row.isOverdue
            ? {
              color: (theme) => theme.palette.error.main,
              '& td, & th': { color: (theme) => theme.palette.error.main },
            }
            : {}),
          '& td, & th': {
            borderBottom: 'none',
          },
        }}
        hover
        selected={false}
        tabIndex={-1}
        size={dense ? 'small' : 'medium'}
      >
        <TableCell sx={{
          ...(row.isOverdue
            ? { color: (theme) => theme.palette.error.main }
            : row.status === 'completed'
              ? { color: 'success.main' }
              : {}),
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1.5,
          pl: 2,
          pr: 3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 40 }}>
            <Checkbox
              checked={row.status === 'completed'}
              onChange={() => onMarkCompleteTask(row)}
              color='success'
              sx={{ mr: 1, p: 0.5 }}
              disabled={row.status === 'completed'}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', ml: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant='body1'
                  fontWeight={600}
                  sx={{
                    lineHeight: 1.2,
                    ...(row.status === 'completed' && {
                      textDecoration: 'line-through',
                      color: 'success.main',
                    }),
                  }}
                  className={`strikethrough-animation ${animatingTaskId === row.id ? 'animate' : ''}`}
                >
                  {row.title}
                </Typography>
              </Box>
              {row.isOverdue && (
                <Chip
                  label='Overdue'
                  size='small'
                  color='error'
                  variant='filled'
                  sx={{
                    height: 20,
                    fontSize: '0.75rem',
                    color: 'white',
                    bgcolor: (theme) => theme.palette.error.dark,
                    mt: 0.5,
                    mb: 0.5,
                    width: 'fit-content'
                  }}
                />
              )}
              {row.tags && row.tags.length > 0 && (
                <Stack direction='row' spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                  {row.tags.map((tag) => (
                    <Chip key={tag.tag_id} label={tag.name} size='small' color='info' variant='soft' />
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        </TableCell>
        <TableCell sx={{
          color: row.isOverdue ? (theme) => theme.palette.error.main : row.status === 'completed' ? 'success.main' : undefined,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pl: 2
        }}>
          <Typography variant='body2' color='text.secondary' sx={{ whiteSpace: 'pre-line', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {row.description}
          </Typography>
        </TableCell>
        <TableCell>
          {hasSubtasks ? (
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton
                  size="small"
                  onClick={() => onToggleSubtasks(row.id)}
                  sx={{ p: 0.5 }}
                >
                  <Iconify
                    icon={expandedSubtasks[row.id] ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                    width={20}
                  />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      backgroundColor: (theme) => theme.palette.grey[200],
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 1,
                        backgroundColor: (theme) =>
                          progress === 100
                            ? theme.palette.success.main
                            : theme.palette.primary.main,
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {completedSubtasks}/{totalSubtasks}
                  </Typography>
                </Box>
              </Stack>
              {expandedSubtasks[row.id] && (
                <Box sx={{ mt: 1, pl: 4 }}>
                  <List dense disablePadding>
                    {row.subtasks.map((subtask) => (
                      <ListItem
                        key={subtask.id}
                        disableGutters
                        sx={{ py: 0.5 }}
                      >
                        <Checkbox
                          checked={subtask.completed}
                          onChange={() => onSubtaskToggle(subtask)}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            textDecoration: subtask.completed ? 'line-through' : 'none',
                            color: subtask.completed ? 'success.main' : 'text.primary',
                          }}
                        >
                          {subtask.title}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No subtasks
            </Typography>
          )}
        </TableCell>
        <TableCell sx={row.isOverdue ? { color: (theme) => theme.palette.error.main } : row.status === 'completed' ? { color: 'success.main' } : {}}>
          {row.status === 'completed' ? (
            <>
              {/* Always show Due Date/Time */}
              {(() => { const { date, time } = splitDateTime(row.due_date); return <span style={{ textDecoration: 'line-through' }}>{date}{" "}<span style={{ color: '#aaa', fontSize: '0.9em' }}>{time}</span></span>; })()}
              {/* Show Completed Date/Time if available */}
              {row.completed_at && (
                <span style={{ display: 'block', marginTop: '8px' }}>{(() => { const { date, time } = splitAndFormatCompletedAt(row.completed_at); return <span>Completed: {date}{" "}<span style={{ color: '#aaa', fontSize: '0.9em' }}>{time}</span></span>; })()}</span>
              )}
            </>
          ) : (
            /* Only show Due Date/Time for incomplete tasks */
            (() => { const { date, time } = splitDateTime(row.due_date); return <span>{date}{" "}<span style={{ color: '#aaa', fontSize: '0.9em' }}>{time}</span></span>; })()
          )}
        </TableCell>
        <TableCell sx={{
          minWidth: 100,
        }}>
          <Label
            variant='soft'
            color={
              (row.priority === 'high' && 'error') ||
              (row.priority === 'medium' && 'warning') ||
              'success'
            }
          >
            {row.priority}
          </Label>
        </TableCell>
        <TableCell>
          <Stack direction='row' spacing={1}>
            <IconButton color='info' onClick={onView}>
              <Iconify icon='solar:eye-bold' />
            </IconButton>
            <IconButton color='primary' onClick={handleEdit}>
              <Iconify icon='solar:pen-bold' />
            </IconButton>
            <IconButton
              color={row.priority === 'overdue' ? 'error' : 'error'}
              onClick={handleDelete} title='Delete Task'>
              <Iconify icon='solar:trash-bin-trash-bold' />
            </IconButton>
          </Stack>
        </TableCell>
      </TableRow>
    </>
  );
}

RowItem.propTypes = {
  row: PropTypes.object.isRequired,
  onView: PropTypes.func,
  onEditTask: PropTypes.func,
  onDeleteTask: PropTypes.func,
  onMarkCompleteTask: PropTypes.func,
  dense: PropTypes.bool,
  animatingTaskId: PropTypes.string,
  expandedSubtasks: PropTypes.object,
  onToggleSubtasks: PropTypes.func,
  onSubtaskToggle: PropTypes.func,
}; 
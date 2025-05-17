import { usePopover } from 'minimal-shared/hooks';
import { useState, useEffect } from 'react';
import { paths } from 'src/routes/paths';
import { supabase } from 'src/lib/supabase';
import PropTypes from 'prop-types';

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

// Helper to split date and time
function splitDateTime(dateStr) {
  if (!dateStr) return { date: '', time: '' };
  let datePart = '', timePart = '';
  if (dateStr.includes('T')) {
    [datePart, timePart] = dateStr.split('T');
    timePart = timePart.split(/[+Z]/)[0];
  } else {
    [datePart, timePart] = dateStr.split(' ');
  }
  const [year, month, day] = datePart.split('-');
  const [hour = '00', minute = '00'] = (timePart || '').split(':');
  return {
    date: `${day}-${month}-${year}`,
    time: `${hour}:${minute}`,
  };
}

export function AppTaskList({
  title = 'Task List',
  subheader = 'Your current tasks',
  tableData = [],
  headCells = [
    { id: 'title', label: 'Task', minWidth: 300 },
    { id: 'description', label: 'Description', minWidth: 260 },
    { id: 'dueDate', label: 'Due Date', minWidth: 120 },
    { id: 'priority', label: 'Priority', minWidth: 100 },
    { id: 'actions', label: 'Actions', minWidth: 150 },
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
  ...other
}) {
  const [viewTask, setViewTask] = useState(null);

  // Handler to fetch latest subtasks before opening dialog
  const handleViewTask = async (row) => {
    const { data: subtasks } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', row.task_id);
    setViewTask({ ...row, subtasks: subtasks || [] });
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
            <Button
              variant={dense ? 'contained' : 'outlined'}
              color={dense ? 'primary' : 'inherit'}
              size="small"
              onClick={onToggleDense}
              sx={{ minWidth: 80 }}
            >
              Dense
            </Button>
          )
        }
      />

      <Scrollbar sx={{ minHeight: 402, maxWidth: '100%' }}>
        <Table sx={{ minWidth: 1100, width: '100%', tableLayout: 'fixed' }} size={dense ? 'small' : 'medium'}>
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
              />
            ))}
          </TableBody>
        </Table>
      </Scrollbar>

      {totalPages > 1 && (
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
            <Chip label={`Due: ${formatDateDisplay(task.due_date)}`} icon={<Iconify icon="solar:calendar-bold" />} variant="outlined" />
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

function RowItem({ row, onView, onEditTask, onDeleteTask, onMarkCompleteTask, dense }) {
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

  return (
    <>
      <TableRow
        sx={{
          ...(row.priority === 'overdue'
            ? {
              color: (theme) => theme.palette.error.main,
              '& td, & th': { color: (theme) => theme.palette.error.main },
            }
            : {}),
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
              ? { textDecoration: 'line-through', color: 'success.main' }
              : {}),
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1.5,
          pl: 2,
          pr: 3,
          minWidth: 300,
          maxWidth: 300,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 40 }}>
            <Checkbox
              checked={row.status === 'completed'}
              onChange={() => onMarkCompleteTask && onMarkCompleteTask(row)}
              color="success"
              sx={{ mr: 1, p: 0.5 }}
              disabled={row.status === 'completed'}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', ml: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                  {row.title}
                </Typography>
                {row.isOverdue && (
                  <Chip
                    label="Overdue"
                    size="small"
                    color="error"
                    variant="soft"
                    sx={{ height: 20, fontSize: '0.75rem' }}
                  />
                )}
              </Box>
              {row.tags && row.tags.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                  {row.tags.map((tag) => (
                    <Chip key={tag.tag_id} label={tag.name} size="small" color="info" variant="soft" />
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        </TableCell>
        <TableCell sx={{ minWidth: 260, maxWidth: 260, color: row.isOverdue ? (theme) => theme.palette.error.main : row.status === 'completed' ? 'success.main' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pl: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {row.description}
          </Typography>
        </TableCell>
        <TableCell sx={row.isOverdue ? { color: (theme) => theme.palette.error.main } : row.status === 'completed' ? { textDecoration: 'line-through', color: 'success.main' } : {}}>
          {(() => { const { date, time } = splitDateTime(row.due_date); return <span>{date}<br /><span style={{ color: '#aaa', fontSize: '0.9em' }}>{time}</span></span>; })()}
        </TableCell>
        <TableCell>
          <Label
            variant="soft"
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
          <IconButton color="info" onClick={onView}>
            <Iconify icon="solar:eye-bold" />
          </IconButton>
          <IconButton color="primary" onClick={handleEdit}>
            <Iconify icon="solar:pen-bold" />
          </IconButton>
          <IconButton
            color={row.priority === 'overdue' ? 'error' : 'error'}
            onClick={handleDelete} title="Delete Task">
            <Iconify icon="solar:trash-bin-trash-bold" />
          </IconButton>
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
}; 
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';

import { Iconify } from 'src/components/iconify';
import { supabase } from 'src/lib/supabase';
import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  const hours = `${d.getHours()}`.padStart(2, '0');
  const minutes = `${d.getMinutes()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day} ${hours}:${minutes}`;
}

export function AppTaskForm({ open, onClose, onSubmit, editTask = null }) {
  const { user } = useAuthContext();
  const [hasSubtasks, setHasSubtasks] = useState(false);
  const [subtasks, setSubtasks] = useState(['']);
  const [dueDateTime, setDueDateTime] = useState(null);
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [description, setDescription] = useState('');
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

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
  }, [user?.id, open]);

  // Initialize form with edit task data if provided
  useEffect(() => {
    if (open) {
      if (editTask) {
        setHasSubtasks(editTask.subtasks?.length > 0);
        setSubtasks(editTask.subtasks?.map(st => st.title) || ['']);
        setDueDateTime(editTask.due_date ? new Date(editTask.due_date) : null);
        setPriority(['high', 'medium', 'low'].includes(editTask.priority) ? editTask.priority : '');
        setStatus(['todo', 'in-progress', 'completed'].includes(editTask.status) ? editTask.status : '');
        setDescription(editTask.description);
        setSelectedTags(editTask.tags || []);
      } else {
        setHasSubtasks(false);
        setSubtasks(['']);
        setDueDateTime(null);
        setPriority('');
        setStatus('');
        setDescription('');
        setSelectedTags([]);
      }
    }
  }, [open, editTask]);

  const handleAddSubtask = () => {
    setSubtasks([...subtasks, '']);
  };

  const handleRemoveSubtask = (index) => {
    const newSubtasks = subtasks.filter((_, i) => i !== index);
    setSubtasks(newSubtasks);
  };

  const handleSubtaskChange = (index, value) => {
    const newSubtasks = [...subtasks];
    newSubtasks[index] = value;
    setSubtasks(newSubtasks);
  };

  // Helper to get the next task_id from Supabase
  const getNextTaskId = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('task_id')
      .order('id', { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return 'TASK101';
    const lastId = data[0].task_id;
    const num = parseInt(lastId.replace('TASK', '')) + 1;
    return `TASK${num}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const taskData = {
      title: formData.get('title'),
      description,
      due_date: formatDateTime(dueDateTime),
      priority,
      status,
      user_id: user?.id,
    };

    let tagIds = [];
    // Handle tags: create new tags if needed, get tag_ids
    for (const tag of selectedTags) {
      let tagObj = availableTags.find(t => t.name === tag.name);
      if (!tagObj) {
        // Create new tag
        const tag_id = `TAG${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        const { data: newTag, error: tagError } = await supabase
          .from('tags')
          .insert([{ tag_id, user_id: user.id, name: tag.name, color: tag.color || null }])
          .select()
          .single();
        if (tagError) continue;
        tagIds.push(newTag.tag_id);
      } else {
        tagIds.push(tagObj.tag_id);
      }
    }

    if (editTask) {
      // Update existing task
      const { data: updatedTask, error: taskError } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editTask.id)
        .select()
        .single();

      if (taskError) {
        alert('Failed to update task: ' + taskError.message);
        return;
      }

      // Handle subtasks
      if (hasSubtasks) {
        // Delete existing subtasks
        await supabase
          .from('subtasks')
          .delete()
          .eq('task_id', editTask.task_id);

        // Insert new subtasks
        const subtasksArr = subtasks.filter(Boolean).map((title, idx) => ({
          subtask_id: `SUB_TASK${editTask.task_id}_${String(idx + 1).padStart(3, '0')}`,
          task_id: editTask.task_id,
          title,
          completed: false,
        }));

        if (subtasksArr.length > 0) {
          const { error: subtaskError } = await supabase
            .from('subtasks')
            .insert(subtasksArr);
          if (subtaskError) {
            alert('Failed to update subtasks: ' + subtaskError.message);
          }
        }
      }

      // Update task_tags: remove old, add new
      await supabase.from('task_tags').delete().eq('task_id', editTask.task_id);
      for (const tag_id of tagIds) {
        await supabase.from('task_tags').insert([{ task_id: editTask.task_id, tag_id }]);
      }

      onSubmit({
        ...updatedTask, subtasks: subtasks.filter(Boolean).map((title, idx) => ({
          subtask_id: `SUB_TASK${editTask.task_id}_${String(idx + 1).padStart(3, '0')}`,
          task_id: editTask.task_id,
          title,
          completed: false,
        })), tags: selectedTags
      });
    } else {
      // Create new task
      const task_id = await getNextTaskId();
      const { data: insertedTask, error: taskError } = await supabase
        .from('tasks')
        .insert([{ ...taskData, task_id }])
        .select()
        .single();

      if (taskError) {
        alert('Failed to add task: ' + taskError.message);
        return;
      }

      let subtasksArr = [];
      if (hasSubtasks) {
        subtasksArr = subtasks.filter(Boolean).map((title, idx) => ({
          subtask_id: `SUB_TASK${task_id}_${String(idx + 1).padStart(3, '0')}`,
          task_id,
          title,
          completed: false,
        }));
        if (subtasksArr.length > 0) {
          const { error: subtaskError } = await supabase
            .from('subtasks')
            .insert(subtasksArr);
          if (subtaskError) {
            alert('Failed to add subtasks: ' + subtaskError.message);
          }
        }
      }

      // Add task_tags
      for (const tag_id of tagIds) {
        await supabase.from('task_tags').insert([{ task_id, tag_id }]);
      }
      onSubmit({ ...insertedTask, subtasks: subtasksArr, tags: selectedTags });
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {editTask ? 'Edit Task' : 'Create New Task'}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              name="title"
              label="Task Title"
              required
              defaultValue={editTask?.title}
            />

            <TextField
              fullWidth
              name="description"
              label="Description"
              multiline
              minRows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Due Date & Time"
                value={dueDateTime}
                onChange={setDueDateTime}
                format="dd-MM-yyyy HH:mm"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    name: 'dueDateTime',
                  },
                }}
              />
            </LocalizationProvider>

            <FormControl fullWidth required>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priority}
                label="Priority"
                onChange={(e) => setPriority(e.target.value)}
              >
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="todo">To Do</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={hasSubtasks}
                  onChange={(e) => setHasSubtasks(e.target.checked)}
                />
              }
              label="Add Subtasks"
            />

            {hasSubtasks && (
              <Card sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle2">Subtasks</Typography>

                  {subtasks.map((subtask, index) => (
                    <TextField
                      key={index}
                      fullWidth
                      size="small"
                      value={subtask}
                      onChange={(e) => handleSubtaskChange(index, e.target.value)}
                      placeholder={`Subtask ${index + 1}`}
                      InputProps={{
                        endAdornment: index > 0 && (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              onClick={() => handleRemoveSubtask(index)}
                            >
                              <Iconify icon="solar:trash-bin-trash-bold" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  ))}

                  <Button
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={handleAddSubtask}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Add Subtask
                  </Button>
                </Stack>
              </Card>
            )}

            <Autocomplete
              multiple
              freeSolo
              options={availableTags}
              getOptionLabel={option => option.name || option}
              value={selectedTags}
              onChange={(_, newValue) => setSelectedTags(newValue.map(val => typeof val === 'string' ? { name: val } : val))}
              renderTags={(selected, getTagProps) =>
                selected.map((option, index) => (
                  <Chip {...getTagProps({ index })} key={option.name} label={option.name} color="info" variant="soft" />
                ))
              }
              renderInput={params => <TextField {...params} label="Tags" placeholder="Add tags" />}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="contained">
            {editTask ? 'Update Task' : 'Create Task'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

AppTaskForm.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
  editTask: PropTypes.object,
}; 
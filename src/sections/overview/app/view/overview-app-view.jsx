'use client';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { Dialog, DialogContent, DialogActions, Typography, Stack, Checkbox, Pagination } from '@mui/material';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import dayjs from 'dayjs';
import TextField from '@mui/material/TextField';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';

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

// ----------------------------------------------------------------------

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
    const today = dayjs().format('YYYY-MM-DD');
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
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
    fetchTasks();
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
  const todayDate = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const startOfWeek = dayjs().startOf('week').format('YYYY-MM-DD');
  const endOfWeek = dayjs().endOf('week').format('YYYY-MM-DD');

  if (tab === 'today') {
    filteredTasks = [
      ...filteredTasks.filter(task => task.isOverdue && task.status !== 'completed'),
      ...filteredTasks.filter(task => task.due_date === todayDate && task.status !== 'completed' && !task.isOverdue),
    ];
  } else if (tab === 'tomorrow') {
    filteredTasks = [
      ...filteredTasks.filter(task => task.isOverdue && task.status !== 'completed'),
      ...filteredTasks.filter(task => task.due_date === tomorrow && task.status !== 'completed' && !task.isOverdue),
    ];
  } else if (tab === 'week') {
    filteredTasks = [
      ...filteredTasks.filter(task => task.isOverdue && task.status !== 'completed'),
      ...filteredTasks.filter(
        task =>
          task.due_date >= startOfWeek &&
          task.due_date <= endOfWeek &&
          task.status !== 'completed' &&
          !task.isOverdue
      ),
    ];
  } else if (tab === 'completed') {
    filteredTasks = filteredTasks.filter(task => task.status === 'completed');
  }

  const ROWS_PER_PAGE = dense ? 15 : 10;
  const totalListPages = Math.ceil(filteredTasks.length / ROWS_PER_PAGE);
  const paginatedListTasks = filteredTasks.slice((listPage - 1) * ROWS_PER_PAGE, listPage * ROWS_PER_PAGE);

  const tasksForTheWeek = tasks.filter(task =>
    task.due_date >= startOfWeek &&
    task.due_date <= endOfWeek
  );

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 12 }}>
          <AppWelcome
            title={`Namsate 🙏 ${user?.displayName}`}
            description="What are we ticking off today!"
            img={<SeoIllustration hideBackground />}
            action={
              <Button
                variant="contained"
                color="primary"
                component="a"
                href={paths.dashboard.myTasks}
              >
                Let's Begin
              </Button>
            }
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 12 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end" sx={{ mb: 2 }}>
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
            {/* Date Range Icon */}
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
            <Button
              variant="contained"
              color="primary"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={handleOpenTaskForm}
              sx={{ ml: 2 }}
            >
              New Task
            </Button>
          </Stack>
          <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="Today" value="today" />
            <Tab label="Tomorrow" value="tomorrow" />
            <Tab label="This Week" value="week" />
            <Tab label="Completed" value="completed" />
          </Tabs>
          <AppTaskList
            title="Task List"
            subheader="Your current tasks"
            tableData={paginatedListTasks}
            headCells={[
              { id: 'title', label: 'Task' },
              { id: 'description', label: 'Description' },
              { id: 'dueDate', label: 'Due Date' },
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
          />
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

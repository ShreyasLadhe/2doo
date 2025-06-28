'use client';

import { merge } from 'es-toolkit';
import { useBoolean } from 'minimal-shared/hooks';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import { iconButtonClasses } from '@mui/material/IconButton';
import Button from '@mui/material/Button';

import { allLangs } from 'src/locales';
import { _contacts, _notifications } from 'src/_mock';

import { Logo } from 'src/components/logo';
import { useSettingsContext } from 'src/components/settings';

import { useAuthContext } from 'src/auth/hooks';

import { NavMobile } from './nav-mobile';
import { VerticalDivider } from './content';
import { NavVertical } from './nav-vertical';
import { layoutClasses } from '../core/classes';
import { NavHorizontal } from './nav-horizontal';
import { _account } from '../nav-config-account';
import { MainSection } from '../core/main-section';
import { Searchbar } from '../components/searchbar';
import { _workspaces } from '../nav-config-workspace';
import { MenuButton } from '../components/menu-button';
import { HeaderSection } from '../core/header-section';
import { LayoutSection } from '../core/layout-section';
import { AccountDrawer } from '../components/account-drawer';
import { SettingsButton } from '../components/settings-button';
import { LanguagePopover } from '../components/language-popover';
import { ContactsPopover } from '../components/contacts-popover';
import { WorkspacesPopover } from '../components/workspaces-popover';
import { navData as dashboardNavData } from '../nav-config-dashboard';
import { dashboardLayoutVars, dashboardNavColorVars } from './css-vars';
import { NotificationsDrawer } from '../components/notifications-drawer';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChecklistIcon from '@mui/icons-material/Checklist';
import { toast } from 'src/components/snackbar';
import { supabase } from 'src/lib/supabase';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

// ----------------------------------------------------------------------

export function DashboardLayout({ sx, cssVars, children, slotProps, layoutQuery = 'lg' }) {
  const theme = useTheme();

  const { user } = useAuthContext();

  const settings = useSettingsContext();

  const navVars = dashboardNavColorVars(theme, settings.state.navColor, settings.state.navLayout);

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const navData = slotProps?.nav?.data ?? dashboardNavData;

  const isNavMini = settings.state.navLayout === 'mini';
  const isNavHorizontal = settings.state.navLayout === 'horizontal';
  const isNavVertical = isNavMini || settings.state.navLayout === 'vertical';

  const canDisplayItemByRole = (allowedRoles) => !allowedRoles?.includes(user?.role);

  const router = useRouter();

  // Toast notification for tasks due today
  const notifiedRef = useRef(false);
  useEffect(() => {
    async function notifyDueTasks() {
      if (!user?.id || notifiedRef.current) return;
      // Get today's date in user's local timezone
      const localTz = dayjs.tz.guess();
      const todayStart = dayjs().tz(localTz).startOf('day');
      const todayEnd = dayjs().tz(localTz).endOf('day');
      // Fetch tasks for this user
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'completed');
      if (error || !tasks) return;
      
      // Separate tasks into overdue and due today
      const overdueTasks = [];
      const dueTodayTasks = [];
      
      tasks.forEach(task => {
        if (!task.due_date) return;
        const due = dayjs(task.due_date, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata');
        if (due.isValid()) {
          const dueLocal = due.tz(localTz);
          if (dueLocal.isBefore(todayStart)) {
            overdueTasks.push(task);
          } else if (dueLocal.isSame(todayStart, 'day')) {
            dueTodayTasks.push(task);
          }
        }
      });
      
      // Show due today notifications first
      dueTodayTasks.forEach(task => {
        toast.info((
          <>
            <b>{task.title}</b> is due today.
          </>
        ), {
          id: `due-today-${task.id}`,
          duration: Infinity,
          closeButton: true,
          style: {
            background: '#2196f3', // info blue
            color: '#fff',
            fontWeight: 700,
            boxShadow: '0 4px 24px 0 rgba(33, 150, 243, 0.18)',
            border: '2px solid #2196f3',
            borderRadius: '14px',
            padding: '18px 24px',
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          },
          icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#fff" fillOpacity="0.15"/>
              <path d="M12 8v4m0 4h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
        });
      });
      // Then show overdue notifications
      overdueTasks.forEach(task => {
        const due = dayjs(task.due_date, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata');
        toast.error((
          <div>
            <div><b>{task.title}</b> is overdue.</div>
            <div style={{ fontSize: '0.95em', opacity: 0.75, marginTop: 4 }}>
              Due: {due.isValid() ? due.format('DD MMM YYYY, HH:mm') : task.due_date}
            </div>
          </div>
        ), {
          id: `overdue-${task.id}`,
          duration: Infinity,
          closeButton: true,
          style: {
            background: 'linear-gradient(90deg, #ff1744 0%, #ff616f 100%)',
            color: '#fff',
            fontWeight: 700,
            boxShadow: '0 4px 24px 0 rgba(255, 23, 68, 0.25)',
            border: '2px solid #ff1744',
            borderRadius: '14px',
            padding: '18px 24px',
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          },
          icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#fff" fillOpacity="0.15"/>
              <path d="M12 8v4m0 4h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
        });
      });
      notifiedRef.current = true;
    }
    notifyDueTasks();
  }, [user]);

  const renderHeader = () => {
    const headerSlotProps = {
      container: {
        maxWidth: false,
        sx: {
          ...(isNavVertical && { px: { [layoutQuery]: 5 } }),
          ...(isNavHorizontal && {
            bgcolor: 'var(--layout-nav-bg)',
            height: { [layoutQuery]: 'var(--layout-nav-horizontal-height)' },
            [`& .${iconButtonClasses.root}`]: { color: 'var(--layout-nav-text-secondary-color)' },
          }),
        },
      },
    };

    const headerSlots = {
      topArea: (
        <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      bottomArea: null,
      leftArea: <Logo sx={{ ml: 1, mr: 2 }} />,
      rightArea: (
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            color="inherit"
            startIcon={<DashboardIcon />}
            onClick={() => router.push('/dashboard')}
            sx={{
              mx: { xs: 0.5, sm: 1 },
              fontWeight: 600,
              letterSpacing: 0.5,
              borderRadius: 2,
              textTransform: 'none',
              '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
              '& .MuiButton-label': { display: { xs: 'none', sm: 'block' } },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Dashboard
            </Box>
          </Button>
          <Button
            color="inherit"
            startIcon={<ChecklistIcon />}
            onClick={() => router.push('/dashboard/my-tasks')}
            sx={{
              mx: { xs: 0.5, sm: 1 },
              fontWeight: 600,
              letterSpacing: 0.5,
              borderRadius: 2,
              textTransform: 'none',
              '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
              '& .MuiButton-label': { display: { xs: 'none', sm: 'block' } },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'block' } }}>
              My Tasks
            </Box>
          </Button>
          <SettingsButton />
          <AccountDrawer data={_account} />
        </Box>
      ),
    };

    return (
      <HeaderSection
        layoutQuery={layoutQuery}
        disableElevation={isNavVertical}
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={merge(headerSlotProps, slotProps?.header?.slotProps ?? {})}
        sx={slotProps?.header?.sx}
      />
    );
  };

  const renderSidebar = () => (
    <NavVertical
      data={navData}
      isNavMini={isNavMini}
      layoutQuery={layoutQuery}
      cssVars={navVars.section}
      checkPermissions={canDisplayItemByRole}
      onToggleNav={() =>
        settings.setField(
          'navLayout',
          settings.state.navLayout === 'vertical' ? 'mini' : 'vertical'
        )
      }
    />
  );

  const renderFooter = () => null;

  const renderMain = () => <MainSection {...slotProps?.main}>{children}</MainSection>;

  return (
    <LayoutSection
      /** **************************************
       * @Header
       *************************************** */
      headerSection={renderHeader()}
      /** **************************************
       * @Sidebar
       *************************************** */
      sidebarSection={null}
      /** **************************************
       * @Footer
       *************************************** */
      footerSection={renderFooter()}
      /** **************************************
       * @Styles
       *************************************** */
      cssVars={{ ...dashboardLayoutVars(theme), ...navVars.layout, ...cssVars }}
      sx={[
        {
          [`& .${layoutClasses.sidebarContainer}`]: {
            [theme.breakpoints.up(layoutQuery)]: {
              pl: isNavMini ? 'var(--layout-nav-mini-width)' : 'var(--layout-nav-vertical-width)',
              transition: theme.transitions.create(['padding-left'], {
                easing: 'var(--layout-transition-easing)',
                duration: 'var(--layout-transition-duration)',
              }),
            },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {renderMain()}
    </LayoutSection>
  );
}

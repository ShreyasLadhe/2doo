import { m } from 'framer-motion';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

import { varFade, MotionViewport } from 'src/components/animate';

import { SectionTitle } from './components/section-title';
import { CircleSvg, FloatLine, FloatPlusIcon } from './components/svg-elements';

// ----------------------------------------------------------------------

const renderLines = () => (
  <>
    <FloatPlusIcon sx={{ top: 72, left: 72 }} />
    <FloatPlusIcon sx={{ bottom: 72, left: 72 }} />
    <FloatLine sx={{ top: 80, left: 0 }} />
    <FloatLine sx={{ bottom: 80, left: 0 }} />
    <FloatLine vertical sx={{ top: 0, left: 80 }} />
  </>
);

export function HomeMinimal({ sx, ...other }) {
  const renderDescription = () => (
    <>
      <SectionTitle
        caption="Visualizing Success"
        title="What's in"
        txtGradient="2DOO?"
        sx={{ mb: { xs: 5, md: 8 }, textAlign: { xs: 'center', md: 'left' } }}
      />

      <Stack spacing={6} sx={{ maxWidth: { sm: 560, md: 400 }, mx: { xs: 'auto', md: 'unset' } }}>
        {ITEMS.map((item) => (
          <Box key={item.title} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ width: 40, height: 40, flexShrink: 0 }}>{item.icon}</Box>
            <Stack spacing={0.5}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {item.title}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>{item.description}</Typography>
            </Stack>
          </Box>
        ))}
      </Stack>
    </>
  );

  const renderImage = () => (
    <Stack
      component={m.div}
      variants={varFade('inRight', { distance: 24 })}
      sx={{
        height: 1,
        alignItems: 'center',
        position: 'relative',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={[
          (theme) => ({
            left: -80,
            minWidth: 800,
            borderRadius: 2,
            position: 'absolute',
            bgcolor: 'background.default',
            boxShadow: `-40px 40px 80px 0px ${varAlpha(
              theme.vars.palette.grey['500Channel'],
              0.16
            )}`,
            ...theme.applyStyles('dark', {
              boxShadow: `-40px 40px 80px 0px ${varAlpha(
                theme.vars.palette.common.blackChannel,
                0.16
              )}`,
            }),
          }),
        ]}
      >
        <Box
          component="img"
          alt="Weekly Task Distribution"
          src="/assets/images/home/weekly-task-distribution.jpg"
          sx={{
            width: '100%',
            maxWidth: 850,
            height: 'auto',
            borderRadius: 3,
            objectFit: 'contain',
            boxShadow: 6,
            display: 'block',
            mx: { xs: 'auto', md: 0 },
            ml: { md: -2, lg: -3 },
            position: 'relative',
            p: { xs: 1, md: 2 },
            backgroundColor: 'background.paper',
            boxSizing: 'border-box',
          }}
        />
      </Box>
    </Stack>
  );

  return (
    <Box
      component="section"
      sx={[
        {
          overflow: 'hidden',
          position: 'relative',
          py: { xs: 10, md: 20 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <MotionViewport>
        {renderLines()}

        <Container sx={{ position: 'relative' }}>
          <Grid container columnSpacing={{ xs: 0, md: 8 }} sx={{ position: 'relative', zIndex: 9 }}>
            <Grid size={{ xs: 12, md: 6, lg: 7 }}>{renderDescription()}</Grid>

            <Grid sx={{ display: { xs: 'none', md: 'block' } }} size={{ md: 6, lg: 5 }}>
              {renderImage()}
            </Grid>
          </Grid>

          <CircleSvg variants={varFade('in')} sx={{ display: { xs: 'none', md: 'block' } }} />
        </Container>
      </MotionViewport>
    </Box>
  );
}

// ----------------------------------------------------------------------

const ITEMS = [
  {
    title: 'Effortless Task Management',
    description: 'Add, organize, and prioritize your tasks with a single click. Stay on top of your day with a clean, distraction-free interface.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="5" width="18" height="14" rx="3" fill="#2065D1" fillOpacity="0.12" />
        <rect x="7" y="9" width="10" height="2" rx="1" fill="#2065D1" />
        <rect x="7" y="13" width="6" height="2" rx="1" fill="#2065D1" />
      </svg>
    ),
  },
  {
    title: 'Overdue Reminders',
    description: 'Get instantly notified when a task becomes overdue, so you never miss important deadlines.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#FFAB00" fillOpacity="0.12" />
        <path d="M12 8v4l3 2" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round" />
        <circle cx="18" cy="6" r="2" fill="#FF5630" fillOpacity="0.8" />
      </svg>
    ),
  },
  {
    title: 'Productivity Insights',
    description: 'Track your progress and see your productivity trends with beautiful, built-in analytics.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="12" width="3" height="8" rx="1.5" fill="#FF5630" fillOpacity="0.12" />
        <rect x="10" y="8" width="3" height="12" rx="1.5" fill="#FF5630" fillOpacity="0.24" />
        <rect x="16" y="4" width="3" height="16" rx="1.5" fill="#FF5630" />
      </svg>
    ),
  },
];

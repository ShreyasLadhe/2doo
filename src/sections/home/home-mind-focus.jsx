import { m } from 'framer-motion';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { varFade, MotionViewport } from 'src/components/animate';
import { SectionTitle } from './components/section-title';
import { FloatLine, FloatPlusIcon } from './components/svg-elements';

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

const CARDS = [
  {
    title: 'Clarity',
    description:
      'Clear your mind and organize your thoughts with our intuitive interface. Focus on what matters most.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="12" fill="#1DE9B6" fillOpacity="0.12" />
        <path d="M12 18V17M9 13C9 14.6569 10.3431 16 12 16C13.6569 16 15 14.6569 15 13C15 11.3431 13.6569 10 12 10C10.3431 10 9 11.3431 9 13Z" stroke="#1DE9B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Focus',
    description:
      'Stay on track with smart task prioritization and distraction-free design. Achieve more with less effort.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="12" fill="#FF5630" fillOpacity="0.12" />
        <circle cx="12" cy="12" r="4" stroke="#FF5630" strokeWidth="2" />
        <path d="M12 2V6" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 18V22" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" />
        <path d="M2 12H6" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" />
        <path d="M18 12H22" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Achieve',
    description:
      'Turn your goals into reality with progress tracking and milestone celebrations. Every task completed is a step forward.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="12" fill="#7C4DFF" fillOpacity="0.12" />
        <path d="M16 8V10C16 11.1046 15.1046 12 14 12H10C8.89543 12 8 11.1046 8 10V8" stroke="#7C4DFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 16V12" stroke="#7C4DFF" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="7" r="1" fill="#7C4DFF" />
      </svg>
    ),
  },
];

export function HomeMindFocus({ sx, ...other }) {
  const theme = useTheme();

  const renderDescription = () => (
    <SectionTitle
      caption="Your Journey"
      title="Mind, Focus,"
      txtGradient="Achieve"
      sx={{ mb: { xs: 5, md: 8 }, textAlign: { xs: 'center', md: 'left' } }}
    />
  );

  const renderContent = () => (
    <Grid 
      container 
      spacing={4} 
      justifyContent="center" 
      alignItems="stretch"
      sx={{
        display: { xs: 'block', md: 'flex' },
        flexDirection: { md: 'row' },
      }}
    >
      {CARDS.map((card) => (
        <Grid 
          key={card.title} 
          item 
          xs={12} 
          md={4}
          sx={{
            width: { xs: '100%', md: 'auto' },
            flex: { md: 1 },
            display: 'flex',
          }}
        >
          <Box
            sx={[
              {
                bgcolor: 'background.paper',
                borderRadius: 4,
                boxShadow: theme.customShadows.z8,
                p: { xs: 4, md: 5 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                transition: theme.transitions.create(['box-shadow', 'transform']),
                '&:hover': {
                  boxShadow: theme.customShadows.z24,
                  transform: 'translateY(-8px) scale(1.03)',
                },
              },
            ]}
          >
            <Box sx={{ mb: 3 }}>{card.icon}</Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
              {card.title}
            </Typography>
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', fontSize: 16 }}>
              {card.description}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box
      component="section"
      sx={[
        {
          overflow: 'hidden',
          position: 'relative',
          py: { xs: 10, md: 15 },
          bgcolor: 'background.default',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <MotionViewport>
        {renderLines()}

        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              textAlign: 'center',
              mb: 2,
              fontSize: { xs: 32, md: 48 },
            }}
          >
            Your Productivity Journey
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary',
              textAlign: 'center',
              mb: { xs: 6, md: 8 },
              fontSize: { xs: 16, md: 20 },
              fontWeight: 400,
            }}
          >
            Experience the power of focused productivity with 2DOO's smart features
          </Typography>
          {renderContent()}
        </Container>
      </MotionViewport>
    </Box>
  );
} 
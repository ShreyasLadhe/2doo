import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export function AppWelcome({ title, description, action, sx, ...other }) {
  return (
    <Box
      sx={[
        (theme) => ({
          pt: 3,
          pb: 0,
          px: 3,
          borderRadius: 2,
          display: 'flex',
          height: { md: 1 },
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'common.primary',
          textAlign: 'center',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 800,
        }}
      >
        <Typography
          variant="h2"
          sx={{
            whiteSpace: 'pre-line',
            mb: 2,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {title}
        </Typography>

        <Typography
          variant="h6"
          sx={{
            opacity: 0.8,
            maxWidth: 600,
            mb: 4,
            lineHeight: 1.6,
          }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  );
}

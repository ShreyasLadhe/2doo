export function ComponentsOverrides(theme) {
  return {
    MuiTypography: {
      styleOverrides: {
        root: {
          '&.strikethrough-animation': {
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: '50%',
              width: '0%',
              height: '2px',
              backgroundColor: theme.palette.success.main,
              transition: 'width 0.5s ease-in-out',
            },
            '&.animate': {
              '&::after': {
                width: '100%',
              },
            },
          },
        },
      },
    },
  };
} 
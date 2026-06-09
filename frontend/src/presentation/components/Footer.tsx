import { Box, Typography } from '@mui/material';

function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 1,
        px: 2,
        mt: 'auto',
        backgroundColor: 'primary.dark',
        color: 'primary.contrastText',
        textAlign: 'center',
      }}
    >
      <Typography variant="caption">
        Spreadsheet-like DB Editor
      </Typography>
    </Box>
  );
}

export default Footer;

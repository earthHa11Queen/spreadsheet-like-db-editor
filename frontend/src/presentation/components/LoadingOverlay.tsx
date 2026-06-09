import { Backdrop, CircularProgress, Typography } from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
}

function LoadingOverlay({ open, message }: LoadingOverlayProps) {
  return (
    <Backdrop open={open} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1, flexDirection: 'column', gap: 2 }}>
      <CircularProgress color="inherit" />
      {message && <Typography variant="body2">{message}</Typography>}
    </Backdrop>
  );
}

export default LoadingOverlay;

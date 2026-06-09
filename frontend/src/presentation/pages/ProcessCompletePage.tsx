import { Box, Button, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

function ProcessCompletePage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 2,
      }}
    >
      <CheckCircleOutlineIcon sx={{ fontSize: 72, color: 'success.main' }} />
      <Typography variant="h5">処理が完了しました</Typography>
      <Typography variant="body2" color="text.secondary">
        このタブは閉じていただいて構いません。
      </Typography>
      <Button variant="outlined" onClick={() => window.close()}>
        タブを閉じる
      </Button>
    </Box>
  );
}

export default ProcessCompletePage;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  Snackbar,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StorageIcon from '@mui/icons-material/Storage';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useConnectionStore } from '../store/connectionStore';
import { connectionApi } from '../../adapter/api/connectionApi';
import LoadingOverlay from '../components/LoadingOverlay';

function TopPage() {
  const navigate = useNavigate();
  const { connections, loading, error, fetchConnections, setSelectedConnectionId } =
    useConnectionStore();

  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleConnect = async (conn: typeof connections[0]) => {
    setConnectingId(conn.n);
    try {
      const result = await connectionApi.testConnection({
        connectionId: conn.n,
        dbHost: conn.dbHost,
        dbPort: conn.dbPort,
        databaseName: conn.databaseName,
        dbUsername: conn.dbUsername,
      });

      if (result.success) {
        setSelectedConnectionId(conn.n);
        setSnackbar({ open: true, message: '接続に成功しました', severity: 'success' });
        setTimeout(() => {
          navigate(`/tables/_select?connectionId=${conn.n}`);
        }, 500);
      } else {
        setSnackbar({ open: true, message: result.message, severity: 'error' });
      }
    } catch {
      setSnackbar({ open: true, message: '接続テストに失敗しました', severity: 'error' });
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <StorageIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          DB Spreadsheet Editor
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          接続先データベースを選択してください
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/connections/settings')}
        >
          新規接続設定
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && connections.length === 0 && !error && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography color="text.secondary">
            保存済みの接続設定がありません。新規接続設定から追加してください。
          </Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        {connections.map((conn) => (
          <Grid item xs={12} sm={6} key={conn.n}>
            <Card
              variant="outlined"
              sx={{
                '&:hover': { borderColor: 'primary.main', boxShadow: 2 },
                transition: 'all 0.2s',
              }}
            >
              <CardContent>
                <Typography variant="h6" component="div" noWrap>
                  {conn.dbName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {conn.dbHost}:{conn.dbPort} / {conn.databaseName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ユーザ: {conn.dbUsername}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={
                    connectingId === conn.n ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <PlayArrowIcon />
                    )
                  }
                  disabled={connectingId !== null}
                  onClick={() => handleConnect(conn)}
                >
                  接続
                </Button>
                <Button
                  size="small"
                  onClick={() => navigate(`/connections/settings?edit=${conn.n}`)}
                >
                  編集
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <LoadingOverlay open={connectingId !== null} message="接続中..." />
    </Container>
  );
}

export default TopPage;

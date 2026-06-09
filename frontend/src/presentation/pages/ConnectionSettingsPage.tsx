import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { ConnectionSettingRequest } from '../../domain/connectionTypes';
import { connectionApi } from '../../adapter/api/connectionApi';
import { useConnectionStore } from '../store/connectionStore';

const emptyForm: ConnectionSettingRequest = {
  dbName: '',
  dbHost: '',
  dbPort: 5432,
  databaseName: '',
  dbUsername: '',
  dbPassword: '',
};

interface FormErrors {
  dbName?: string;
  dbHost?: string;
  dbPort?: string;
  databaseName?: string;
  dbUsername?: string;
  dbPassword?: string;
}

function ConnectionSettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const { connections, fetchConnections } = useConnectionStore();

  const [form, setForm] = useState<ConnectionSettingRequest>({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    if (editId) {
      const id = Number(editId);
      const conn = connections.find((c) => c.n === id);
      if (conn) {
        setEditingId(id);
        setForm({
          dbName: conn.dbName,
          dbHost: conn.dbHost,
          dbPort: conn.dbPort,
          databaseName: conn.databaseName,
          dbUsername: conn.dbUsername,
          dbPassword: '',
        });
      }
    }
  }, [editId, connections]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.dbName.trim()) newErrors.dbName = '接続名は必須です';
    if (!form.dbHost.trim()) newErrors.dbHost = 'ホストは必須です';
    if (!form.dbPort || form.dbPort < 1 || form.dbPort > 65535)
      newErrors.dbPort = 'ポートは1〜65535の範囲で入力してください';
    if (!form.databaseName.trim()) newErrors.databaseName = 'データベース名は必須です';
    if (!form.dbUsername.trim()) newErrors.dbUsername = 'ユーザ名は必須です';
    if (!editingId && !form.dbPassword.trim())
      newErrors.dbPassword = 'パスワードは必須です';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof ConnectionSettingRequest, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleTest = async () => {
    if (!validate()) return;
    setTesting(true);
    try {
      const result = await connectionApi.testConnection(form);
      setSnackbar({
        open: true,
        message: result.message,
        severity: result.success ? 'success' : 'error',
      });
    } catch {
      setSnackbar({ open: true, message: '接続テストに失敗しました', severity: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        await connectionApi.update(editingId, form);
        setSnackbar({ open: true, message: '接続設定を更新しました', severity: 'success' });
      } else {
        await connectionApi.create(form);
        setSnackbar({ open: true, message: '接続設定を保存しました', severity: 'success' });
      }
      await fetchConnections();
      resetForm();
    } catch {
      setSnackbar({ open: true, message: '保存に失敗しました', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await connectionApi.delete(id);
      setSnackbar({ open: true, message: '接続設定を削除しました', severity: 'success' });
      await fetchConnections();
      if (editingId === id) resetForm();
    } catch {
      setSnackbar({ open: true, message: '削除に失敗しました', severity: 'error' });
    }
  };

  const handleEditSelect = (id: number) => {
    const conn = connections.find((c) => c.n === id);
    if (!conn) return;
    setEditingId(id);
    setForm({
      dbName: conn.dbName,
      dbHost: conn.dbHost,
      dbPort: conn.dbPort,
      databaseName: conn.databaseName,
      dbUsername: conn.dbUsername,
      dbPassword: '',
    });
    setErrors({});
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setErrors({});
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 3, mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          トップに戻る
        </Button>
      </Box>

      <Typography variant="h5" component="h1" gutterBottom>
        データベース接続設定
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* 左: 保存済み一覧 */}
        <Card variant="outlined" sx={{ minWidth: 240, flexShrink: 0 }}>
          <CardContent sx={{ pb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              保存済み接続設定
            </Typography>
          </CardContent>
          <List dense disablePadding>
            {connections.length === 0 && (
              <ListItem>
                <ListItemText
                  secondary="設定がありません"
                  sx={{ textAlign: 'center' }}
                />
              </ListItem>
            )}
            {connections.map((conn) => (
              <ListItem
                key={conn.n}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleDelete(conn.n)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton
                  selected={editingId === conn.n}
                  onClick={() => handleEditSelect(conn.n)}
                >
                  <ListItemText
                    primary={conn.dbName}
                    secondary={`${conn.dbHost}:${conn.dbPort}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
          <Box sx={{ p: 1 }}>
            <Button size="small" fullWidth onClick={resetForm}>
              新規作成
            </Button>
          </Box>
        </Card>

        {/* 右: フォーム */}
        <Box sx={{ flex: 1 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                {editingId ? `編集: ${form.dbName || '(未入力)'}` : '新規接続設定'}
              </Typography>

              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  label="接続名"
                  value={form.dbName}
                  onChange={(e) => handleChange('dbName', e.target.value)}
                  error={!!errors.dbName}
                  helperText={errors.dbName}
                  size="small"
                  fullWidth
                  required
                />
                <TextField
                  label="ホスト"
                  value={form.dbHost}
                  onChange={(e) => handleChange('dbHost', e.target.value)}
                  error={!!errors.dbHost}
                  helperText={errors.dbHost}
                  size="small"
                  fullWidth
                  required
                />
                <TextField
                  label="ポート"
                  type="number"
                  value={form.dbPort}
                  onChange={(e) => handleChange('dbPort', Number(e.target.value))}
                  error={!!errors.dbPort}
                  helperText={errors.dbPort}
                  size="small"
                  fullWidth
                  required
                  inputProps={{ min: 1, max: 65535 }}
                />
                <TextField
                  label="データベース名"
                  value={form.databaseName}
                  onChange={(e) => handleChange('databaseName', e.target.value)}
                  error={!!errors.databaseName}
                  helperText={errors.databaseName}
                  size="small"
                  fullWidth
                  required
                />
                <TextField
                  label="ユーザ名"
                  value={form.dbUsername}
                  onChange={(e) => handleChange('dbUsername', e.target.value)}
                  error={!!errors.dbUsername}
                  helperText={errors.dbUsername}
                  size="small"
                  fullWidth
                  required
                />
                <TextField
                  label="パスワード"
                  type="password"
                  value={form.dbPassword}
                  onChange={(e) => handleChange('dbPassword', e.target.value)}
                  error={!!errors.dbPassword}
                  helperText={
                    errors.dbPassword ||
                    (editingId ? '変更しない場合は空欄のままにしてください' : '')
                  }
                  size="small"
                  fullWidth
                  required={!editingId}
                />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing ? 'テスト中...' : '接続テスト'}
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? '保存中...' : editingId ? '更新' : '保存'}
                </Button>
                <Button variant="text" onClick={resetForm}>
                  キャンセル
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>

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
    </Container>
  );
}

export default ConnectionSettingsPage;

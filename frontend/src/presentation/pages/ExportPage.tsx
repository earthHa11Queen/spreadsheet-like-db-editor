import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useSearchParams } from 'react-router-dom';
import { exportApi, type ExportFormat } from '../../adapter/api/exportApi';
import { useHeaderStore } from '../store/headerStore';
import LoadingOverlay from '../components/LoadingOverlay';

const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: 'CSV (.csv)',
  excel: 'Excel (.xlsx)',
  markdown: 'Markdown (.md)',
};

function ExportPage() {
  const [searchParams] = useSearchParams();
  const connectionId = searchParams.get('connectionId')
    ? Number(searchParams.get('connectionId'))
    : null;

  const { tables, fetchTables } = useHeaderStore();

  useEffect(() => {
    if (connectionId) fetchTables(connectionId);
  }, [connectionId, fetchTables]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const toggleTable = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === tables.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tables.map((t) => t.tableName)));
    }
  };

  const handleDownload = async () => {
    if (!connectionId || selected.size === 0) return;
    setDownloading(true);
    const targets = tables.filter((t) => selected.has(t.tableName));
    let errorCount = 0;
    for (const t of targets) {
      try {
        await exportApi.exportTable(connectionId, t.tableName, format, t.schemaName);
      } catch {
        errorCount++;
      }
    }
    setDownloading(false);
    if (errorCount > 0) {
      setToast({ msg: `${errorCount}件のダウンロードに失敗しました。`, severity: 'error' });
    } else {
      setDone(true);
      window.location.href = '/export/done';
    }
  };

  if (done) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main' }} />
        <Typography variant="h6" sx={{ mt: 1 }}>ダウンロード完了</Typography>
      </Box>
    );
  }

  const allChecked = tables.length > 0 && selected.size === tables.length;
  const indeterminate = selected.size > 0 && selected.size < tables.length;

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', mt: 4, px: 2, pb: 6 }}>
      <Typography variant="h5" gutterBottom>
        テーブルエクスポート
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        エクスポートするテーブルと形式を選択してダウンロードしてください。
      </Typography>

      {/* 形式選択 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>エクスポート形式</Typography>
        <RadioGroup
          row
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
        >
          {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((f) => (
            <FormControlLabel key={f} value={f} control={<Radio size="small" />} label={FORMAT_LABELS[f]} />
          ))}
        </RadioGroup>
      </Paper>

      {/* テーブル選択 */}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={allChecked}
                  indeterminate={indeterminate}
                  onChange={toggleAll}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>テーブル名</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>スキーマ</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>状態</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  テーブルがありません
                </TableCell>
              </TableRow>
            ) : (
              tables.map((t) => (
                <TableRow
                  key={`${t.schemaName}.${t.tableName}`}
                  hover
                  onClick={() => toggleTable(t.tableName)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selected.has(t.tableName)}
                      onChange={() => toggleTable(t.tableName)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{t.tableName}</TableCell>
                  <TableCell>{t.schemaName}</TableCell>
                  <TableCell>
                    {selected.has(t.tableName) ? (
                      <Chip label="選択中" size="small" color="primary" />
                    ) : (
                      <Chip label="未選択" size="small" color="default" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* 実行ボタン */}
      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="contained"
          disabled={downloading || selected.size === 0 || !connectionId}
          onClick={handleDownload}
          startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
        >
          {selected.size > 0
            ? `${selected.size}テーブルをダウンロード`
            : 'テーブルを選択してください'}
        </Button>
        {!connectionId && (
          <Alert severity="warning" sx={{ py: 0 }}>
            接続IDが取得できません。テーブル編集画面から開き直してください。
          </Alert>
        )}
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.severity} variant="filled" onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>

      <LoadingOverlay open={downloading} message="ダウンロード中..." />
    </Box>
  );
}

export default ExportPage;

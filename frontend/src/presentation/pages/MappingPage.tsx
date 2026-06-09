import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { importApi, type AutoMappingResult } from '../../adapter/api/importApi';
import LoadingOverlay from '../components/LoadingOverlay';

const SESSION_KEY = 'importMappingData';

interface MappingSession extends AutoMappingResult {
  connectionId: number;
  tableName: string;
}

function MappingPage() {
  const [session, setSession] = useState<MappingSession | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const data: MappingSession = JSON.parse(raw);
    setSession(data);
    setMapping({ ...data.mapping });
  }, []);

  const handleMappingChange = (csvHeader: string, tableCol: string | null) => {
    setMapping((prev) => ({ ...prev, [csvHeader]: tableCol }));
  };

  const mappedCount = Object.values(mapping).filter((v) => v !== null).length;

  const handleApply = async () => {
    if (!session) return;
    setApplying(true);
    try {
      await importApi.applyMapping(
        session.connectionId,
        session.tableName,
        mapping,
        session.rows,
      );
      sessionStorage.removeItem(SESSION_KEY);
      setDone(true);
      window.location.href = '/import/done';
    } catch {
      setToast({ msg: 'インポートに失敗しました。', severity: 'error' });
    } finally {
      setApplying(false);
    }
  };

  if (!session) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          マッピングデータがありません。インポート画面からやり直してください。
        </Typography>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => window.history.back()}>
          戻る
        </Button>
      </Box>
    );
  }

  if (done) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main' }} />
        <Typography variant="h6" sx={{ mt: 1 }}>インポート完了</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4, px: 2, pb: 6 }}>
      <Typography variant="h5" gutterBottom>
        カラムマッピング
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        インポート先テーブル: <strong>{session.tableName}</strong>　
        CSVカラム数: {session.csvHeaders.length}　
        データ行数: {session.rows.length}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        各CSVカラムに対応するテーブルカラムを選択してください。「除外」を選ぶとそのカラムはインポートされません。
      </Typography>

      {/* マッピングテーブル */}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>CSVカラム</TableCell>
              <TableCell sx={{ width: 40 }} />
              <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>テーブルカラム</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>状態</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {session.csvHeaders.map((csvHeader) => {
              const selected = mapping[csvHeader] ?? null;
              const isExcluded = selected === null;
              return (
                <TableRow key={csvHeader} sx={{ opacity: isExcluded ? 0.45 : 1 }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {csvHeader}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center', color: 'text.disabled' }}>
                    {isExcluded ? <BlockIcon fontSize="small" /> : <ArrowForwardIcon fontSize="small" color="primary" />}
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={selected ?? '__exclude__'}
                        onChange={(e) =>
                          handleMappingChange(
                            csvHeader,
                            e.target.value === '__exclude__' ? null : e.target.value,
                          )
                        }
                      >
                        <MenuItem value="__exclude__">
                          <em>除外（インポートしない）</em>
                        </MenuItem>
                        <Divider />
                        {session.tableColumns.map((col) => (
                          <MenuItem key={col} value={col}>
                            {col}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    {isExcluded ? (
                      <Chip label="除外" size="small" color="default" />
                    ) : (
                      <Chip label="マッピング済" size="small" color="success" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* プレビュー（先頭3行） */}
      {session.rows.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            データプレビュー（先頭3行）
          </Typography>
          <Paper variant="outlined" sx={{ overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  {session.csvHeaders
                    .filter((h) => mapping[h] !== null)
                    .map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 'bold', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {mapping[h]}
                        <Typography variant="caption" display="block" color="text.secondary">
                          ← {h}
                        </Typography>
                      </TableCell>
                    ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {session.rows.slice(0, 3).map((row, i) => (
                  <TableRow key={i}>
                    {session.csvHeaders
                      .filter((h) => mapping[h] !== null)
                      .map((h) => (
                        <TableCell key={h} sx={{ fontSize: '0.75rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row[h] ?? ''}
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* 実行ボタン */}
      <Stack direction="row" spacing={2} sx={{ mt: 3 }} alignItems="center">
        <Button variant="outlined" onClick={() => window.history.back()}>
          戻る
        </Button>
        <Button
          variant="contained"
          disabled={applying || mappedCount === 0}
          onClick={handleApply}
          startIcon={applying ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {mappedCount}カラムをインポート実行
        </Button>
        {mappedCount === 0 && (
          <Alert severity="warning" sx={{ py: 0 }}>
            1つ以上のカラムをマッピングしてください
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

      <LoadingOverlay open={applying} message="インポート中..." />
    </Box>
  );
}

export default MappingPage;

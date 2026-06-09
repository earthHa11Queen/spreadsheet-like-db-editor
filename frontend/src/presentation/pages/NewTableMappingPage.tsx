import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { importApi } from '../../adapter/api/importApi';
import LoadingOverlay from '../components/LoadingOverlay';

const SESSION_KEY = 'newTableImportData';

const COLUMN_TYPES = ['TEXT', 'INTEGER', 'NUMERIC', 'BOOLEAN', 'TIMESTAMP'] as const;
type ColumnType = typeof COLUMN_TYPES[number];

interface NewTableSession {
  connectionId: number;
  tableName: string;
  csvHeaders: string[];
  rows: Record<string, string>[];
}

interface ColumnDef {
  /** ファイル由来のヘッダー名。手動追加行は null */
  srcHeader: string | null;
  /** CREATE TABLE に使うカラム名（編集可） */
  colName: string;
  colType: ColumnType;
  /** false = 除外（CREATE TABLE / INSERT から外す） */
  included: boolean;
  /** 手動追加行かどうか（削除ボタン表示用） */
  isManual: boolean;
}

function NewTableMappingPage() {
  const [session, setSession] = useState<NewTableSession | null>(null);
  const [tableName, setTableName] = useState('');
  const [cols, setCols] = useState<ColumnDef[]>([]);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const data: NewTableSession = JSON.parse(raw);
    setSession(data);
    setTableName(data.tableName);
    setCols(
      data.csvHeaders.map((h) => ({
        srcHeader: h,
        colName: h,
        colType: 'TEXT',
        included: true,
        isManual: false,
      })),
    );
  }, []);

  const updateCol = (idx: number, patch: Partial<ColumnDef>) => {
    setCols((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const addManualCol = () => {
    setCols((prev) => [
      ...prev,
      { srcHeader: null, colName: '', colType: 'TEXT', included: true, isManual: true },
    ]);
  };

  const removeManualCol = (idx: number) => {
    setCols((prev) => prev.filter((_, i) => i !== idx));
  };

  const includedCols = cols.filter((c) => c.included);

  const handleApply = async () => {
    if (!session) return;
    const trimmedTableName = tableName.trim();
    if (!trimmedTableName) {
      setToast({ msg: 'テーブル名を入力してください。', severity: 'error' });
      return;
    }
    if (includedCols.length === 0) {
      setToast({ msg: '1つ以上のカラムを含めてください。', severity: 'error' });
      return;
    }
    const emptyName = includedCols.find((c) => !c.colName.trim());
    if (emptyName) {
      setToast({ msg: 'カラム名が空のものがあります。', severity: 'error' });
      return;
    }

    // INSERT 用データ: 除外列は含めない、手動追加列は null
    const remappedRows = session.rows.map((row) => {
      const newRow: Record<string, string> = {};
      for (const col of includedCols) {
        const val = col.srcHeader !== null ? (row[col.srcHeader] ?? '') : '';
        newRow[col.colName.trim()] = val;
      }
      return newRow;
    });

    setApplying(true);
    try {
      await importApi.createTableAndImport(
        session.connectionId,
        trimmedTableName,
        includedCols.map((c) => c.colName.trim()),
        includedCols.map((c) => c.colType),
        remappedRows,
      );
      sessionStorage.removeItem(SESSION_KEY);
      setDone(true);
      window.location.href = '/import/done';
    } catch {
      setToast({
        msg: 'テーブルの作成に失敗しました。同名テーブルが既に存在する可能性があります。',
        severity: 'error',
      });
    } finally {
      setApplying(false);
    }
  };

  if (!session) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          データがありません。インポート画面からやり直してください。
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
        <Typography variant="h6" sx={{ mt: 1 }}>
          テーブル作成・インポート完了
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', mt: 4, px: 2, pb: 6 }}>
      <Typography variant="h5" gutterBottom>
        新規テーブル作成
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        カラム名・型を確認・編集してテーブルを作成します。データ行数: {session.rows.length}
      </Typography>

      {/* テーブル名 */}
      <TextField
        size="small"
        label="テーブル名"
        value={tableName}
        onChange={(e) => setTableName(e.target.value)}
        sx={{ mb: 3, minWidth: 300 }}
        helperText="英数字・アンダースコアを推奨"
      />

      {/* カラム定義テーブル */}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ width: 48, fontWeight: 'bold' }}>採用</TableCell>
              <TableCell sx={{ width: '28%', fontWeight: 'bold' }}>元ヘッダー</TableCell>
              <TableCell sx={{ width: '28%', fontWeight: 'bold' }}>カラム名</TableCell>
              <TableCell sx={{ width: '18%', fontWeight: 'bold' }}>型</TableCell>
              <TableCell sx={{ width: '18%', fontWeight: 'bold' }}>1行目プレビュー</TableCell>
              <TableCell sx={{ width: 48 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {cols.map((col, idx) => (
              <TableRow key={idx} sx={{ opacity: col.included ? 1 : 0.4 }}>
                {/* 採用チェック */}
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={col.included}
                    onChange={(e) => updateCol(idx, { included: e.target.checked })}
                  />
                </TableCell>

                {/* 元ヘッダー */}
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                  >
                    {col.srcHeader ?? <em>（手動追加）</em>}
                  </Typography>
                </TableCell>

                {/* カラム名 */}
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    value={col.colName}
                    disabled={!col.included}
                    onChange={(e) => updateCol(idx, { colName: e.target.value })}
                    inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                  />
                </TableCell>

                {/* 型 */}
                <TableCell>
                  <FormControl size="small" fullWidth disabled={!col.included}>
                    <Select
                      value={col.colType}
                      onChange={(e) => updateCol(idx, { colType: e.target.value as ColumnType })}
                    >
                      {COLUMN_TYPES.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>

                {/* プレビュー */}
                <TableCell>
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                    noWrap
                  >
                    {col.srcHeader !== null ? (session.rows[0]?.[col.srcHeader] ?? '') : ''}
                  </Typography>
                </TableCell>

                {/* 手動追加行の削除ボタン */}
                <TableCell padding="none">
                  {col.isManual && (
                    <Tooltip title="この行を削除">
                      <IconButton size="small" onClick={() => removeManualCol(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* カラム追加ボタン + 型の凡例 */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1.5 }} flexWrap="wrap">
        <Button size="small" startIcon={<AddIcon />} onClick={addManualCol}>
          カラムを追加
        </Button>
        <Typography variant="caption" color="text.secondary">
          型の目安:
        </Typography>
        {COLUMN_TYPES.map((t) => (
          <Chip key={t} label={t} size="small" variant="outlined" />
        ))}
      </Stack>

      {/* サマリ */}
      <Alert severity="info" sx={{ mt: 2 }}>
        採用カラム: {includedCols.length} 件 / 全 {cols.length} 件　データ行数: {session.rows.length} 行
      </Alert>

      {/* 実行ボタン */}
      <Stack direction="row" spacing={2} sx={{ mt: 3 }} alignItems="center">
        <Button variant="outlined" onClick={() => window.history.back()}>
          戻る
        </Button>
        <Button
          variant="contained"
          disabled={applying || !tableName.trim() || includedCols.length === 0}
          onClick={handleApply}
          startIcon={applying ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          テーブルを作成してインポート実行
        </Button>
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.severity} variant="filled" onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>

      <LoadingOverlay open={applying} message="テーブル作成中..." />
    </Box>
  );
}

export default NewTableMappingPage;

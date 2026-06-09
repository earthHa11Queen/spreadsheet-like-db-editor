import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useSearchParams } from 'react-router-dom';
import { detectFileKind, importApi, type FileKind } from '../../adapter/api/importApi';
import { useHeaderStore } from '../store/headerStore';
import LoadingOverlay from '../components/LoadingOverlay';

const ACCEPT = '.csv,.xlsx,.xls,.sql,.txt,.md';

const KIND_LABEL: Record<FileKind, string> = {
  csv: 'CSV（インポート）',
  excel: 'Spreadsheet（インポート）',
  sql: 'SQL（保存）',
  text: 'テキスト/メモ（保存）',
  unknown: '不明',
};

const KIND_COLOR: Record<FileKind, 'success' | 'info' | 'warning' | 'error'> = {
  csv: 'success',
  excel: 'success',
  sql: 'info',
  text: 'info',
  unknown: 'error',
};

function ImportPage() {
  const [searchParams] = useSearchParams();
  const connectionId = searchParams.get('connectionId')
    ? Number(searchParams.get('connectionId'))
    : null;

  const { tables, fetchTables } = useHeaderStore();

  useState(() => {
    if (connectionId) fetchTables(connectionId);
  });

  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileKind, setFileKind] = useState<FileKind | null>(null);
  // 'existing' | 'new'
  const [importMode, setImportMode] = useState<'existing' | 'new'>('existing');
  const [targetTable, setTargetTable] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number | ''>('');

  const inputRef = useRef<HTMLInputElement>(null);

  const applyFile = async (f: File) => {
    setFile(f);
    const kind = detectFileKind(f);
    setFileKind(kind);
    setDone(false);
    setExcelSheets([]);
    setSelectedSheetIndex('');
    if (kind === 'excel') {
      try {
        const sheets = await importApi.getExcelSheets(f);
        setExcelSheets(sheets);
        if (sheets.length === 1) setSelectedSheetIndex(0);
      } catch {
        setToast({ msg: 'Spreadsheetシート一覧の取得に失敗しました。', severity: 'error' });
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) applyFile(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
  };

  const handleUpload = async () => {
    if (!file || !fileKind || fileKind === 'unknown') return;
    if (!connectionId) {
      setToast({ msg: '接続IDが取得できません。テーブル編集画面から開き直してください。', severity: 'error' });
      return;
    }

    setUploading(true);
    try {
      if (fileKind === 'csv') {
        const tableName = importMode === 'new' ? newTableName.trim() : targetTable;
        if (!tableName) {
          setToast({ msg: importMode === 'new' ? '新規テーブル名を入力してください。' : 'インポート先テーブルを選択してください。', severity: 'error' });
          setUploading(false);
          return;
        }
        if (importMode === 'new') {
          // 新規テーブルモード: CSVヘッダーのみ解析してカラム型設定画面へ
          const result = await importApi.csvAutoMapping(connectionId, '__new__', file);
          sessionStorage.setItem('newTableImportData', JSON.stringify({
            connectionId,
            tableName,
            csvHeaders: result.csvHeaders,
            rows: result.rows,
          }));
          window.location.href = '/import/new-table';
          return;
        }
        const result = await importApi.csvAutoMapping(connectionId, tableName, file);
        sessionStorage.setItem('importMappingData', JSON.stringify({
          connectionId,
          tableName,
          ...result,
        }));
        window.location.href = '/import/mapping';
        return;
      }
      if (fileKind === 'excel') {
        const tableName = importMode === 'new' ? newTableName.trim() : targetTable;
        if (!tableName) {
          setToast({ msg: importMode === 'new' ? '新規テーブル名を入力してください。' : 'インポート先テーブルを選択してください。', severity: 'error' });
          setUploading(false);
          return;
        }
        if (selectedSheetIndex === '') {
          setToast({ msg: 'シートを選択してください。', severity: 'error' });
          setUploading(false);
          return;
        }
        if (importMode === 'new') {
          const result = await importApi.excelAutoMapping(connectionId, '__new__', file, selectedSheetIndex);
          sessionStorage.setItem('newTableImportData', JSON.stringify({
            connectionId,
            tableName,
            csvHeaders: result.csvHeaders,
            rows: result.rows,
          }));
          window.location.href = '/import/new-table';
          return;
        }
        const result = await importApi.excelAutoMapping(connectionId, tableName, file, selectedSheetIndex);
        sessionStorage.setItem('importMappingData', JSON.stringify({
          connectionId,
          tableName,
          ...result,
        }));
        window.location.href = '/import/mapping';
        return;
      }
      if (fileKind === 'sql') {
        await importApi.uploadSql(connectionId, file);
        setToast({ msg: 'SQLファイルを保存しました。', severity: 'success' });
      }
      if (fileKind === 'text') {
        if (!targetTable) {
          setToast({ msg: 'メモの紐付け先テーブルを選択してください。', severity: 'error' });
          setUploading(false);
          return;
        }
        await importApi.uploadMemo(connectionId, targetTable, file);
        setToast({ msg: 'メモファイルを保存しました。', severity: 'success' });
      }
      setDone(true);
    } catch {
      setToast({ msg: 'アップロードに失敗しました。', severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const isImportFile = fileKind === 'csv' || fileKind === 'excel';
  const needsExistingTable = (fileKind === 'text') || (isImportFile && importMode === 'existing');
  const needsNewTableName = isImportFile && importMode === 'new';

  const uploadDisabled =
    uploading ||
    fileKind === 'unknown' ||
    (needsExistingTable && !targetTable) ||
    (needsNewTableName && !newTableName.trim()) ||
    (fileKind === 'excel' && selectedSheetIndex === '');

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', mt: 6, px: 2 }}>
      <Typography variant="h5" gutterBottom>
        ファイルアップロード
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        CSV / Excel / SQL / テキストファイルをアップロードします。
      </Typography>

      {/* ドロップゾーン */}
      <Paper
        variant="outlined"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        sx={{
          border: '2px dashed',
          borderColor: dragging ? 'primary.main' : 'divider',
          bgcolor: dragging ? 'action.hover' : 'background.paper',
          borderRadius: 2,
          p: 5,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.2s, background-color 0.2s',
          '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <UploadFileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          ここにファイルをドラッグ＆ドロップ
        </Typography>
        <Typography variant="caption" color="text.disabled">
          または クリックしてファイルを選択
        </Typography>
        <Typography variant="caption" display="block" color="text.disabled" sx={{ mt: 0.5 }}>
          対応形式: CSV, Spreadsheet (.xlsx/.xls), SQL, テキスト (.txt/.md)
        </Typography>
      </Paper>

      {/* 選択ファイル情報 */}
      {file && fileKind && (
        <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
          <Stack spacing={1.5}>
            <Alert severity={KIND_COLOR[fileKind]} sx={{ py: 0 }}>
              <strong>{file.name}</strong>　{KIND_LABEL[fileKind]}
            </Alert>

            {/* CSV/Excel: 既存 or 新規テーブル選択 */}
            {isImportFile && (
              <RadioGroup
                row
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as 'existing' | 'new')}
              >
                <FormControlLabel value="existing" control={<Radio size="small" />} label="既存テーブルにインポート" />
                <FormControlLabel value="new" control={<Radio size="small" />} label="新規テーブルとして作成" />
              </RadioGroup>
            )}

            {/* 既存テーブル選択（CSV/Excel既存モード or テキスト） */}
            {needsExistingTable && (
              <FormControl size="small" fullWidth>
                <Select
                  value={targetTable}
                  onChange={(e) => setTargetTable(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    {fileKind === 'text' ? 'メモの紐付け先テーブルを選択' : 'インポート先テーブルを選択'}
                  </MenuItem>
                  {tables.map((t) => (
                    <MenuItem key={`${t.schemaName}.${t.tableName}`} value={t.tableName}>
                      {t.schemaName !== 'public' ? `${t.schemaName}.` : ''}
                      {t.tableName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* 新規テーブル名入力 */}
            {needsNewTableName && (
              <TextField
                size="small"
                fullWidth
                label="新規テーブル名"
                placeholder="例: imported_data"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                helperText="英数字・アンダースコアを推奨。カラム型は次の画面で設定できます。"
              />
            )}

            {/* Excel: シート選択 */}
            {fileKind === 'excel' && excelSheets.length > 0 && (
              <FormControl size="small" fullWidth>
                <Select
                  value={selectedSheetIndex}
                  onChange={(e) => setSelectedSheetIndex(e.target.value as number)}
                  displayEmpty
                >
                  <MenuItem value="" disabled>シートを選択</MenuItem>
                  {excelSheets.map((name, idx) => (
                    <MenuItem key={idx} value={idx}>{name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {fileKind === 'unknown' && (
              <Alert severity="error">
                対応していないファイル形式です。CSV / Excel / SQL / テキストを選択してください。
              </Alert>
            )}

            {done ? (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'success.main' }}>
                <CheckCircleOutlineIcon />
                <Typography variant="body2">アップロード完了</Typography>
              </Stack>
            ) : (
              <Button
                variant="contained"
                disabled={uploadDisabled}
                onClick={handleUpload}
                startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
              >
                {isImportFile ? 'アップロードしてマッピングへ' : 'アップロード'}
              </Button>
            )}
          </Stack>
        </Paper>
      )}

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

      <LoadingOverlay open={uploading} message="アップロード中..." />
    </Box>
  );
}

export default ImportPage;

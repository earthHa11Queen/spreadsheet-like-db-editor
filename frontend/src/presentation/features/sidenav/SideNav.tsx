import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSideNavStore } from '../../store/sideNavStore';

interface SideNavProps {
  connectionId: number;
  tableName: string;
}

const DRAWER_WIDTH = 420;

function TitleInputDialog({
  open, title, label, value, onChange, onConfirm, onClose,
}: {
  open: boolean; title: string; label: string;
  value: string; onChange: (v: string) => void;
  onConfirm: () => void; onClose: () => void;
}) {
  if (!open) return null;
  return (
    <Box
      sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 1, p: 3, width: 360 }} onClick={(e) => e.stopPropagation()}>
        <Typography variant="subtitle1" gutterBottom>{title}</Typography>
        <TextField
          autoFocus fullWidth size="small" value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onConfirm(); if (e.key === 'Escape') onClose(); }}
          placeholder={label} sx={{ mb: 2 }}
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" onClick={onClose}>キャンセル</Button>
          <Button size="small" variant="contained" disabled={!value.trim()} onClick={onConfirm}>保存</Button>
        </Stack>
      </Box>
    </Box>
  );
}

function SideNav({ connectionId, tableName }: SideNavProps) {
  const {
    open, tab, memoContent, memoSaving,
    sqlContent, sqlList, sqlExecuting, sqlResult,
    memoTemplates, sqlTemplates,
    toastMessage, toastSeverity,
    setOpen, setTab, setMemoContent, setSqlContent,
    loadMemo, saveMemo, loadSqlList, loadSqlById,
    saveSql, executeSql, downloadMemo,
    loadMemoTemplates, saveMemoTemplate, deleteMemoTemplate,
    loadSqlTemplates, saveSqlTemplate, deleteSqlTemplate,
    applyMemoTemplate, applySqlTemplate,
    clearToast,
  } = useSideNavStore();

  const memoInputRef = useRef<HTMLTextAreaElement>(null);
  const sqlInputRef = useRef<HTMLTextAreaElement>(null);

  const [sqlTitleDialog, setSqlTitleDialog] = useState(false);
  const [sqlTitle, setSqlTitle] = useState('');
  const [memoTplDialog, setMemoTplDialog] = useState(false);
  const [memoTplTitle, setMemoTplTitle] = useState('');
  const [sqlTplDialog, setSqlTplDialog] = useState(false);
  const [sqlTplTitle, setSqlTplTitle] = useState('');

  useEffect(() => {
    if (!open) return;
    if (tab === 'memo') {
      loadMemo(connectionId, tableName);
      loadMemoTemplates();
      setTimeout(() => memoInputRef.current?.focus(), 300);
    }
    if (tab === 'sql') {
      loadSqlList(connectionId);
      loadSqlTemplates();
      setTimeout(() => sqlInputRef.current?.focus(), 300);
    }
  }, [open, tab, connectionId, tableName, loadMemo, loadSqlList, loadMemoTemplates, loadSqlTemplates]);

  const handleTabChange = (_: React.SyntheticEvent, newTab: 'memo' | 'sql') => {
    setTab(newTab);
    if (newTab === 'memo') { loadMemo(connectionId, tableName); loadMemoTemplates(); }
    if (newTab === 'sql') { loadSqlList(connectionId); loadSqlTemplates(); }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        variant="persistent"
        sx={{
          width: open ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {/* ヘッダー */}
        <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5, bgcolor: 'primary.main' }}>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: 'white' } }}
            sx={{ flexGrow: 1, minHeight: 40, '& .MuiTab-root': { color: 'rgba(255,255,255,0.7)', minHeight: 40 }, '& .Mui-selected': { color: 'white' } }}
          >
            <Tab label="メモ" value="memo" />
            <Tab label="SQL" value="sql" />
          </Tabs>
          <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Divider />

        {/* メモタブ */}
        {tab === 'memo' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 48px)', p: 1, gap: 1 }}>
            {/* テンプレート選択 */}
            <FormControl size="small" fullWidth>
              <Select displayEmpty value="" onChange={(e) => { if (e.target.value) applyMemoTemplate(String(e.target.value)); }}>
                <MenuItem value="" disabled>テンプレートを適用</MenuItem>
                {memoTemplates.map((t) => (
                  <MenuItem key={t.n} value={t.content}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span>{t.title}</span>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteMemoTemplate(t.n); }}>
                        <DeleteIcon fontSize="inherit" />
                      </IconButton>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              multiline fullWidth value={memoContent}
              onChange={(e) => setMemoContent(e.target.value)}
              onKeyDown={(e) => { if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveMemo(connectionId, tableName); } }}
              placeholder="テーブルに関するメモを入力..."
              sx={{ flex: 1, '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' }, '& textarea': { height: '100% !important', overflow: 'auto !important' } }}
              InputProps={{ sx: { height: '100%' }, inputRef: memoInputRef }}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Tooltip title="ローカルに保存">
                <IconButton size="small" onClick={() => downloadMemo(connectionId, tableName)}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button size="small" variant="outlined" onClick={() => { setMemoTplTitle(''); setMemoTplDialog(true); }}>
                テンプレート保存
              </Button>
              <Button
                size="small" variant="contained"
                startIcon={memoSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                disabled={memoSaving}
                onClick={() => saveMemo(connectionId, tableName)}
              >
                保存
              </Button>
            </Stack>
          </Box>
        )}

        {/* SQLタブ */}
        {tab === 'sql' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 48px)', p: 1, gap: 1 }}>
            {/* 保存済みSQL呼び出し */}
            <FormControl size="small" fullWidth>
              <Select displayEmpty value="" onChange={(e) => { if (e.target.value) loadSqlById(Number(e.target.value)); }}>
                <MenuItem value="" disabled>保存済みSQLを呼び出す</MenuItem>
                {sqlList.map((s) => (
                  <MenuItem key={s.n} value={s.n}>{s.title}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* テンプレート選択 */}
            <FormControl size="small" fullWidth>
              <Select displayEmpty value="" onChange={(e) => { if (e.target.value) applySqlTemplate(String(e.target.value)); }}>
                <MenuItem value="" disabled>テンプレートを適用</MenuItem>
                {sqlTemplates.map((t) => (
                  <MenuItem key={t.n} value={t.content}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span>{t.title}</span>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteSqlTemplate(t.n); }}>
                        <DeleteIcon fontSize="inherit" />
                      </IconButton>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* SQLエディタ */}
            <TextField
              multiline fullWidth value={sqlContent}
              onChange={(e) => setSqlContent(e.target.value)}
              onKeyDown={(e) => { if (e.ctrlKey && e.key === 's') { e.preventDefault(); setSqlTitle(''); setSqlTitleDialog(true); } }}
              placeholder="SQLを入力..."
              sx={{ flex: 1, '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' }, '& textarea': { height: '100% !important', overflow: 'auto !important', fontFamily: 'monospace', fontSize: '0.85rem' } }}
              InputProps={{ sx: { height: '100%' }, inputRef: sqlInputRef }}
            />

            {/* 操作ボタン */}
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button size="small" variant="outlined" startIcon={<SaveIcon />}
                onClick={() => { setSqlTitle(''); setSqlTitleDialog(true); }}
                disabled={!sqlContent.trim()}>
                保存
              </Button>
              <Button size="small" variant="outlined"
                onClick={() => { setSqlTplTitle(''); setSqlTplDialog(true); }}
                disabled={!sqlContent.trim()}>
                テンプレート保存
              </Button>
              <Button size="small" variant="contained"
                startIcon={sqlExecuting ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon />}
                disabled={sqlExecuting || !sqlContent.trim()}
                onClick={() => executeSql(connectionId)}>
                実行
              </Button>
            </Stack>

            {/* SQL実行結果 */}
            {sqlResult && (
              <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {sqlResult.errorMessage ? (
                  <Typography color="error" variant="caption" sx={{ p: 1, display: 'block' }}>
                    {sqlResult.errorMessage}
                  </Typography>
                ) : sqlResult.rows ? (
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {sqlResult.rows.length > 0 && Object.keys(sqlResult.rows[0]).map((col) => (
                          <TableCell key={col} sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>{col}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sqlResult.rows.map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((v, j) => (
                            <TableCell key={j} sx={{ fontSize: '0.75rem' }}>{v === null ? 'NULL' : String(v)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="caption" sx={{ p: 1, display: 'block' }}>
                    {sqlResult.affectedRows} 行が影響を受けました
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </Drawer>

      {/* SQLタイトル入力 */}
      <TitleInputDialog
        open={sqlTitleDialog} title="SQLのタイトルを入力" label="タイトル"
        value={sqlTitle} onChange={setSqlTitle}
        onConfirm={() => { setSqlTitleDialog(false); saveSql(connectionId, sqlTitle.trim()); }}
        onClose={() => setSqlTitleDialog(false)}
      />

      {/* メモテンプレートタイトル入力 */}
      <TitleInputDialog
        open={memoTplDialog} title="メモテンプレートのタイトルを入力" label="タイトル"
        value={memoTplTitle} onChange={setMemoTplTitle}
        onConfirm={() => { setMemoTplDialog(false); saveMemoTemplate(memoTplTitle.trim(), memoContent); }}
        onClose={() => setMemoTplDialog(false)}
      />

      {/* SQLテンプレートタイトル入力 */}
      <TitleInputDialog
        open={sqlTplDialog} title="SQLテンプレートのタイトルを入力" label="タイトル"
        value={sqlTplTitle} onChange={setSqlTplTitle}
        onConfirm={() => { setSqlTplDialog(false); saveSqlTemplate(sqlTplTitle.trim(), sqlContent); }}
        onClose={() => setSqlTplDialog(false)}
      />

      {/* トースト */}
      <Snackbar
        open={!!toastMessage} autoHideDuration={3000} onClose={clearToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={clearToast} severity={toastSeverity} variant="filled">
          {toastMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

export default SideNav;

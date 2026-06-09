import { useEffect, useRef, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Select,
  Toolbar,
  Tooltip,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import KeyboardHideIcon from '@mui/icons-material/KeyboardHide';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TableChartIcon from '@mui/icons-material/TableChart';
import ArticleIcon from '@mui/icons-material/Article';
import GridOnIcon from '@mui/icons-material/GridOn';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import PublishIcon from '@mui/icons-material/Publish';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useNavigate } from 'react-router-dom';
import { useHeaderStore } from '../store/headerStore';
import { useTableEditStore } from '../store/tableEditStore';
import { useSideNavStore } from '../store/sideNavStore';
import { exportRows, type ExportFormat } from '../../adapter/api/exportApi';
import ConflictDiffDialog from '../features/diff/ConflictDiffDialog';
import HistoryListDialog from '../features/history/HistoryListDialog';

interface HeaderProps {
  isTableEditPage: boolean;
  currentTableName?: string;
}

function Header({ isTableEditPage, currentTableName }: HeaderProps) {
  const {
    visible,
    pinned,
    shortcutMode,
    tables,
    selectedTable,
    toggleVisible,
    togglePinned,
    toggleShortcutMode,
    setSelectedTable,
    setFocusHeaderCallback,
  } = useHeaderStore();
  void setSelectedTable;

  // Ctrl+J でフォーカスを当てるターゲット（テーブル選択ドロップダウン）
  const focusTargetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setFocusHeaderCallback(() => {
      const el = focusTargetRef.current?.querySelector('[tabindex="0"], button, input') as HTMLElement | null;
      el?.focus();
    });
  }, [setFocusHeaderCallback]);

  const dirty = useTableEditStore((s) => s.dirty);
  const saving = useTableEditStore((s) => s.saving);
  const applying = useTableEditStore((s) => s.applying);
  const conflictDetected = useTableEditStore((s) => s.conflictDetected);
  const conflictDiff = useTableEditStore((s) => s.conflictDiff);
  const saveHistory = useTableEditStore((s) => s.saveHistory);
  const undo = useTableEditStore((s) => s.undo);
  const redo = useTableEditStore((s) => s.redo);
  const applyToReal = useTableEditStore((s) => s.applyToReal);
  const clearConflict = useTableEditStore((s) => s.clearConflict);
  const resolveConflict = useTableEditStore((s) => s.resolveConflict);
  const refreshTable = useTableEditStore((s) => s.refreshTable);
  const historyList = useTableEditStore((s) => s.historyList);
  const historyPointer = useTableEditStore((s) => s.historyPointer);
  const toggleSideNav = useSideNavStore((s) => s.toggleOpen);

  const columns = useTableEditStore((s) => s.columns);
  const hasTable = isTableEditPage && !!currentTableName;
  const canImport = isTableEditPage;
  const isBusy = saving || applying;

  const canUndo = hasTable && !isBusy && historyList.length > 0 && historyPointer + 1 < historyList.length;
  const canRedo = hasTable && !isBusy && historyPointer > 0;

  const navigate = useNavigate();
  const [homeDialog, setHomeDialog] = useState(false);

  const handleHomeClick = () => {
    if (dirty) {
      setHomeDialog(true);
    } else {
      navigate('/');
    }
  };

  // 反映確認モーダル (C07)
  const [applyDialog, setApplyDialog] = useState(false);
  // 編集履歴モーダル (C09)
  const [historyDialog, setHistoryDialog] = useState(false);
  // リフレッシュ確認モーダル (C08)
  const [refreshDialog, setRefreshDialog] = useState(false);

  const getConnectionId = (): number | null => {
    const v = new URLSearchParams(window.location.search).get('connectionId');
    return v ? Number(v) : null;
  };

  const handleSave = () => {
    const connId = getConnectionId();
    if (connId) saveHistory(connId);
  };

  const handleUndo = () => {
    const connId = getConnectionId();
    if (connId) undo(connId);
  };

  const handleRedo = () => {
    const connId = getConnectionId();
    if (connId) redo(connId);
  };

  // H09: 更新実行ボタン → 反映確認モーダルを開く
  const handleApplyClick = () => setApplyDialog(true);

  // H13: リフレッシュ確認: はい
  const handleRefreshConfirm = async () => {
    setRefreshDialog(false);
    const connId = getConnectionId();
    if (connId) await refreshTable(connId);
  };

  // H14: 履歴モーダルから復元
  const handleHistoryRestore = async (seq: number) => {
    const connId = getConnectionId();
    if (!connId) return;
    const { tableName, saving } = useTableEditStore.getState();
    if (!tableName || saving) return;
    useTableEditStore.setState({ saving: true });
    try {
      const { tableApi } = await import('../../adapter/api/tableApi');
      const records = await tableApi.restoreHistory(connId, tableName, seq);
      const columns = records.length > 0 ? Object.keys(records[0]) : useTableEditStore.getState().columns;
      useTableEditStore.setState({
        rows: records,
        columns,
        historyPointer: historyList.findIndex((h) => h.seq === seq),
        dirty: false,
        saving: false,
        toastMessage: `履歴 #${seq} を復元しました`,
        toastSeverity: 'success',
      });
    } catch {
      useTableEditStore.setState({ saving: false, toastMessage: '復元に失敗しました', toastSeverity: 'error' });
    }
    setHistoryDialog(false);
  };

  // 反映確認: はい
  const handleApplyConfirm = async () => {
    setApplyDialog(false);
    const connId = getConnectionId();
    if (connId) await applyToReal(connId);
  };

  // 反映確認: キャンセル
  const handleApplyCancel = () => setApplyDialog(false);

  // H06: 表示内容即時エクスポート用メニュー
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  const handleExportMenuOpen = (e: React.MouseEvent<HTMLElement>) => setExportMenuAnchor(e.currentTarget);
  const handleExportMenuClose = () => setExportMenuAnchor(null);

  const handleExportNow = (format: ExportFormat) => {
    handleExportMenuClose();
    const { tableName, columns, rows } = useTableEditStore.getState();
    if (!tableName || columns.length === 0) return;
    exportRows(tableName, columns, rows, format);
  };

  // 切替確認モーダル
  const [switchDialog, setSwitchDialog] = useState<{
    open: boolean;
    targetTable: string;
  }>({ open: false, targetTable: '' });

  // 連続クリック防止
  const [opening, setOpening] = useState(false);

  const openTableInNewTab = (tableName: string) => {
    const connId = new URLSearchParams(window.location.search).get('connectionId');
    if (!connId) return;
    setOpening(true);
    window.open(`/tables/${tableName}?connectionId=${connId}`, '_blank');
    setTimeout(() => setOpening(false), 1000);
  };

  // H02: ドロップダウンでテーブル選択
  const handleTableSelect = (tableName: string) => {
    if (tableName === currentTableName) return;

    if (isTableEditPage && !!currentTableName) {
      // テーブル選択済みの編集画面 → モーダルで確認
      setSwitchDialog({ open: true, targetTable: tableName });
    } else if (isTableEditPage && !currentTableName) {
      // テーブル未選択状態（_select）→ 現在のタブで遷移
      const connId = new URLSearchParams(window.location.search).get('connectionId');
      window.location.href = `/tables/${tableName}?connectionId=${connId ?? ''}`;
    } else {
      // 編集画面以外 → 即新規タブ
      openTableInNewTab(tableName);
    }
  };

  // モーダル: 新規タブで開く
  const handleSwitchConfirm = () => {
    const target = switchDialog.targetTable;
    setSwitchDialog({ open: false, targetTable: '' });
    openTableInNewTab(target);
  };

  // モーダル: キャンセル
  const handleSwitchCancel = () => {
    setSwitchDialog({ open: false, targetTable: '' });
  };

  // H03: 選択中テーブルを新規タブで開く
  const handleOpenNewTab = () => {
    if (!selectedTable || opening) return;
    openTableInNewTab(selectedTable);
  };

  return (
    <Box>
      {/* 開閉トグルバー */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          bgcolor: 'primary.dark',
          cursor: 'pointer',
          py: 0.25,
        }}
        onClick={toggleVisible}
      >
        {visible ? (
          <ExpandLessIcon sx={{ color: 'white', fontSize: 18 }} />
        ) : (
          <ExpandMoreIcon sx={{ color: 'white', fontSize: 18 }} />
        )}
      </Box>

      <Collapse in={visible}>
        <AppBar position="static" color="primary" elevation={1}>
          <Toolbar variant="dense" sx={{ gap: 0.5, flexWrap: 'wrap', minHeight: 48 }}>
            {/* HOME: TOPへ戻る */}
            <Tooltip title="TOPへ戻る">
              <IconButton color="inherit" size="small" onClick={handleHomeClick}>
                <HomeIcon />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)', mx: 0.5 }} />

            {/* H01: ショートカットキーON/OFF */}
            <Tooltip title={shortcutMode ? 'ショートカット: アプリ専用' : 'ショートカット: ブラウザ標準'}>
              <IconButton color="inherit" size="small" onClick={toggleShortcutMode}>
                {shortcutMode ? <KeyboardIcon /> : <KeyboardHideIcon />}
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)', mx: 0.5 }} />

            {/* H02: テーブル選択ドロップダウン */}
            <FormControl size="small" sx={{ minWidth: 180 }} ref={focusTargetRef}>
              <Select
                value={selectedTable ?? ''}
                onChange={(e) => handleTableSelect(e.target.value)}
                displayEmpty
                sx={{
                  color: 'white',
                  fontSize: '0.85rem',
                  height: 32,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.7)' },
                  '.MuiSvgIcon-root': { color: 'white' },
                }}
              >
                <MenuItem value="" disabled>
                  テーブルを選択
                </MenuItem>
                {tables.map((t) => (
                  <MenuItem key={`${t.schemaName}.${t.tableName}`} value={t.tableName}>
                    {t.schemaName !== 'public' ? `${t.schemaName}.` : ''}
                    {t.tableName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* H03: 新規タブ表示 */}
            <Tooltip title="選択テーブルを新規タブで開く">
              <span>
                <IconButton
                  color="inherit"
                  size="small"
                  disabled={!selectedTable || opening}
                  onClick={handleOpenNewTab}
                >
                  <OpenInNewIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)', mx: 0.5 }} />

            {/* H05: インポート */}
            <Tooltip title="インポート">
              <span>
                <IconButton
                  color="inherit"
                  size="small"
                  disabled={!canImport}
                  onClick={() => {
                    const connId = new URLSearchParams(window.location.search).get('connectionId');
                    window.open(`/import?connectionId=${connId ?? ''}`, '_blank');
                  }}
                >
                  <FileUploadIcon />
                </IconButton>
              </span>
            </Tooltip>

            {/* H06: 表示内容エクスポート */}
            <Tooltip title="表示内容を即時エクスポート">
              <span>
                <IconButton
                  color="inherit"
                  size="small"
                  disabled={!hasTable || columns.length === 0}
                  onClick={handleExportMenuOpen}
                >
                  <FileDownloadIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Menu
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={handleExportMenuClose}
            >
              <MenuItem onClick={() => handleExportNow('csv')}>
                <ListItemIcon><GridOnIcon fontSize="small" /></ListItemIcon>
                CSV (.csv)
              </MenuItem>
              <MenuItem onClick={() => handleExportNow('excel')}>
                <ListItemIcon><TableChartIcon fontSize="small" /></ListItemIcon>
                Excel (.xlsx)
              </MenuItem>
              <MenuItem onClick={() => handleExportNow('markdown')}>
                <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
                Markdown (.md)
              </MenuItem>
            </Menu>

            {/* H07: 複数テーブルエクスポート */}
            <Tooltip title="複数テーブルエクスポート">
              <span>
                <IconButton
                  color="inherit"
                  size="small"
                  disabled={!hasTable}
                  onClick={() => {
                    const connId = new URLSearchParams(window.location.search).get('connectionId');
                    window.open(`/export?connectionId=${connId ?? ''}`, '_blank');
                  }}
                >
                  <TableChartIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)', mx: 0.5 }} />

            {/* H08: メモ機能 */}
            <Tooltip title="メモ / SQL (Ctrl+M)">
              <span>
                <IconButton
                  color="inherit"
                  size="small"
                  disabled={!hasTable || isBusy}
                  onClick={toggleSideNav}
                >
                  <NoteAltIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)', mx: 0.5 }} />

            {/* H09: 更新実行 */}
            <Tooltip title="編集内容をDBに反映">
              <span>
                <IconButton
                  color="inherit"
                  size="small"
                  disabled={!hasTable || isBusy}
                  onClick={handleApplyClick}
                >
                  <PublishIcon />
                </IconButton>
              </span>
            </Tooltip>

            {/* H10: Undo */}
            <Tooltip title="元に戻す (Ctrl+Z)">
              <span>
                <IconButton
                  color="inherit"
                  size="small"
                  disabled={!canUndo}
                  onClick={handleUndo}
                >
                  <UndoIcon />
                </IconButton>
              </span>
            </Tooltip>

            {/* H11: Redo */}
            <Tooltip title="やり直す (Ctrl+Y)">
              <span>
                <IconButton
                  color="inherit"
                  size="small"
                  disabled={!canRedo}
                  onClick={handleRedo}
                >
                  <RedoIcon />
                </IconButton>
              </span>
            </Tooltip>

            {/* H12: 保存 */}
            <Tooltip title="編集内容を保存 (Ctrl+S)">
              <span>
                <IconButton
                  color="inherit"
                  size="small"
                  disabled={!hasTable || !dirty || isBusy}
                  onClick={handleSave}
                >
                  <SaveIcon />
                </IconButton>
              </span>
            </Tooltip>

            {/* H13: リフレッシュ */}
            <Tooltip title="DBから再取得">
              <span>
                <IconButton
                  color="inherit"
                  size="small"
                  disabled={!hasTable || isBusy}
                  onClick={() => setRefreshDialog(true)}
                >
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>

            {/* H14: 編集履歴 */}
            <Tooltip title="編集履歴">
              <span>
                <IconButton
                  color="inherit"
                  size="small"
                  disabled={!hasTable || isBusy || historyList.length === 0}
                  onClick={() => setHistoryDialog(true)}
                >
                  <HistoryIcon />
                </IconButton>
              </span>
            </Tooltip>

            {/* 右端: H04 ヘッダー固定 */}
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title={pinned ? 'ヘッダー固定中' : 'ヘッダー非固定'}>
              <IconButton color="inherit" size="small" onClick={togglePinned}>
                {pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
      </Collapse>

      {/* TOPへ戻る確認モーダル */}
      <Dialog open={homeDialog} onClose={() => setHomeDialog(false)}>
        <DialogTitle>TOPへ戻る</DialogTitle>
        <DialogContent>
          <DialogContentText>
            未保存の編集内容があります。TOPへ戻りますか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHomeDialog(false)} autoFocus>キャンセル</Button>
          <Button color="error" onClick={() => { setHomeDialog(false); navigate('/'); }}>破棄して戻る</Button>
        </DialogActions>
      </Dialog>

      {/* テーブル切替確認モーダル */}
      <Dialog open={switchDialog.open} onClose={handleSwitchCancel}>
        <DialogTitle>テーブル切替</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dirty
              ? `未保存の編集内容があります。「${switchDialog.targetTable}」を新規タブで開きますか？`
              : `「${switchDialog.targetTable}」を新規タブで開きますか？`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSwitchCancel} autoFocus>
            いいえ
          </Button>
          <Button onClick={handleSwitchConfirm}>はい</Button>
        </DialogActions>
      </Dialog>

      {/* C07: 編集内容反映確認モーダル */}
      <Dialog open={applyDialog} onClose={handleApplyCancel}>
        <DialogTitle>実DB反映の確認</DialogTitle>
        <DialogContent>
          <DialogContentText>
            コピーテーブルの編集内容を実テーブルに反映します。よろしいですか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleApplyCancel} autoFocus>
            キャンセル
          </Button>
          <Button onClick={handleApplyConfirm} color="primary">
            反映する
          </Button>
        </DialogActions>
      </Dialog>

      {/* C08: リフレッシュ確認モーダル */}
      <Dialog open={refreshDialog} onClose={() => setRefreshDialog(false)}>
        <DialogTitle>DBから再取得</DialogTitle>
        <DialogContent>
          <DialogContentText>
            DBから最新データを再取得します。未保存の編集内容は失われます。よろしいですか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefreshDialog(false)} autoFocus>
            キャンセル
          </Button>
          <Button onClick={handleRefreshConfirm} color="primary">
            再取得する
          </Button>
        </DialogActions>
      </Dialog>

      {/* C09: 編集履歴モーダル */}
      <HistoryListDialog
        open={historyDialog}
        historyList={historyList}
        historyPointer={historyPointer}
        onRestore={handleHistoryRestore}
        onClose={() => setHistoryDialog(false)}
      />

      {/* 衝突時Diff解決ダイアログ */}
      <ConflictDiffDialog
        open={conflictDetected === true}
        diffRows={conflictDiff}
        onResolve={(resolvedRows) => {
          const connId = getConnectionId();
          if (connId) resolveConflict(connId, resolvedRows);
        }}
        onClose={clearConflict}
      />
    </Box>
  );
}

export default Header;

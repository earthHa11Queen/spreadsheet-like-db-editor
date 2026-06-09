import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Snackbar, Stack, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useBlocker, useParams, useSearchParams } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import DataEditor, {
  type DataEditorRef,
  type EditableGridCell,
  type GridCell,
  type GridCellKind,
  type GridColumn,
  type Item,
} from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
import { useHeaderStore } from '../store/headerStore';
import { useConnectionStore } from '../store/connectionStore';
import { useTableEditStore } from '../store/tableEditStore';
import { useSideNavStore } from '../store/sideNavStore';
import SideNav from '../features/sidenav/SideNav';
import LoadingOverlay from '../components/LoadingOverlay';
import StaleTablesDialog from '../features/stale/StaleTablesDialog';

function TableEditPage() {
  const { tableName } = useParams<{ tableName: string }>();
  const [searchParams] = useSearchParams();
  const connectionId = searchParams.get('connectionId');

  const { fetchTables, setSelectedTable, shortcutMode, toggleShortcutMode, focusHeader } = useHeaderStore();
  const { setSelectedConnectionId } = useConnectionStore();
  const { columns, rows, loading, error, dirty, saving, applying, toastMessage, toastSeverity,
          staleTables,
          loadTable, updateCell, addRow, deleteRow, saveHistory, undo, redo, clearToast,
          dropStaleTable, clearStaleTables } =
    useTableEditStore();
  const { open: sideNavOpen, toggleOpen: toggleSideNav, setTab: setSideNavTab, setOpen: setSideNavOpen,
          saveMemo, saveSql } = useSideNavStore();

  const gridRef = useRef<DataEditorRef>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState<{ width: number; height: number }>({ width: 800, height: 400 });
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  const [staleDialog, setStaleDialog] = useState(false);

  const connId = connectionId ? Number(connectionId) : null;

  useEffect(() => {
    if (connId) {
      setSelectedConnectionId(connId);
      fetchTables(connId);
    }
  }, [connId, fetchTables, setSelectedConnectionId]);

  useEffect(() => {
    if (tableName) {
      setSelectedTable(tableName);
    }
  }, [tableName, setSelectedTable]);

  useEffect(() => {
    if (connId && tableName) {
      loadTable(connId, tableName);
    }
  }, [connId, tableName, loadTable]);

  // グリッドコンテナのサイズを監視
  // loading=false になってDOMが現れた後に ResizeObserver を設定する
  useEffect(() => {
    if (loading) return;
    const el = gridContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setGridSize((prev) =>
        prev.width === Math.floor(width) && prev.height === Math.floor(height)
          ? prev
          : { width: Math.floor(width), height: Math.floor(height) },
      );
    });
    ro.observe(el);
    setGridSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, [loading]);

  // サイドナビが閉じたらグリッドにフォーカスを戻す
  useEffect(() => {
    if (!sideNavOpen) {
      gridRef.current?.focus();
    }
  }, [sideNavOpen]);

  // 残存テーブルがあればダイアログを自動表示
  useEffect(() => {
    if (staleTables.length > 0) setStaleDialog(true);
  }, [staleTables]);

  // beforeunload: ブラウザ閉じ・リロード時の標準ダイアログ
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // useBlocker: React Router 内のページ遷移時の確認 (C06)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  // Ctrl+S: サイドナビが開いてメモタブならメモ保存、それ以外はテーブル履歴保存
  useHotkeys(
    'ctrl+s',
    (e) => {
      e.preventDefault();
      const { open, tab } = useSideNavStore.getState();
      if (open && tab === 'memo' && connId && tableName) {
        saveMemo(connId, tableName);
      } else if (connId) {
        saveHistory(connId);
      }
    },
    { enableOnFormTags: true, enabled: shortcutMode },
  );

  // Ctrl+Z: Undo
  useHotkeys(
    'ctrl+z',
    (e) => {
      e.preventDefault();
      if (connId) undo(connId);
    },
    { enableOnFormTags: true, enabled: shortcutMode },
  );

  // Ctrl+Y: Redo
  useHotkeys(
    'ctrl+y',
    (e) => {
      e.preventDefault();
      if (connId) redo(connId);
    },
    { enableOnFormTags: true, enabled: shortcutMode },
  );

  // Ctrl+M: メモタブを開いてフォーカス（開いていてメモタブならそのまま閉じる）
  useHotkeys(
    'ctrl+m',
    (e) => {
      e.preventDefault();
      const { open, tab } = useSideNavStore.getState();
      if (open && tab === 'memo') {
        setSideNavOpen(false);
      } else {
        setSideNavTab('memo');
        setSideNavOpen(true);
      }
    },
    { enableOnFormTags: true, enabled: shortcutMode },
  );

  // Ctrl+Q: SQLタブを開いてフォーカス（開いていてSQLタブならそのまま閉じる）
  useHotkeys(
    'ctrl+q',
    (e) => {
      e.preventDefault();
      const { open, tab } = useSideNavStore.getState();
      if (open && tab === 'sql') {
        setSideNavOpen(false);
      } else {
        setSideNavTab('sql');
        setSideNavOpen(true);
      }
    },
    { enableOnFormTags: true, enabled: shortcutMode },
  );

  // Ctrl+Shift+K: ショートカットモード切替（常に有効）
  useHotkeys(
    'ctrl+shift+k',
    (e) => {
      e.preventDefault();
      toggleShortcutMode();
    },
    { enableOnFormTags: true },
  );

  // Ctrl+J: ヘッダーを開いてテーブル選択ドロップダウンにフォーカス
  useHotkeys(
    'ctrl+j',
    (e) => {
      e.preventDefault();
      focusHeader();
    },
    { enableOnFormTags: true, enabled: shortcutMode },
  );

  // F2: グリッドのネイティブ編集開始に任せるためハンドラーは不要
  // （useHotkeysでキャプチャするとグリッドにF2が届かなくなるため削除）

  // Escape: サイドナビを閉じる（グリッドのネイティブEscapeはそのまま機能する）
  useHotkeys(
    'escape',
    () => {
      if (sideNavOpen) setSideNavOpen(false);
    },
    { enableOnFormTags: false, enabled: shortcutMode },
  );

  // Glide Data Grid のカラム定義
  const gridColumns: GridColumn[] = useMemo(
    () =>
      columns.map((col) => ({
        id: col,
        title: col,
        width: colWidths[col] ?? 150,
      })),
    [columns, colWidths],
  );

  // 列幅変更
  const onColumnResize = useCallback(
    (col: GridColumn, newSize: number) => {
      setColWidths((prev) => ({ ...prev, [col.id as string]: newSize }));
    },
    [],
  );

  // セルデータの取得
  const getCellContent = useCallback(
    ([colIdx, rowIdx]: Item): GridCell => {
      const row = rows[rowIdx];
      const col = columns[colIdx];
      const value = row?.[col];
      const displayValue = value === null || value === undefined ? '' : String(value);
      return {
        kind: 'text' as GridCellKind,
        data: displayValue,
        displayData: displayValue,
        allowOverlay: true,
        readonly: false,
      } as GridCell;
    },
    [rows, columns],
  );

  // セル編集
  const onCellEdited = useCallback(
    ([colIdx, rowIdx]: Item, newValue: EditableGridCell) => {
      const col = columns[colIdx];
      if (newValue.kind === 'text') {
        const rawValue = newValue.data === '' ? null : newValue.data;
        updateCell(rowIdx, col, rawValue);
      }
    },
    [columns, updateCell],
  );

  // テーブル未選択
  if (!tableName) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          ヘッダーのドロップダウンからテーブルを選択してください
        </Typography>
      </Box>
    );
  }

  // ローディング
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }


  // エラー
  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 80px)' }}>
      {/* メインコンテンツ */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      {/* ツールバー */}
      <Stack direction="row" spacing={1} sx={{ p: 1, alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {tableName}
          {dirty && (
            <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>
              (未保存の変更あり)
            </Typography>
          )}
        </Typography>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addRow}>
          行追加
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          disabled={rows.length === 0}
          onClick={() => deleteRow(rows.length - 1)}
        >
          末尾行削除
        </Button>
      </Stack>

      {/* グリッド */}
      <Box ref={gridContainerRef} sx={{ flex: 1, px: 1, pb: 1 }}>
        {columns.length > 0 ? (
          <DataEditor
            ref={gridRef}
            columns={gridColumns}
            rows={rows.length}
            getCellContent={getCellContent}
            onCellEdited={onCellEdited}
            onColumnResize={onColumnResize}
            getCellsForSelection={true}
            keybindings={{ activateCell: 'F2| |Enter|shift+Enter' }}
            cellActivationBehavior="double-click"
            editOnType
            width={gridSize.width}
            height={gridSize.height}
            rowMarkers="both"
            smoothScrollX
            smoothScrollY
          />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Typography color="text.secondary">テーブルにデータがありません</Typography>
          </Box>
        )}
      </Box>

      {/* トースト通知 */}
      <Snackbar
        open={!!toastMessage}
        autoHideDuration={3000}
        onClose={clearToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={clearToast} severity={toastSeverity} variant="filled">
          {toastMessage}
        </Alert>
      </Snackbar>

      {/* C06: 編集途中終了確認モーダル (React Router 遷移時) */}
      <Dialog open={blocker.state === 'blocked'}>
        <DialogTitle>未保存の変更があります</DialogTitle>
        <DialogContent>
          <DialogContentText>
            未保存のテーブル編集内容がありますが、保存しなくてよろしいですか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => blocker.reset?.()} autoFocus>
            キャンセル（編集に戻る）
          </Button>
          <Button color="error" onClick={() => blocker.proceed?.()}>
            保存せずに退出
          </Button>
        </DialogActions>
      </Dialog>
      </Box>

      {/* C04: メモ・SQLサイドナビ */}
      {tableName && connId && (
        <SideNav connectionId={connId} tableName={tableName} />
      )}

      {/* S08: ローディングオーバーレイ */}
      <LoadingOverlay open={saving || applying} message={applying ? 'DB反映中...' : '保存中...'} />

      {/* 残存テーブル管理ダイアログ */}
      {connId && (
        <StaleTablesDialog
          open={staleDialog}
          staleTables={staleTables}
          onDelete={async (selected) => {
            for (const t of selected) await dropStaleTable(connId, t);
          }}
          onClose={() => { setStaleDialog(false); clearStaleTables(); }}
        />
      )}
    </Box>
  );
}

export default TableEditPage;

import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

export type DiffRow = Record<string, unknown>;

/** before/after をペアリングした1行分のDiff */
interface DiffPair {
  key: string;
  before: DiffRow | null;
  after: DiffRow | null;
}

interface ConflictDiffDialogProps {
  open: boolean;
  diffRows: DiffRow[];
  /** 解決結果（採用行一覧）を確定して反映する */
  onResolve: (resolvedRows: DiffRow[]) => void;
  onClose: () => void;
}

/** side フィールドを除いたデータ部分を返す */
function dataOf(row: DiffRow): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'side'));
}

/** Diffデータを before/after ペアに変換する。
 *  PKが不明なため、before と after を出現順にペアリングする。
 *  余った行は片側のみのペアとして扱う。
 */
function pairDiff(rows: DiffRow[]): DiffPair[] {
  const befores = rows.filter((r) => r['side'] === 'before');
  const afters = rows.filter((r) => r['side'] === 'after');
  const len = Math.max(befores.length, afters.length);
  return Array.from({ length: len }, (_, i) => ({
    key: String(i),
    before: befores[i] ?? null,
    after: afters[i] ?? null,
  }));
}

export default function ConflictDiffDialog({
  open,
  diffRows,
  onResolve,
  onClose,
}: ConflictDiffDialogProps) {
  const pairs = useMemo(() => pairDiff(diffRows), [diffRows]);

  // 各ペアの採用選択: 'before' | 'after' | null(未選択)
  const [selections, setSelections] = useState<Record<string, 'before' | 'after'>>({});

  const select = (key: string, side: 'before' | 'after') =>
    setSelections((prev) => ({ ...prev, [key]: side }));

  const allSelected = pairs.length > 0 && pairs.every((p) => selections[p.key] !== undefined);

  const handleResolve = () => {
    const resolved: DiffRow[] = pairs
      .map((p) => {
        const side = selections[p.key];
        const row = side === 'before' ? p.before : p.after;
        return row ? dataOf(row) : null;
      })
      .filter((r): r is DiffRow => r !== null);
    onResolve(resolved);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        衝突の解決
        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
          各行について「変更前」か「変更後」を選択してください
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {pairs.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary">差分データがありません</Typography>
          </Box>
        ) : (
          pairs.map((pair, idx) => {
            const beforeStr = pair.before ? JSON.stringify(dataOf(pair.before), null, 2) : '';
            const afterStr = pair.after ? JSON.stringify(dataOf(pair.after), null, 2) : '';
            const selected = selections[pair.key];

            return (
              <Box key={pair.key}>
                {idx > 0 && <Divider />}
                <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      差分 {idx + 1} / {pairs.length}
                    </Typography>
                    {selected && (
                      <Chip
                        size="small"
                        label={selected === 'before' ? '変更前を採用' : '変更後を採用'}
                        color={selected === 'before' ? 'warning' : 'success'}
                      />
                    )}
                  </Stack>

                  {/* Diff表示 */}
                  <Box sx={{ fontSize: '0.78rem', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                    <ReactDiffViewer
                      oldValue={beforeStr}
                      newValue={afterStr}
                      splitView
                      compareMethod={DiffMethod.WORDS}
                      leftTitle="変更前（バックアップ時点）"
                      rightTitle="変更後（現在の実テーブル）"
                      useDarkTheme={false}
                    />
                  </Box>

                  {/* 採用選択ボタン */}
                  <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1.5 }}>
                    <Button
                      size="small"
                      variant={selected === 'before' ? 'contained' : 'outlined'}
                      color="warning"
                      disabled={!pair.before}
                      onClick={() => select(pair.key, 'before')}
                    >
                      変更前を採用
                    </Button>
                    <Button
                      size="small"
                      variant={selected === 'after' ? 'contained' : 'outlined'}
                      color="success"
                      disabled={!pair.after}
                      onClick={() => select(pair.key, 'after')}
                    >
                      変更後を採用
                    </Button>
                  </Stack>
                </Box>
              </Box>
            );
          })
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button
          variant="contained"
          disabled={!allSelected}
          onClick={handleResolve}
        >
          選択内容でコピーテーブルを更新
        </Button>
      </DialogActions>
    </Dialog>
  );
}

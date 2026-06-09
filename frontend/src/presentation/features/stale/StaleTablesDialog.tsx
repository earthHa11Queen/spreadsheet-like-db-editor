import { useState } from 'react';
import {
  Button, Checkbox, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, Stack, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface Props {
  open: boolean;
  staleTables: string[];
  onDelete: (selected: string[]) => Promise<void>;
  onClose: () => void;
}

function StaleTablesDialog({ open, staleTables, onDelete, onClose }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const toggle = (name: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    setChecked(checked.size === staleTables.length ? new Set() : new Set(staleTables));
  };

  const handleDelete = async () => {
    if (checked.size === 0) return;
    setDeleting(true);
    await onDelete([...checked]);
    setChecked(new Set());
    setDeleting(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>残存テーブルの管理</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          copy_ / backup_ / history_ プレフィックスのテーブルが残存しています。
          削除するテーブルを選択してください。
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={checked.size === staleTables.length && staleTables.length > 0}
              indeterminate={checked.size > 0 && checked.size < staleTables.length}
              onChange={toggleAll}
            />
          }
          label="すべて選択"
        />
        <Stack sx={{ maxHeight: 320, overflowY: 'auto', mt: 0.5 }}>
          {staleTables.map((t) => (
            <FormControlLabel
              key={t}
              control={<Checkbox checked={checked.has(t)} onChange={() => toggle(t)} />}
              label={<Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{t}</Typography>}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          disabled={checked.size === 0 || deleting}
          onClick={handleDelete}
        >
          選択した {checked.size} 件を削除
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default StaleTablesDialog;

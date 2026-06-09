import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { HistoryEntry } from '../../store/tableEditStore';

interface HistoryListDialogProps {
  open: boolean;
  historyList: HistoryEntry[];
  historyPointer: number;
  onRestore: (seq: number) => void;
  onClose: () => void;
}

function HistoryListDialog({
  open,
  historyList,
  historyPointer,
  onRestore,
  onClose,
}: HistoryListDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>編集履歴</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {historyList.length === 0 ? (
          <Typography sx={{ p: 2, color: 'text.secondary' }}>保存済みの履歴がありません</Typography>
        ) : (
          <List disablePadding>
            {historyList.map((entry, index) => (
              <ListItemButton
                key={entry.seq}
                selected={index === historyPointer}
                onClick={() => onRestore(entry.seq)}
                divider
              >
                <ListItemText
                  primary={`履歴 #${entry.seq}`}
                  secondary={new Date(entry.savedAt).toLocaleString('ja-JP')}
                  primaryTypographyProps={{ fontWeight: index === historyPointer ? 'bold' : 'normal' }}
                />
                {index === historyPointer && (
                  <Typography variant="caption" color="primary" sx={{ ml: 1 }}>
                    現在
                  </Typography>
                )}
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} autoFocus>
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default HistoryListDialog;

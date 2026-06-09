import { useEffect, useState } from 'react';
import { Fab, Zoom } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Zoom in={visible}>
      <Fab
        size="small"
        color="primary"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        sx={{ position: 'fixed', bottom: 48, right: 16, zIndex: (theme) => theme.zIndex.fab }}
        aria-label="トップに戻る"
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Zoom>
  );
}

export default ScrollToTop;

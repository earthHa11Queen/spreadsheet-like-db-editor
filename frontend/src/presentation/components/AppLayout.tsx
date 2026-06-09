import { Alert, Box, Snackbar } from '@mui/material';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { useErrorStore } from '../store/errorStore';
import ScrollToTop from './ScrollToTop';

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { message, clearError } = useErrorStore();

  // トップ画面(/)と接続設定画面ではヘッダーを表示しない
  const hideHeader = location.pathname === '/' || location.pathname.startsWith('/connections') || location.pathname.startsWith('/import') || location.pathname.startsWith('/export');
  const isTableEditPage = location.pathname.startsWith('/tables/');
  const rawTableSegment = location.pathname.split('/tables/')[1]?.split('?')[0] ?? '';
  const currentTableName = isTableEditPage && rawTableSegment !== '_select'
    ? decodeURIComponent(rawTableSegment)
    : undefined;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!hideHeader && (
        <Header
          isTableEditPage={isTableEditPage}
          currentTableName={currentTableName}
        />
      )}
      <Box sx={{ flex: 1 }}>{children}</Box>
      <Footer />
      <ScrollToTop />

      {/* グローバルエラートースト */}
      <Snackbar
        open={!!message}
        autoHideDuration={5000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" onClose={clearError}>
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AppLayout;

import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './infrastructure/theme';
import AppLayout from './presentation/components/AppLayout';
import TopPage from './presentation/pages/TopPage';
import ConnectionSettingsPage from './presentation/pages/ConnectionSettingsPage';
import TableEditPage from './presentation/pages/TableEditPage';
import ImportPage from './presentation/pages/ImportPage';
import MappingPage from './presentation/pages/MappingPage';
import NewTableMappingPage from './presentation/pages/NewTableMappingPage';
import ProcessCompletePage from './presentation/pages/ProcessCompletePage';
import ExportPage from './presentation/pages/ExportPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout><TopPage /></AppLayout>,
  },
  {
    path: '/connections/settings',
    element: <AppLayout><ConnectionSettingsPage /></AppLayout>,
  },
  {
    path: '/tables/_select',
    element: <AppLayout><TableEditPage /></AppLayout>,
  },
  {
    path: '/tables/:tableName',
    element: <AppLayout><TableEditPage /></AppLayout>,
  },
  {
    path: '/import',
    element: <AppLayout><ImportPage /></AppLayout>,
  },
  {
    path: '/import/mapping',
    element: <AppLayout><MappingPage /></AppLayout>,
  },
  {
    path: '/import/new-table',
    element: <AppLayout><NewTableMappingPage /></AppLayout>,
  },
  {
    path: '/import/done',
    element: <AppLayout><ProcessCompletePage /></AppLayout>,
  },
  {
    path: '/export',
    element: <AppLayout><ExportPage /></AppLayout>,
  },
  {
    path: '/export/done',
    element: <AppLayout><ProcessCompletePage /></AppLayout>,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
);

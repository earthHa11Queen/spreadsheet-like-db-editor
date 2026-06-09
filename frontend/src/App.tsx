import { Routes, Route } from 'react-router-dom';
import TopPage from './presentation/pages/TopPage';
import ConnectionSettingsPage from './presentation/pages/ConnectionSettingsPage';
import TableEditPage from './presentation/pages/TableEditPage';
import ImportPage from './presentation/pages/ImportPage';
import MappingPage from './presentation/pages/MappingPage';
import ProcessCompletePage from './presentation/pages/ProcessCompletePage';
import ExportPage from './presentation/pages/ExportPage';
import AppLayout from './presentation/components/AppLayout';

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<TopPage />} />
        <Route path="/connections/settings" element={<ConnectionSettingsPage />} />
        <Route path="/tables/_select" element={<TableEditPage />} />
        <Route path="/tables/:tableName" element={<TableEditPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/import/mapping" element={<MappingPage />} />
        <Route path="/import/done" element={<ProcessCompletePage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/export/done" element={<ProcessCompletePage />} />
      </Routes>
    </AppLayout>
  );
}

export default App;

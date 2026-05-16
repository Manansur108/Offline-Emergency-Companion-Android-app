import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { Layout } from './layout/Layout';
import { ModelPage } from './pages/ModelPage';
import { EmergencyPage } from './pages/EmergencyPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<EmergencyPage />} />
          <Route path="emergency" element={<EmergencyPage />} />
          <Route path="model" element={<ModelPage />} />
          <Route path="*" element={<Navigate to="/emergency" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

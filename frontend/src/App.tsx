import { Route, Routes } from 'react-router-dom'
import { AppShellLayout } from './layout/AppShellLayout'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { Landing } from './pages/public/Landing'
import { Login } from './pages/public/Login'
import { Register } from './pages/public/Register'
import { MedicineSearch } from './pages/public/MedicineSearch'
import { DoctorDirectory } from './pages/public/DoctorDirectory'
import { DoctorDetail } from './pages/public/DoctorDetail'
import { PatientHome } from './pages/patient/PatientHome'
import { DoctorHome } from './pages/doctor/DoctorHome'
import { PharmacyHome } from './pages/pharmacy/PharmacyHome'
import { AdminHome } from './pages/admin/AdminHome'

function App() {
  return (
    <Routes>
      <Route element={<AppShellLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/medicines" element={<MedicineSearch />} />
        <Route path="/doctors" element={<DoctorDirectory />} />
        <Route path="/doctors/:id" element={<DoctorDetail />} />

        <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
          <Route path="/patient" element={<PatientHome />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
          <Route path="/doctor" element={<DoctorHome />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['pharmacy']} />}>
          <Route path="/pharmacy" element={<PharmacyHome />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminHome />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App

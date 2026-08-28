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
import { PatientProfilePage } from './pages/patient/Profile'
import { Cart } from './pages/patient/Cart'
import { OrderHistory } from './pages/patient/OrderHistory'
import { OrderDetail } from './pages/patient/OrderDetail'
import { Prescriptions } from './pages/patient/Prescriptions'
import { PatientAppointments } from './pages/patient/Appointments'
import { PatientAppointmentDetail } from './pages/patient/AppointmentDetail'
import { DoctorHome } from './pages/doctor/DoctorHome'
import { DoctorProfilePage } from './pages/doctor/Profile'
import { Availability } from './pages/doctor/Availability'
import { DoctorAppointments } from './pages/doctor/Appointments'
import { DoctorAppointmentDetail } from './pages/doctor/AppointmentDetail'
import { PharmacyHome } from './pages/pharmacy/PharmacyHome'
import { PharmacyProfilePage } from './pages/pharmacy/Profile'
import { Inventory } from './pages/pharmacy/Inventory'
import { PharmacyOrders } from './pages/pharmacy/Orders'
import { AdminHome } from './pages/admin/AdminHome'
import { AdminUsers } from './pages/admin/Users'
import { PendingApprovals } from './pages/admin/PendingApprovals'
import { AdminOrders } from './pages/admin/Orders'
import { AdminAppointments } from './pages/admin/Appointments'
import { NotificationsInbox } from './pages/notifications/NotificationsInbox'

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

        <Route element={<ProtectedRoute />}>
          <Route path="/notifications" element={<NotificationsInbox />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
          <Route path="/patient" element={<PatientHome />} />
          <Route path="/patient/profile" element={<PatientProfilePage />} />
          <Route path="/patient/cart" element={<Cart />} />
          <Route path="/patient/orders" element={<OrderHistory />} />
          <Route path="/patient/orders/:id" element={<OrderDetail />} />
          <Route path="/patient/prescriptions" element={<Prescriptions />} />
          <Route path="/patient/appointments" element={<PatientAppointments />} />
          <Route path="/patient/appointments/:id" element={<PatientAppointmentDetail />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
          <Route path="/doctor" element={<DoctorHome />} />
          <Route path="/doctor/profile" element={<DoctorProfilePage />} />
          <Route path="/doctor/availability" element={<Availability />} />
          <Route path="/doctor/appointments" element={<DoctorAppointments />} />
          <Route path="/doctor/appointments/:id" element={<DoctorAppointmentDetail />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['pharmacy']} />}>
          <Route path="/pharmacy" element={<PharmacyHome />} />
          <Route path="/pharmacy/profile" element={<PharmacyProfilePage />} />
          <Route path="/pharmacy/inventory" element={<Inventory />} />
          <Route path="/pharmacy/orders" element={<PharmacyOrders />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/pending-approvals" element={<PendingApprovals />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/appointments" element={<AdminAppointments />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App

import { AppShell, Burger, Group, NavLink, Text, Button, Badge, Indicator } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { IconLogout, IconShoppingCart } from '@tabler/icons-react'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'

const ROLE_HOME: Record<string, string> = {
  patient: '/patient',
  doctor: '/doctor',
  pharmacy: '/pharmacy',
  admin: '/admin',
}

export function AppShellLayout() {
  const [opened, { toggle }] = useDisclosure()
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text component={Link} to="/" fw={700} size="lg" style={{ textDecoration: 'none', color: 'inherit' }}>
              E-Pharma
            </Text>
          </Group>
          <Group>
            {user?.role === 'patient' && (
              <Indicator label={itemCount} size={16} disabled={itemCount === 0}>
                <Button
                  component={Link}
                  to="/patient/cart"
                  variant="subtle"
                  size="xs"
                  leftSection={<IconShoppingCart size={14} />}
                >
                  Cart
                </Button>
              </Indicator>
            )}
            {user ? (
              <>
                <Badge variant="light">{user.role}</Badge>
                <Text size="sm">{user.email}</Text>
                <Button variant="subtle" size="xs" leftSection={<IconLogout size={14} />} onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button component={Link} to="/login" variant="subtle" size="xs">
                  Log in
                </Button>
                <Button component={Link} to="/register" size="xs">
                  Register
                </Button>
              </>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink component={Link} to="/" label="Home" active={location.pathname === '/'} />
        <NavLink component={Link} to="/medicines" label="Medicines" active={location.pathname === '/medicines'} />
        <NavLink component={Link} to="/doctors" label="Doctors" active={location.pathname.startsWith('/doctors')} />

        {user?.role === 'patient' && (
          <>
            <NavLink
              component={Link}
              to="/patient/profile"
              label="Profile"
              active={location.pathname === '/patient/profile'}
            />
            <NavLink
              component={Link}
              to="/patient/orders"
              label="My Orders"
              active={location.pathname.startsWith('/patient/orders')}
            />
            <NavLink
              component={Link}
              to="/patient/prescriptions"
              label="Prescriptions"
              active={location.pathname === '/patient/prescriptions'}
            />
            <NavLink
              component={Link}
              to="/patient/appointments"
              label="Appointments"
              active={location.pathname.startsWith('/patient/appointments')}
            />
          </>
        )}

        {user?.role === 'doctor' && (
          <>
            <NavLink
              component={Link}
              to="/doctor/profile"
              label="Profile"
              active={location.pathname === '/doctor/profile'}
            />
            <NavLink
              component={Link}
              to="/doctor/availability"
              label="Availability"
              active={location.pathname === '/doctor/availability'}
            />
            <NavLink
              component={Link}
              to="/doctor/appointments"
              label="Appointments"
              active={location.pathname.startsWith('/doctor/appointments')}
            />
          </>
        )}

        {user?.role === 'pharmacy' && (
          <>
            <NavLink
              component={Link}
              to="/pharmacy/profile"
              label="Profile"
              active={location.pathname === '/pharmacy/profile'}
            />
            <NavLink
              component={Link}
              to="/pharmacy/inventory"
              label="Inventory"
              active={location.pathname === '/pharmacy/inventory'}
            />
            <NavLink
              component={Link}
              to="/pharmacy/orders"
              label="Orders"
              active={location.pathname === '/pharmacy/orders'}
            />
          </>
        )}

        {user?.role === 'admin' && (
          <>
            <NavLink
              component={Link}
              to="/admin/users"
              label="Users"
              active={location.pathname === '/admin/users'}
            />
            <NavLink
              component={Link}
              to="/admin/pending-approvals"
              label="Pending Approvals"
              active={location.pathname === '/admin/pending-approvals'}
            />
            <NavLink
              component={Link}
              to="/admin/orders"
              label="Orders"
              active={location.pathname === '/admin/orders'}
            />
            <NavLink
              component={Link}
              to="/admin/appointments"
              label="Appointments"
              active={location.pathname === '/admin/appointments'}
            />
          </>
        )}

        {user && (
          <>
            <NavLink
              component={Link}
              to="/notifications"
              label="Notifications"
              active={location.pathname === '/notifications'}
            />
            <NavLink
              component={Link}
              to={ROLE_HOME[user.role]}
              label="My Dashboard"
              active={location.pathname === ROLE_HOME[user.role]}
            />
          </>
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}

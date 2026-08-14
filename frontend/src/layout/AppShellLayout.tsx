import { AppShell, Burger, Group, NavLink, Text, Button, Badge } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { IconLogout } from '@tabler/icons-react'
import { useAuth } from '../auth/AuthContext'

const ROLE_HOME: Record<string, string> = {
  patient: '/patient',
  doctor: '/doctor',
  pharmacy: '/pharmacy',
  admin: '/admin',
}

export function AppShellLayout() {
  const [opened, { toggle }] = useDisclosure()
  const { user, logout } = useAuth()
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
        {user && (
          <NavLink
            component={Link}
            to={ROLE_HOME[user.role]}
            label="My Dashboard"
            active={location.pathname === ROLE_HOME[user.role]}
          />
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}

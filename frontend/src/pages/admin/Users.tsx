import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Container, Group, Loader, Select, Stack, Table, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { listUsers, updateUserStatus } from '../../api/admin'
import { useAuth } from '../../auth/AuthContext'
import { ApiError } from '../../api/client'
import type { UserRole } from '../../api/types'

export function AdminUsers() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'users', roleFilter],
    queryFn: () => listUsers({ role: (roleFilter as UserRole) || undefined, limit: 100 }),
  })

  async function toggleActive(userId: number, isActive: boolean) {
    setUpdatingId(userId)
    try {
      await updateUserStatus(userId, { is_active: !isActive })
      notifications.show({ color: 'green', message: 'User updated' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Update failed'
      notifications.show({ color: 'red', title: 'Update failed', message })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={2}>Users</Title>

        <Select
          placeholder="Filter by role"
          data={['patient', 'doctor', 'pharmacy', 'admin']}
          value={roleFilter}
          onChange={setRoleFilter}
          clearable
          w={200}
        />

        {isLoading && <Loader />}
        {isError && <Text c="red">Failed to load users.</Text>}

        {data && (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Approved</Table.Th>
                <Table.Th>Active</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>{u.email}</Table.Td>
                  <Table.Td>
                    <Badge variant="light">{u.role}</Badge>
                  </Table.Td>
                  <Table.Td>{u.is_approved ? 'Yes' : 'No'}</Table.Td>
                  <Table.Td>
                    <Badge color={u.is_active ? 'green' : 'red'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
                  </Table.Td>
                  <Table.Td>
                    {u.id !== currentUser?.id && (
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          color={u.is_active ? 'red' : 'green'}
                          loading={updatingId === u.id}
                          onClick={() => toggleActive(u.id, u.is_active)}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </Group>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Container>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Container, Loader, Select, Stack, Table, Text, Title } from '@mantine/core'
import dayjs from 'dayjs'
import { listAllAppointments } from '../../api/admin'
import type { AppointmentStatus } from '../../api/types'

const STATUS_COLOR: Record<string, string> = {
  pending: 'gray',
  confirmed: 'blue',
  rejected: 'red',
  cancelled: 'red',
  completed: 'green',
}

export function AdminAppointments() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'appointments', statusFilter],
    queryFn: () => listAllAppointments({ status: (statusFilter as AppointmentStatus) || undefined, limit: 100 }),
  })

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={2}>Appointments</Title>

        <Select
          placeholder="Filter by status"
          data={['pending', 'confirmed', 'rejected', 'cancelled', 'completed']}
          value={statusFilter}
          onChange={setStatusFilter}
          clearable
          w={220}
        />

        {isLoading && <Loader />}
        {isError && <Text c="red">Failed to load appointments.</Text>}

        {data && (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Appointment</Table.Th>
                <Table.Th>Time</Table.Th>
                <Table.Th>Mode</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((appointment) => (
                <Table.Tr key={appointment.id}>
                  <Table.Td>#{appointment.id}</Table.Td>
                  <Table.Td>{dayjs(appointment.start_time).format('MMM D, YYYY h:mm A')}</Table.Td>
                  <Table.Td>{appointment.consultation_mode}</Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLOR[appointment.status] ?? 'gray'}>{appointment.status}</Badge>
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

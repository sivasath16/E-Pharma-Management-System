import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Container, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { listPendingApprovals } from '../../api/admin'
import { approveDoctor } from '../../api/doctors'
import { approvePharmacy } from '../../api/pharmacies'
import { ApiError } from '../../api/client'
import type { PendingApprovalItem } from '../../api/types'

export function PendingApprovals() {
  const queryClient = useQueryClient()
  const [approvingId, setApprovingId] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'pending-approvals'],
    queryFn: listPendingApprovals,
  })

  async function handleApprove(item: PendingApprovalItem) {
    setApprovingId(item.user_id)
    try {
      if (item.role === 'doctor') {
        await approveDoctor(item.user_id)
      } else {
        await approvePharmacy(item.user_id)
      }
      notifications.show({ color: 'green', message: `${item.name ?? item.email} approved` })
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-approvals'] })
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Approval failed'
      notifications.show({ color: 'red', title: 'Approval failed', message })
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={2}>Pending Approvals</Title>

        {isLoading && <Loader />}
        {isError && <Text c="red">Failed to load pending approvals.</Text>}

        {data && (
          <>
            <Stack gap="xs">
              <Text fw={600}>Doctors</Text>
              {data.doctors.length === 0 && (
                <Text size="sm" c="dimmed">
                  None pending
                </Text>
              )}
              {data.doctors.map((item) => (
                <Card key={item.user_id} withBorder padding="sm">
                  <Group justify="space-between">
                    <Stack gap={0}>
                      <Text fw={500}>{item.name ?? 'Unnamed'}</Text>
                      <Text size="sm" c="dimmed">
                        {item.email}
                      </Text>
                    </Stack>
                    <Button size="xs" loading={approvingId === item.user_id} onClick={() => handleApprove(item)}>
                      Approve
                    </Button>
                  </Group>
                </Card>
              ))}
            </Stack>

            <Stack gap="xs">
              <Text fw={600}>Pharmacies</Text>
              {data.pharmacies.length === 0 && (
                <Text size="sm" c="dimmed">
                  None pending
                </Text>
              )}
              {data.pharmacies.map((item) => (
                <Card key={item.user_id} withBorder padding="sm">
                  <Group justify="space-between">
                    <Stack gap={0}>
                      <Text fw={500}>{item.name ?? 'Unnamed'}</Text>
                      <Text size="sm" c="dimmed">
                        {item.email}
                      </Text>
                    </Stack>
                    <Button size="xs" loading={approvingId === item.user_id} onClick={() => handleApprove(item)}>
                      Approve
                    </Button>
                  </Group>
                </Card>
              ))}
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  )
}

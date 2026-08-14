import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Container, Loader, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { listDoctors } from '../../api/doctors'

export function DoctorDirectory() {
  const [specialization, setSpecialization] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['doctors', specialization],
    queryFn: () => listDoctors({ specialization: specialization || undefined }),
  })

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={2}>Find a Doctor</Title>
        <TextInput
          placeholder="Filter by specialization..."
          leftSection={<IconSearch size={16} />}
          value={specialization}
          onChange={(e) => setSpecialization(e.currentTarget.value)}
        />

        {isLoading && <Loader />}
        {isError && <Text c="red">Failed to load doctors.</Text>}
        {data && data.length === 0 && <Text c="dimmed">No approved doctors found.</Text>}

        {data && data.length > 0 && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            {data.map((doctor) => (
              <Card key={doctor.id} component={Link} to={`/doctors/${doctor.id}`} withBorder padding="md">
                <Stack gap={4}>
                  <Text fw={600}>{doctor.full_name ?? 'Unnamed Doctor'}</Text>
                  {doctor.specialization && (
                    <Text size="sm" c="dimmed">
                      {doctor.specialization}
                    </Text>
                  )}
                  {doctor.qualification && <Text size="xs">{doctor.qualification}</Text>}
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { IconSearch, IconShoppingCartPlus } from '@tabler/icons-react'
import { useSearchParams } from 'react-router-dom'
import { searchMedicines } from '../../api/medicines'
import { useAuth } from '../../auth/AuthContext'
import { useCart } from '../../cart/CartContext'

export function MedicineSearch() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const { user } = useAuth()
  const { addItem } = useCart()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['medicines', query],
    queryFn: () => searchMedicines({ q: query || undefined }),
  })

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={2}>Medicines</Title>
        <TextInput
          placeholder="Search by medicine name..."
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />

        {isLoading && <Loader />}
        {isError && <Text c="red">Failed to load medicines.</Text>}

        {data && data.length === 0 && <Text c="dimmed">No medicines found.</Text>}

        {data && data.length > 0 && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            {data.map((medicine) => (
              <Card key={medicine.id} withBorder padding="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={600}>{medicine.name}</Text>
                    {medicine.requires_prescription && (
                      <Badge color="orange" size="sm">
                        Rx required
                      </Badge>
                    )}
                  </Group>
                  {medicine.category && (
                    <Text size="sm" c="dimmed">
                      {medicine.category}
                    </Text>
                  )}
                  <Group justify="space-between">
                    <Text fw={700}>${medicine.price}</Text>
                    <Text size="sm" c="dimmed">
                      {medicine.pharmacy_name}
                    </Text>
                  </Group>
                  <Text size="xs" c={medicine.stock_quantity > 0 ? 'green' : 'red'}>
                    {medicine.stock_quantity > 0 ? `${medicine.stock_quantity} in stock` : 'Out of stock'}
                  </Text>
                  {user?.role === 'patient' && (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconShoppingCartPlus size={14} />}
                      disabled={medicine.stock_quantity === 0}
                      onClick={() => addItem(medicine)}
                    >
                      Add to Cart
                    </Button>
                  )}
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  )
}

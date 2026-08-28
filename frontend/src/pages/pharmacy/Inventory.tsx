import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Loader,
  NumberInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { getMyProfile } from '../../api/pharmacies'
import { createMedicine, searchMedicines, updateMedicine } from '../../api/medicines'
import { ApiError } from '../../api/client'
import type { Medicine } from '../../api/types'

function EditableRow({ medicine, onSaved }: { medicine: Medicine; onSaved: () => void }) {
  const [price, setPrice] = useState(medicine.price)
  const [stock, setStock] = useState(medicine.stock_quantity)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await updateMedicine(medicine.id, { price, stock_quantity: stock })
      notifications.show({ color: 'green', message: `${medicine.name} updated` })
      onSaved()
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Update failed'
      notifications.show({ color: 'red', title: 'Update failed', message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card withBorder padding="sm">
      <Group justify="space-between">
        <Stack gap={2}>
          <Group gap="xs">
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
        </Stack>
        <Group gap="xs">
          <TextInput label="Price" value={price} onChange={(e) => setPrice(e.currentTarget.value)} w={100} />
          <NumberInput label="Stock" value={stock} min={0} onChange={(v) => setStock(Number(v) || 0)} w={100} />
          <Button size="xs" mt={24} loading={saving} onClick={handleSave}>
            Save
          </Button>
        </Group>
      </Group>
    </Card>
  )
}

export function Inventory() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const profileQuery = useQuery({ queryKey: ['pharmacies', 'me'], queryFn: getMyProfile })
  const pharmacyId = profileQuery.data?.id

  const medicinesQuery = useQuery({
    queryKey: ['medicines', 'pharmacy', pharmacyId],
    queryFn: () => searchMedicines({ pharmacy_id: pharmacyId! }),
    enabled: pharmacyId !== undefined,
  })

  const form = useForm({
    initialValues: { name: '', category: '', description: '', price: '', stock_quantity: 0, requires_prescription: false },
    validate: {
      name: (v) => (v.trim() ? null : 'Name is required'),
      price: (v) => (v.trim() ? null : 'Price is required'),
    },
  })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['medicines', 'pharmacy', pharmacyId] })
  }

  async function handleAdd(values: typeof form.values) {
    setSubmitting(true)
    try {
      await createMedicine({
        name: values.name,
        category: values.category || undefined,
        description: values.description || undefined,
        price: values.price,
        stock_quantity: values.stock_quantity,
        requires_prescription: values.requires_prescription,
      })
      notifications.show({ color: 'green', message: 'Medicine added' })
      form.reset()
      setShowAddForm(false)
      refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Failed to add medicine'
      notifications.show({ color: 'red', title: 'Add failed', message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Inventory</Title>
          <Button variant="light" onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? 'Cancel' : 'Add Medicine'}
          </Button>
        </Group>

        {showAddForm && (
          <Card withBorder padding="lg">
            <form onSubmit={form.onSubmit(handleAdd)}>
              <Stack>
                <TextInput label="Name" {...form.getInputProps('name')} />
                <TextInput label="Category" {...form.getInputProps('category')} />
                <TextInput label="Description" {...form.getInputProps('description')} />
                <TextInput label="Price" {...form.getInputProps('price')} />
                <NumberInput
                  label="Stock quantity"
                  min={0}
                  value={form.values.stock_quantity}
                  onChange={(v) => form.setFieldValue('stock_quantity', Number(v) || 0)}
                />
                <Checkbox
                  label="Requires prescription"
                  checked={form.values.requires_prescription}
                  onChange={(e) => form.setFieldValue('requires_prescription', e.currentTarget.checked)}
                />
                <Button type="submit" loading={submitting}>
                  Add
                </Button>
              </Stack>
            </form>
          </Card>
        )}

        {medicinesQuery.isLoading && <Loader />}
        {medicinesQuery.data && medicinesQuery.data.length === 0 && (
          <Text c="dimmed">No medicines yet — add your first one above.</Text>
        )}

        {medicinesQuery.data?.map((medicine) => (
          <EditableRow key={medicine.id} medicine={medicine} onSaved={refresh} />
        ))}
      </Stack>
    </Container>
  )
}

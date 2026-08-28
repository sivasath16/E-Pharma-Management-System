import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Button,
  Card,
  Container,
  Group,
  NumberInput,
  Radio,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconTrash } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import Decimal from 'decimal.js'
import { useCart } from '../../cart/CartContext'
import { createOrder } from '../../api/orders'
import { listMyPrescriptions } from '../../api/prescriptions'
import { ApiError } from '../../api/client'
import type { FulfillmentType } from '../../api/types'

export function Cart() {
  const cart = useCart()
  const navigate = useNavigate()
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const requiresPrescription = cart.items.some((item) => item.requiresPrescription)

  const prescriptionsQuery = useQuery({
    queryKey: ['prescriptions', 'me'],
    queryFn: listMyPrescriptions,
    enabled: requiresPrescription,
  })

  const total = cart.items
    .reduce((sum, item) => sum.plus(new Decimal(item.price).times(item.quantity)), new Decimal(0))
    .toFixed(2)

  async function handleCheckout() {
    if (cart.pharmacyId === null) return
    if (fulfillmentType === 'delivery' && !deliveryAddress.trim()) {
      notifications.show({ color: 'red', message: 'Delivery address is required for delivery orders' })
      return
    }
    if (requiresPrescription && !prescriptionId) {
      notifications.show({ color: 'red', message: 'A prescription is required for at least one item in your cart' })
      return
    }

    setSubmitting(true)
    try {
      const order = await createOrder({
        pharmacy_id: cart.pharmacyId,
        items: cart.items.map((item) => ({ medicine_id: item.medicineId, quantity: item.quantity })),
        fulfillment_type: fulfillmentType,
        delivery_address: fulfillmentType === 'delivery' ? deliveryAddress : undefined,
        prescription_id: prescriptionId ? Number(prescriptionId) : undefined,
      })
      cart.clear()
      notifications.show({ color: 'green', message: 'Order placed' })
      navigate(`/patient/orders/${order.id}`)
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Failed to place order'
      notifications.show({ color: 'red', title: 'Order failed', message })
    } finally {
      setSubmitting(false)
    }
  }

  if (cart.items.length === 0) {
    return (
      <Container size="sm" py="xl">
        <Title order={2} mb="md">
          Cart
        </Title>
        <Text c="dimmed">Your cart is empty. Add medicines from the Medicines page.</Text>
      </Container>
    )
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={2}>Cart — {cart.pharmacyName}</Title>

        <Stack gap="xs">
          {cart.items.map((item) => (
            <Card key={item.medicineId} withBorder padding="sm">
              <Group justify="space-between">
                <Stack gap={2}>
                  <Text fw={600}>{item.name}</Text>
                  <Text size="sm" c="dimmed">
                    ${item.price} each
                  </Text>
                </Stack>
                <Group gap="xs">
                  <NumberInput
                    value={item.quantity}
                    min={1}
                    w={80}
                    onChange={(value) => cart.updateQuantity(item.medicineId, Number(value) || 1)}
                  />
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() => cart.removeItem(item.medicineId)}
                  >
                    <IconTrash size={16} />
                  </Button>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>

        <Group justify="space-between">
          <Text fw={700}>Total</Text>
          <Text fw={700}>${total}</Text>
        </Group>

        <Radio.Group
          label="Fulfillment"
          value={fulfillmentType}
          onChange={(value) => setFulfillmentType(value as FulfillmentType)}
        >
          <Group mt="xs">
            <Radio value="pickup" label="Pickup" />
            <Radio value="delivery" label="Delivery" />
          </Group>
        </Radio.Group>

        {fulfillmentType === 'delivery' && (
          <Textarea
            label="Delivery address"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.currentTarget.value)}
            required
          />
        )}

        {requiresPrescription && (
          <Select
            label="Prescription (required — cart contains a prescription-only item)"
            placeholder="Select a prescription"
            data={(prescriptionsQuery.data ?? []).map((p) => ({ value: String(p.id), label: p.file_url }))}
            value={prescriptionId}
            onChange={setPrescriptionId}
            required
          />
        )}

        <Button onClick={handleCheckout} loading={submitting}>
          Place Order
        </Button>
      </Stack>
    </Container>
  )
}

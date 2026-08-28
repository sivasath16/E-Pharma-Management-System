import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { notifications } from '@mantine/notifications'
import type { Medicine } from '../api/types'

export interface CartItem {
  medicineId: number
  name: string
  price: string
  quantity: number
  requiresPrescription: boolean
}

interface CartState {
  pharmacyId: number | null
  pharmacyName: string | null
  items: CartItem[]
}

interface CartContextValue extends CartState {
  addItem: (medicine: Medicine) => void
  updateQuantity: (medicineId: number, quantity: number) => void
  removeItem: (medicineId: number) => void
  clear: () => void
  itemCount: number
}

const STORAGE_KEY = 'epharma_cart'
const EMPTY_CART: CartState = { pharmacyId: null, pharmacyName: null, items: [] }

const CartContext = createContext<CartContextValue | undefined>(undefined)

function loadCart(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartState) : EMPTY_CART
  } catch {
    return EMPTY_CART
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(loadCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  }, [cart])

  function addItem(medicine: Medicine) {
    setCart((prev) => {
      if (prev.pharmacyId !== null && prev.pharmacyId !== medicine.pharmacy_id) {
        notifications.show({
          color: 'yellow',
          title: 'Cart cleared',
          message: 'Orders can only include medicines from one pharmacy at a time, so your cart was replaced.',
        })
        return {
          pharmacyId: medicine.pharmacy_id,
          pharmacyName: medicine.pharmacy_name,
          items: [
            {
              medicineId: medicine.id,
              name: medicine.name,
              price: medicine.price,
              quantity: 1,
              requiresPrescription: medicine.requires_prescription,
            },
          ],
        }
      }

      const existing = prev.items.find((item) => item.medicineId === medicine.id)
      const items = existing
        ? prev.items.map((item) =>
            item.medicineId === medicine.id ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [
            ...prev.items,
            {
              medicineId: medicine.id,
              name: medicine.name,
              price: medicine.price,
              quantity: 1,
              requiresPrescription: medicine.requires_prescription,
            },
          ]

      return { pharmacyId: medicine.pharmacy_id, pharmacyName: medicine.pharmacy_name, items }
    })

    notifications.show({ color: 'green', message: `${medicine.name} added to cart` })
  }

  function updateQuantity(medicineId: number, quantity: number) {
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.medicineId === medicineId ? { ...item, quantity } : item)),
    }))
  }

  function removeItem(medicineId: number) {
    setCart((prev) => {
      const items = prev.items.filter((item) => item.medicineId !== medicineId)
      return items.length === 0 ? EMPTY_CART : { ...prev, items }
    })
  }

  function clear() {
    setCart(EMPTY_CART)
  }

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider value={{ ...cart, addItem, updateQuantity, removeItem, clear, itemCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}

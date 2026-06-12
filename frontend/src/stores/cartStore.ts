import { create } from 'zustand'
import { CartItem, MenuItem } from '@/types'

interface CartState {
  items: CartItem[]
  addItem: (menuItem: MenuItem) => void
  removeItem: (id: number) => void
  updateQty: (id: number, qty: number) => void
  clearCart: () => void
  total: () => number
  totalItems: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (menuItem) => set((s) => {
    const ex = s.items.find(i => i.menuItem.id === menuItem.id)
    if (ex) return { items: s.items.map(i => i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i) }
    return { items: [...s.items, { menuItem, quantity: 1 }] }
  }),

  removeItem: (id) => set((s) => ({ items: s.items.filter(i => i.menuItem.id !== id) })),

  updateQty: (id, qty) => set((s) => ({
    items: qty <= 0
      ? s.items.filter(i => i.menuItem.id !== id)
      : s.items.map(i => i.menuItem.id === id ? { ...i, quantity: qty } : i)
  })),

  clearCart: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + Number(i.menuItem.price) * i.quantity, 0),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))

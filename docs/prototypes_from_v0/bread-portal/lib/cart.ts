// Shopping cart management utilities

export interface CartItem {
  breadId: number
  breadName: string
  breadType: string
  baker: string
  priceEur: number
  priceBreadcoin: number
  image: string
  quantity: number
  deliveryAvailable?: boolean
  pickupOnly?: boolean
}

const CART_KEY = "privatebread_cart"

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return []
  const cart = localStorage.getItem(CART_KEY)
  return cart ? JSON.parse(cart) : []
}

export function addToCart(item: Omit<CartItem, "quantity">, quantity = 1): void {
  const cart = getCart()
  const existingItem = cart.find((i) => i.breadId === item.breadId)

  if (existingItem) {
    existingItem.quantity += quantity
  } else {
    cart.push({ ...item, quantity })
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  window.dispatchEvent(new Event("cartUpdated"))
}

export function updateCartItemQuantity(breadId: number, quantity: number): void {
  const cart = getCart()
  const item = cart.find((i) => i.breadId === breadId)

  if (item) {
    if (quantity <= 0) {
      removeFromCart(breadId)
    } else {
      item.quantity = quantity
      localStorage.setItem(CART_KEY, JSON.stringify(cart))
      window.dispatchEvent(new Event("cartUpdated"))
    }
  }
}

export function removeFromCart(breadId: number): void {
  const cart = getCart().filter((item) => item.breadId !== breadId)
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  window.dispatchEvent(new Event("cartUpdated"))
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY)
  window.dispatchEvent(new Event("cartUpdated"))
}

export function getCartTotal(): { totalEur: number; totalBreadcoin: number; itemCount: number } {
  const cart = getCart()
  const totalEur = cart.reduce((sum, item) => sum + item.priceEur * item.quantity, 0)
  const totalBreadcoin = cart.reduce((sum, item) => sum + item.priceBreadcoin * item.quantity, 0)
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return { totalEur, totalBreadcoin, itemCount }
}

// Order management utilities

export interface Order {
  id: string
  userId: string
  breadName: string
  breadType: string
  baker: string
  quantity: number
  priceEur: number
  priceBreadcoin: number
  date: string
  status: "pending" | "completed" | "cancelled"
  image: string
}

const ORDERS_KEY = "privatebread_orders"

export function getOrders(): Order[] {
  if (typeof window === "undefined") return []
  const orders = localStorage.getItem(ORDERS_KEY)
  return orders ? JSON.parse(orders) : []
}

export function getUserOrders(userId: string): Order[] {
  return getOrders().filter((order) => order.userId === userId)
}

export function addOrder(order: Omit<Order, "id" | "date" | "status">): Order {
  const orders = getOrders()
  const newOrder: Order = {
    ...order,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    status: "completed",
  }
  orders.push(newOrder)
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
  return newOrder
}

// Mock function to create sample orders for testing
export function createSampleOrders(userId: string) {
  const sampleOrders: Omit<Order, "id" | "date" | "status">[] = [
    {
      userId,
      breadName: "Rustikales Sauerteigbrot",
      breadType: "Sauerteig",
      baker: "Maria Schmidt",
      quantity: 2,
      priceEur: 5.5,
      priceBreadcoin: 0.125,
      image: "/bread-sourdough.jpg",
    },
    {
      userId,
      breadName: "Bio-Vollkornbrot",
      breadType: "Vollkorn",
      baker: "Thomas Weber",
      quantity: 1,
      priceEur: 4.5,
      priceBreadcoin: 0.102,
      image: "/bread-wheat.jpg",
    },
    {
      userId,
      breadName: "Französisches Baguette",
      breadType: "Weißbrot",
      baker: "Sophie Dubois",
      quantity: 3,
      priceEur: 2.5,
      priceBreadcoin: 0.057,
      image: "/bread-baguette.jpg",
    },
  ]

  sampleOrders.forEach((order) => addOrder(order))
}

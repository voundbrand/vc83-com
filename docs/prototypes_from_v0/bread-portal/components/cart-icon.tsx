"use client"

import { useEffect, useState } from "react"
import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getCartTotal } from "@/lib/cart"
import Link from "next/link"

export function CartIcon() {
  const [itemCount, setItemCount] = useState(0)

  useEffect(() => {
    const updateCount = () => {
      const { itemCount } = getCartTotal()
      setItemCount(itemCount)
    }

    updateCount()
    window.addEventListener("cartUpdated", updateCount)
    return () => window.removeEventListener("cartUpdated", updateCount)
  }, [])

  return (
    <Button variant="outline" size="icon" className="relative bg-transparent" asChild>
      <Link href="/warenkorb">
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1 text-xs">{itemCount}</Badge>
        )}
      </Link>
    </Button>
  )
}

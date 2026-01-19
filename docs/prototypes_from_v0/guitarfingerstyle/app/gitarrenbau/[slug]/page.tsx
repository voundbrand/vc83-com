import GuitarDetailPageClient from "./page.client.tsx"
import { guitarData } from "@/lib/data"

export function generateStaticParams() {
  return guitarData.map((guitar) => ({
    slug: guitar.slug,
  }))
}

export default function GuitarDetailPage({ params }: { params: { slug: string } }) {
  const guitar = guitarData.find((g) => g.slug === params.slug)

  if (!guitar) {
    return null
  }

  return <GuitarDetailPageClient guitar={guitar} />
}

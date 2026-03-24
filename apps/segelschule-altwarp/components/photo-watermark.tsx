import Image from "next/image"

interface PhotoWatermarkProps {
  /** sm: gallery tiles, md: about/medium images, lg: hero/full-width */
  size?: "sm" | "md" | "lg"
}

const sizes = {
  sm: { w: "w-[28px] md:w-[36px]", px: 60, offset: "bottom-1.5 right-1.5 md:bottom-2 md:right-2" },
  md: { w: "w-[50px] md:w-[70px]", px: 100, offset: "bottom-3 right-3 md:bottom-4 md:right-4" },
  lg: { w: "w-[120px] md:w-[160px]", px: 200, offset: "bottom-12 right-8 md:bottom-16 md:right-12" },
}

export function PhotoWatermark({ size = "md" }: PhotoWatermarkProps) {
  const s = sizes[size]
  return (
    <div className={`absolute ${s.offset} pointer-events-none z-[2]`}>
      <Image
        src="/logo-white.png"
        alt=""
        width={s.px}
        height={s.px}
        className={`${s.w} h-auto opacity-[0.30]`}
        aria-hidden="true"
      />
    </div>
  )
}

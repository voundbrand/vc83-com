interface WaveDividerProps {
  /** The color of the wave (fills the wave shape) */
  fillColor: string
  /** The background color behind the wave */
  bgColor?: string
  /** Flip vertically to create bottom-of-section waves */
  flip?: boolean
}

export function WaveDivider({ fillColor, bgColor = "transparent", flip = false }: WaveDividerProps) {
  return (
    <div
      className={`w-full overflow-hidden leading-[0] ${flip ? "rotate-180" : ""}`}
      style={{ backgroundColor: bgColor }}
    >
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="w-full h-[60px] md:h-[80px]"
      >
        <path
          d="M0,0 C150,90 350,0 500,60 C650,120 800,30 1000,80 C1100,100 1150,60 1200,40 L1200,120 L0,120 Z"
          fill={fillColor}
        />
      </svg>
    </div>
  )
}

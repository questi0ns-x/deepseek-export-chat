import { useRef } from 'react'
import { FileText, Link2 } from 'lucide-react'
import { AnimatedBeam } from '@/components/ui/animated-beam'

function Node({ ref, label, children }: { ref: React.Ref<HTMLDivElement>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={ref}
        className="z-10 flex size-12 items-center justify-center rounded-xl border border-line bg-raise shadow-[0_8px_24px_-8px_rgb(0_0_0/0.7)]"
      >
        {children}
      </div>
      <span className="text-xs text-fog">{label}</span>
    </div>
  )
}

export function RelayBeam() {
  const box = useRef<HTMLDivElement>(null)
  const a = useRef<HTMLDivElement>(null)
  const b = useRef<HTMLDivElement>(null)
  const c = useRef<HTMLDivElement>(null)
  return (
    <div ref={box} className="relative flex w-full items-start justify-between px-2" aria-hidden="true">
      <Node ref={a} label="Chat lleno">
        <Link2 size={20} className="text-amber" />
      </Node>
      <Node ref={b} label="Retomar">
        <span className="size-3 rounded-full bg-ds shadow-[0_0_18px_4px_rgb(77_107_254/0.55)]" />
      </Node>
      <Node ref={c} label="Sesión nueva">
        <FileText size={20} className="text-ds-soft" />
      </Node>
      <AnimatedBeam containerRef={box} fromRef={a} toRef={b} duration={3} gradientStartColor="#ffb547" gradientStopColor="#4d6bfe" pathColor="#232838" pathOpacity={1} startYOffset={-12} endYOffset={-12} />
      <AnimatedBeam containerRef={box} fromRef={b} toRef={c} duration={3} delay={1.2} gradientStartColor="#4d6bfe" gradientStopColor="#9db0ff" pathColor="#232838" pathOpacity={1} startYOffset={-12} endYOffset={-12} />
    </div>
  )
}

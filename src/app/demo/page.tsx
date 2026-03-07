import { LiquidButton } from "@/components/ui/liquid-glass-button";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans">
      <h1 className="text-2xl font-bold mb-8 text-foreground">Liquid Glass Button Demo</h1>
      <div className="relative h-50 w-200 border border-border rounded-xl bg-zinc-950/5 isolate overflow-hidden dark:bg-zinc-950/50"> 
        <div className="absolute inset-0 bg-linear-to-br from-cyan-500/20 to-emerald-500/20 -z-10" />
        <LiquidButton className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2" size="xxl">
          Liquid Glass
        </LiquidButton> 
      </div>
    </div>
  )
}

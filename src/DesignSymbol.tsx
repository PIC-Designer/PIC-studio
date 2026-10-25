import type { Design } from './types'

const CYAN = '#49dacc'

function portPositions(count: number) {
  if (count <= 1) return [45]
  return Array.from({ length: count }, (_, index) => 22 + index * 46 / (count - 1))
}

function MmiSymbol({ name }: { name: string }) {
  const match = name.match(/(?:^|_)(\d+)x(\d+)(?:_|$)/i)
  const inputs = Math.min(Number(match?.[1] ?? 1), 8)
  const outputs = Math.min(Number(match?.[2] ?? 2), 8)
  return <>
    <rect x="82" y="17" width="76" height="56" rx="3" fill={CYAN} fillOpacity=".16" />
    <rect x="82" y="17" width="76" height="56" rx="3" />
    {portPositions(inputs).map((y, index) => <line key={`i-${index}`} x1="30" y1={y} x2="82" y2={y} />)}
    {portPositions(outputs).map((y, index) => <line key={`o-${index}`} x1="158" y1={y} x2="210" y2={y} />)}
  </>
}

function SymbolContent({ design }: { design: Design }) {
  const type = design.deviceType.toLowerCase()
  const name = design.name.toLowerCase()

  if (type.includes('mmi')) return <MmiSymbol name={design.name} />
  if (type.includes('grating')) return <>
    <path d="M25 45H82L126 24V66L82 45" fill={CYAN} fillOpacity=".12" />
    <path d="M25 45H82L126 24M82 45L126 66" />
    {[0, 1, 2, 3].map((index) => <path key={index} d={`M${142 + index * 14} ${26 - index * 3} Q${158 + index * 14} 45 ${142 + index * 14} ${64 + index * 3}`} />)}
  </>
  if (type.includes('edge coupler') || type.includes('mode converter') || name.includes('taper')) return <>
    <path d="M25 45H65L164 26V64L65 45H215" fill={CYAN} fillOpacity=".11" />
    <path d="M25 45H65L164 26V64L65 45H215" />
  </>
  if (type.includes('y splitter') || type.includes('polarisation')) return <>
    <path d="M25 45H90C116 45 125 27 155 27H215" />
    <path d="M90 45C116 45 125 63 155 63H215" />
  </>
  if (type.includes('crossing')) return <><path d="M25 45H215M120 8V82" /><circle cx="120" cy="45" r="7" fill={CYAN} fillOpacity=".18" /></>
  if (type.includes('bend')) return <path d="M25 65H135Q190 65 190 12" />
  if (type.includes('waveguide')) return <path d="M25 45H215" />
  if (type.includes('mzi')) return <>
    <path d="M25 45H62C82 45 84 20 108 20H150C174 20 176 45 198 45H215" />
    <path d="M62 45C82 45 84 70 108 70H150C174 70 176 45 198 45" />
  </>
  if (type.includes('heater')) return <>
    <path d="M20 45H220" /><path d="M55 28H185M55 62H185" strokeWidth="7" />
    <path d="M76 28V13M164 62V77" /><circle cx="76" cy="10" r="4" /><circle cx="164" cy="80" r="4" />
  </>
  if (type.includes('photodetector')) return <>
    <path d="M25 45H95" /><rect x="95" y="24" width="70" height="42" rx="4" fill={CYAN} fillOpacity=".13" />
    <rect x="95" y="24" width="70" height="42" rx="4" /><path d="M165 45H215M118 14V24M142 14V24" />
  </>
  if (type.includes('interlayer')) return <>
    <path d="M25 33H90C116 33 125 57 153 57H215" /><path d="M25 57H90C116 57 125 33 153 33H215" opacity=".42" />
  </>
  if (type.includes('institution') || type.includes('packaging')) return <>
    <rect x="55" y="12" width="130" height="66" rx="4" fill={CYAN} fillOpacity=".08" /><rect x="55" y="12" width="130" height="66" rx="4" />
    <path d="M25 30H55M25 60H55M185 30H215M185 60H215M82 32H158M82 45H145M82 58H166" />
  </>
  return <><path d="M25 45H82M158 45H215" /><rect x="82" y="22" width="76" height="46" rx="4" fill={CYAN} fillOpacity=".1" /><rect x="82" y="22" width="76" height="46" rx="4" /></>
}

export function DesignSymbol({ design }: { design: Design }) {
  return <svg className="design-symbol" viewBox="0 0 240 90" focusable="false">
    <g fill="none" stroke={CYAN} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><SymbolContent design={design} /></g>
  </svg>
}

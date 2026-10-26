import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowUpRight, Braces, CheckCircle2, ChevronRight, CircuitBoard, Copy, Cpu,
  BookOpen, FlaskConical, GitBranch, Grid2X2, Layers3, Menu, Search, SlidersHorizontal,
  RefreshCw, Sparkles, Waves, X,
} from 'lucide-react'
import type { Catalog, Design } from './types'
import { DesignSymbol } from './DesignSymbol'
import { ChipLibrary } from './ChipLibrary'
import uidCodebook from '../data/design_uid_codebook.json'

const REPO = 'https://github.com/PIC-Designer/PIC_library'
const SYNC_WORKFLOW = 'https://github.com/PIC-Designer/PIC-studio/actions/workflows/deploy.yml'

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

function prettify(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function previewUrl(design: Design) {
  const filename = `${design.id.replace(/[^A-Za-z0-9_.-]+/g, '-')}.webp`
  return `${import.meta.env.BASE_URL}previews/${filename}`
}

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All {label}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}

function StatCard({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: string | number; note: string; tone: string }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{note}</span>
      </div>
    </article>
  )
}

const CHART_COLORS = ['#3fe0d0', '#669cff', '#b29afa', '#f2bd69', '#67e69e', '#f27da7', '#58c4f6', '#ff8d67', '#a6d66d', '#c58cff', '#48b8a7', '#d7a95b', '#7891a7', '#e17272', '#74a7c4', '#9aafc3']

function polarPoint(angle: number, radius = 43) {
  const radians = (angle - 90) * Math.PI / 180
  return { x: 50 + radius * Math.cos(radians), y: 50 + radius * Math.sin(radians) }
}

function slicePath(startAngle: number, endAngle: number) {
  const start = polarPoint(startAngle)
  const end = polarPoint(endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M 50 50 L ${start.x} ${start.y} A 43 43 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

function DeviceMixChart({ data, groupBy, context }: { data: Array<{ label: string; count: number }>; groupBy: 'device' | 'platform'; context: string }) {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  const slices = data.map((item, index) => {
    const preceding = data.slice(0, index).reduce((sum, entry) => sum + entry.count, 0)
    const start = total ? preceding / total * 360 : 0
    const end = total ? (preceding + item.count) / total * 360 : 0
    return { ...item, start, end, color: CHART_COLORS[index % CHART_COLORS.length] }
  })

  return (
    <figure className="hero-chart" aria-label={`${groupBy === 'device' ? 'Device type' : 'Platform'} distribution for ${context}`}>
      <div className="chart-heading">
        <strong>{groupBy === 'device' ? 'Device mix' : 'Platform mix'}</strong>
        <span>{context}</span>
      </div>
      <div className="chart-body">
        <div className="pie-wrap">
          <svg className="pie-chart" viewBox="0 0 100 100" role="img">
            {slices.length === 1 ? (
              <circle cx="50" cy="50" r="43" fill={slices[0].color}><title>{`${slices[0].label}: ${slices[0].count}`}</title></circle>
            ) : slices.map((slice) => (
              <path key={slice.label} d={slicePath(slice.start, slice.end)} fill={slice.color}>
                <title>{`${slice.label}: ${slice.count}`}</title>
              </path>
            ))}
          </svg>
          <div className="pie-total"><strong>{total}</strong><span>designs</span></div>
        </div>
        <div className="pie-legend">
          {slices.map((slice) => (
            <div key={slice.label} title={`${slice.label}: ${slice.count}`}>
              <i style={{ background: slice.color }} />
              <span>{slice.label}</span>
              <strong>{slice.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </figure>
  )
}

function DesignGlyph({ design }: { design: Design }) {
  return (
    <div className="design-glyph" aria-hidden="true">
      <DesignSymbol design={design} />
      <span>{design.platform}</span>
    </div>
  )
}

function DesignCard({ design, onOpen }: { design: Design; onOpen: () => void }) {
  const copyUid = (event: React.MouseEvent) => {
    event.stopPropagation()
    void navigator.clipboard.writeText(design.uid)
  }
  return (
    <article className="design-card" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen() }
    }}>
      <DesignGlyph design={design} />
      <div className="design-card-body">
        <div className="card-topline">
          <span className={`status ${design.status}`}>{design.status === 'released' ? 'Cornerstone' : 'Developing'}</span>
          <span className="version">v{design.version}</span>
        </div>
        <h3>{design.name}</h3>
        <p className="function-name"><code>{`<${design.uid}>`}</code><button className="uid-copy" title="Copy UID" aria-label={`Copy UID ${design.uid}`} onClick={copyUid}><Copy size={13} /></button><span>· {prettify(design.deviceType)}</span></p>
        <div className="chips">
          <span>{design.wavelength}</span><span>{design.mode}</span><span>{design.crossSection}</span>
        </div>
        <div className="card-footer">
          <span>{design.parameters.length} parameters</span>
          <span>Inspect <ChevronRight size={15} /></span>
        </div>
      </div>
    </article>
  )
}

function DetailDrawer({ design, onClose }: { design: Design; onClose: () => void }) {
  const [previewUnavailable, setPreviewUnavailable] = useState(false)
  const importPath = design.source.replace(/^pdk\//, 'pdk.').replace(/\.py$/, '').replaceAll('/', '.')
  const code = `from ${importPath} import ${design.function}\n\ncomponent = ${design.function}()\ncomponent.show()`
  return (
    <div className="drawer-scrim" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <div className="drawer-heading">
          <span className={`status ${design.status}`}>{design.status}</span>
          <p>{design.platform} / {design.deviceType}</p>
          <h2>{prettify(design.name)}</h2>
        </div>
        <div className="detail-metrics">
          <div><span>Wavelength</span><strong>{design.wavelength}</strong></div>
          <div><span>Mode</span><strong>{design.mode}</strong></div>
          <div><span>Cross-section</span><strong>{design.crossSection}</strong></div>
          <div><span>Version</span><strong>{design.version}</strong></div>
        </div>
        <section className="layout-preview">
          <div className="section-title"><h3>Layout preview</h3><span>Default parameters</span></div>
          {previewUnavailable ? (
            <div className="preview-unavailable"><CircuitBoard size={28} /><strong>Preview unavailable</strong><span>This component could not be rendered with default parameters.</span></div>
          ) : (
            <img src={previewUrl(design)} alt={`${prettify(design.name)} layout`} onError={() => setPreviewUnavailable(true)} />
          )}
        </section>
        <section className="drawer-section">
          <div className="section-title"><h3>Function parameters</h3><span>{design.parameters.length}</span></div>
          {design.parameters.length ? (
            <div className="parameter-list">
              {design.parameters.map((parameter) => (
                <div className="parameter" key={parameter.name}>
                  <code>{parameter.name}</code>
                  <span>{parameter.annotation || 'Any'}</span>
                  <strong>{parameter.default ?? (parameter.required ? 'required' : '—')}</strong>
                </div>
              ))}
            </div>
          ) : <p className="muted">This component uses its library defaults.</p>}
        </section>
        <section className="drawer-section">
          <div className="section-title"><h3>Quick start</h3><Braces size={18} /></div>
          <pre><code>{code}</code></pre>
        </section>
        <a className="github-link" href={`${REPO}/blob/main/${design.source}#L${design.line}`} target="_blank" rel="noreferrer">
          <GitBranch size={18} /> Open source on GitHub <ArrowUpRight size={16} />
        </a>
      </aside>
    </div>
  )
}

const CODEBOOK_LABELS: Record<string, string> = {
  platform: 'Platform', wavelength: 'Wavelength', mode: 'Mode', prefix1: 'Prefix 1',
  prefix2: 'Prefix 2', prefix3: 'Prefix 3', component: 'Component type',
  suffix1: 'Suffix 1', suffix2: 'Suffix 2', suffix3: 'Suffix 3', version: 'Version',
}

function CodebookModal({ onClose }: { onClose: () => void }) {
  const fields = Object.entries(uidCodebook.fields) as Array<[string, string[]]>
  return (
    <div className="codebook-scrim" onMouseDown={onClose}>
      <section className="codebook-modal" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label="Design UID codebook">
        <button className="drawer-close" onClick={onClose} aria-label="Close UID codebook"><X size={20} /></button>
        <span className="eyebrow">{uidCodebook.scheme}</span>
        <h2>UID codebook</h2>
        <p>Read-only numeric assignments used by the reversible 13-character Design UID. All values are matched case-insensitively.</p>
        <div className="codebook-fields">
          {fields.map(([name, values]) => (
            <section className={`codebook-field ${name === 'component' ? 'wide' : ''}`} key={name}>
              <header><strong>{CODEBOOK_LABELS[name] ?? name}</strong><span>{Math.max(0, values.length - 1)} values</span></header>
              <div className="codebook-rows">
                {values.map((value, index) => <div key={`${index}-${value}`}><code>{index}</code><span>{value || 'Empty'}</span></div>)}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}

export default function App() {
  const [workspace, setWorkspace] = useState<'designs' | 'chips'>('designs')
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('')
  const [wavelength, setWavelength] = useState('')
  const [mode, setMode] = useState('')
  const [deviceType, setDeviceType] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Design | null>(null)
  const [codebookOpen, setCodebookOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [visibility, setVisibility] = useState({ filterKey: '', count: 36 })

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}catalog.json`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then(setCatalog)
      .catch((reason) => setError(String(reason)))
  }, [])

  const designs = useMemo(() => catalog?.designs ?? [], [catalog])
  const filterKey = [query, platform, wavelength, mode, deviceType, status].join('\u0000')
  const visibleCount = visibility.filterKey === filterKey ? visibility.count : 36
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return designs.filter((design) =>
      (!term || [design.uid, design.name, design.platform, design.deviceType, ...design.variant].join(' ').toLowerCase().includes(term)) &&
      (!platform || design.platform === platform) && (!wavelength || design.wavelength === wavelength) &&
      (!mode || design.mode === mode) && (!deviceType || design.deviceType === deviceType) &&
      (!status || design.status === status),
    )
  }, [designs, query, platform, wavelength, mode, deviceType, status])
  const chartData = useMemo(() => {
    const counts = new Map<string, number>()
    const chartDesigns = deviceType ? designs.filter((design) => {
      const term = query.trim().toLowerCase()
      return (!term || [design.uid, design.name, design.platform, design.deviceType, ...design.variant].join(' ').toLowerCase().includes(term)) &&
        (!wavelength || design.wavelength === wavelength) && (!mode || design.mode === mode) &&
        design.deviceType === deviceType && (!status || design.status === status)
    }) : filtered
    for (const design of chartDesigns) {
      const label = deviceType ? design.platform : design.deviceType
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  }, [designs, filtered, query, wavelength, mode, deviceType, status])
  const chartContext = deviceType
    ? [deviceType, wavelength, mode].filter(Boolean).join(' · ')
    : [platform || 'All platforms', wavelength, mode].filter(Boolean).join(' · ')

  const released = designs.filter((design) => design.status === 'released').length
  const developing = designs.length - released
  const filtersActive = [query, platform, wavelength, mode, deviceType, status].filter(Boolean).length
  const clearFilters = () => { setQuery(''); setPlatform(''); setWavelength(''); setMode(''); setDeviceType(''); setStatus('') }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Waves size={23} /></div><div><strong>PIC Studio</strong><span>Design intelligence</span></div></div>
        <nav>
          <p>Workspace</p>
          <button className={workspace === 'designs' ? 'active' : ''} onClick={() => { setWorkspace('designs'); setSidebarOpen(false) }}><Grid2X2 size={18} /> Design library</button>
          <button className={workspace === 'chips' ? 'active' : ''} onClick={() => { setWorkspace('chips'); setSidebarOpen(false) }}><Cpu size={18} /> Chip library</button>
          <a href="#overview"><Activity size={18} /> Overview</a>
          <a href="#generator"><Braces size={18} /> Code generator <em>Soon</em></a>
          <p>Collections</p>
          <button onClick={() => { setWorkspace('designs'); setStatus('released') }}><CheckCircle2 size={18} /> Cornerstone <span>{released}</span></button>
          <button onClick={() => { setWorkspace('designs'); setStatus('developing') }}><FlaskConical size={18} /> Developing <span>{developing}</span></button>
          <p>Source</p>
          <a href={REPO} target="_blank" rel="noreferrer"><GitBranch size={18} /> PIC_library <ArrowUpRight size={14} /></a>
        </nav>
        <div className="sync-card"><Sparkles size={18} /><div><strong>Library connected</strong><span>{catalog ? `${catalog.count} designs indexed` : 'Loading catalogue…'}</span><a href={SYNC_WORKFLOW} target="_blank" rel="noreferrer" title="Authorized members can run the catalogue sync workflow on GitHub"><RefreshCw size={13} /> Sync libraries</a></div></div>
      </aside>

      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu /></button>
          <div><span className="eyebrow">PIC-DESIGNER / DESIGN SYSTEM</span><h1>{workspace === 'designs' ? 'Design Library' : 'Chip Library'}</h1></div>
          <div className="topbar-actions">
            {workspace === 'designs' && <button className="codebook-button" onClick={() => setCodebookOpen(true)}><BookOpen size={17} /> UID codebook</button>}
            <a className="repo-button" href={REPO} target="_blank" rel="noreferrer"><GitBranch size={17} /> View repository</a>
          </div>
        </header>

        {workspace === 'chips' ? <ChipLibrary /> : <section className="content" id="library">
          <div className="hero">
            <div><span className="eyebrow">ONE LIBRARY. EVERY PLATFORM.</span><h2>Explore photonic designs<br />with engineering context.</h2><p>Browse validated and developing components from the PIC_library PDK. Filter by platform, wavelength, mode and device family.</p></div>
            <DeviceMixChart data={chartData} groupBy={deviceType ? 'platform' : 'device'} context={chartContext} />
          </div>

          <div className="stats" id="overview">
            <StatCard icon={<CircuitBoard />} label="Indexed designs" value={catalog?.count ?? '—'} note="Python component definitions" tone="cyan" />
            <StatCard icon={<Layers3 />} label="Platforms" value={unique(designs.map((d) => d.platform)).length || '—'} note="Material stacks and thicknesses" tone="violet" />
            <StatCard icon={<CheckCircle2 />} label="Cornerstone" value={released || '—'} note="Released library components" tone="green" />
            <StatCard icon={<FlaskConical />} label="Developing" value={developing || '—'} note="Designs under development" tone="amber" />
          </div>

          <section className="library-panel">
            <div className="search-row">
              <label className="search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search UID, component, platform or variant…" /></label>
              <button className="filter-count"><SlidersHorizontal size={17} /> Filters {filtersActive > 0 && <span>{filtersActive}</span>}</button>
            </div>
            <div className="filter-row">
              <SelectFilter label="Platform" value={platform} options={unique(designs.map((d) => d.platform))} onChange={setPlatform} />
              <SelectFilter label="Wavelength" value={wavelength} options={unique(designs.map((d) => d.wavelength))} onChange={setWavelength} />
              <SelectFilter label="Mode" value={mode} options={unique(designs.map((d) => d.mode))} onChange={setMode} />
              <SelectFilter label="Device" value={deviceType} options={unique(designs.map((d) => d.deviceType))} onChange={setDeviceType} />
              <SelectFilter label="Status" value={status} options={['released', 'developing']} onChange={setStatus} />
            </div>
            <div className="results-heading"><div><strong>{filtered.length}</strong><span> designs found</span></div>{filtersActive > 0 && <button onClick={clearFilters}>Clear all <X size={14} /></button>}</div>
            {error ? <div className="empty">Catalogue could not be loaded: {error}</div> : filtered.length ? (
              <>
                <div className="design-grid">{filtered.slice(0, visibleCount).map((design) => <DesignCard key={design.id} design={design} onOpen={() => setSelected(design)} />)}</div>
                {visibleCount < filtered.length && <button className="load-more" onClick={() => setVisibility({ filterKey, count: visibleCount + 36 })}>Load 36 more <span>{filtered.length - visibleCount} remaining</span></button>}
              </>
            ) : <div className="empty"><Search size={30} /><strong>No matching designs</strong><span>Try removing one or more filters.</span></div>}
          </section>
        </section>}
      </main>
      {selected && <DetailDrawer design={selected} onClose={() => setSelected(null)} />}
      {codebookOpen && <CodebookModal onClose={() => setCodebookOpen(false)} />}
    </div>
  )
}

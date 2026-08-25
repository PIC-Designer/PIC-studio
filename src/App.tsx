import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowUpRight, Braces, CheckCircle2, ChevronRight, CircuitBoard,
  FlaskConical, GitBranch, Grid2X2, Layers3, Menu, Search, SlidersHorizontal,
  Sparkles, Waves, X,
} from 'lucide-react'
import type { Catalog, Design } from './types'

const REPO = 'https://github.com/PIC-Designer/PIC_library'

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

function prettify(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
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

function DesignGlyph({ design }: { design: Design }) {
  const type = design.deviceType.toLowerCase()
  return (
    <div className="design-glyph" aria-hidden="true">
      <div className={`glyph-art ${type.includes('coupler') ? 'coupler' : type.includes('mmi') ? 'mmi' : type.includes('ring') ? 'ring' : type.includes('waveguide') ? 'waveguide' : 'generic'}`}>
        <i /><i /><i />
      </div>
      <span>{design.platform}</span>
    </div>
  )
}

function DesignCard({ design, onOpen }: { design: Design; onOpen: () => void }) {
  return (
    <button className="design-card" onClick={onOpen}>
      <DesignGlyph design={design} />
      <div className="design-card-body">
        <div className="card-topline">
          <span className={`status ${design.status}`}>{design.status === 'released' ? 'Cornerstone' : 'Developing'}</span>
          <span className="version">v{design.version}</span>
        </div>
        <h3>{prettify(design.deviceType)}</h3>
        <p className="function-name">{design.name}</p>
        <div className="chips">
          <span>{design.wavelength}</span><span>{design.mode}</span><span>{design.crossSection}</span>
        </div>
        <div className="card-footer">
          <span>{design.parameters.length} parameters</span>
          <span>Inspect <ChevronRight size={15} /></span>
        </div>
      </div>
    </button>
  )
}

function DetailDrawer({ design, onClose }: { design: Design; onClose: () => void }) {
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

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('')
  const [wavelength, setWavelength] = useState('')
  const [mode, setMode] = useState('')
  const [deviceType, setDeviceType] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Design | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(36)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}catalog.json`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then(setCatalog)
      .catch((reason) => setError(String(reason)))
  }, [])

  const designs = catalog?.designs ?? []
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return designs.filter((design) =>
      (!term || [design.name, design.platform, design.deviceType, ...design.variant].join(' ').toLowerCase().includes(term)) &&
      (!platform || design.platform === platform) && (!wavelength || design.wavelength === wavelength) &&
      (!mode || design.mode === mode) && (!deviceType || design.deviceType === deviceType) &&
      (!status || design.status === status),
    )
  }, [designs, query, platform, wavelength, mode, deviceType, status])

  const released = designs.filter((design) => design.status === 'released').length
  const developing = designs.length - released
  const filtersActive = [query, platform, wavelength, mode, deviceType, status].filter(Boolean).length
  const clearFilters = () => { setQuery(''); setPlatform(''); setWavelength(''); setMode(''); setDeviceType(''); setStatus('') }

  useEffect(() => setVisibleCount(36), [query, platform, wavelength, mode, deviceType, status])

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Waves size={23} /></div><div><strong>PIC Studio</strong><span>Design intelligence</span></div></div>
        <nav>
          <p>Workspace</p>
          <a className="active" href="#library"><Grid2X2 size={18} /> Design library</a>
          <a href="#overview"><Activity size={18} /> Overview</a>
          <a href="#generator"><Braces size={18} /> Code generator <em>Soon</em></a>
          <p>Collections</p>
          <button onClick={() => setStatus('released')}><CheckCircle2 size={18} /> Cornerstone <span>{released}</span></button>
          <button onClick={() => setStatus('developing')}><FlaskConical size={18} /> Developing <span>{developing}</span></button>
          <p>Source</p>
          <a href={REPO} target="_blank" rel="noreferrer"><GitBranch size={18} /> PIC_library <ArrowUpRight size={14} /></a>
        </nav>
        <div className="sync-card"><Sparkles size={18} /><div><strong>Library connected</strong><span>{catalog ? `${catalog.count} designs indexed` : 'Loading catalogue…'}</span></div></div>
      </aside>

      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu /></button>
          <div><span className="eyebrow">PIC-DESIGNER / DESIGN SYSTEM</span><h1>Design Library</h1></div>
          <a className="repo-button" href={REPO} target="_blank" rel="noreferrer"><GitBranch size={17} /> View repository</a>
        </header>

        <section className="content" id="library">
          <div className="hero">
            <div><span className="eyebrow">ONE LIBRARY. EVERY PLATFORM.</span><h2>Explore photonic designs<br />with engineering context.</h2><p>Browse validated and developing components from the PIC_library PDK. Filter by platform, wavelength, mode and device family.</p></div>
            <div className="hero-orbit"><CircuitBoard size={60} /><i /><i /><i /></div>
          </div>

          <div className="stats" id="overview">
            <StatCard icon={<CircuitBoard />} label="Indexed designs" value={catalog?.count ?? '—'} note="Python component definitions" tone="cyan" />
            <StatCard icon={<Layers3 />} label="Platforms" value={unique(designs.map((d) => d.platform)).length || '—'} note="Material stacks and thicknesses" tone="violet" />
            <StatCard icon={<CheckCircle2 />} label="Cornerstone" value={released || '—'} note="Released library components" tone="green" />
            <StatCard icon={<FlaskConical />} label="Developing" value={developing || '—'} note="Designs under development" tone="amber" />
          </div>

          <section className="library-panel">
            <div className="search-row">
              <label className="search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search component, platform or variant…" /></label>
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
                {visibleCount < filtered.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + 36)}>Load 36 more <span>{filtered.length - visibleCount} remaining</span></button>}
              </>
            ) : <div className="empty"><Search size={30} /><strong>No matching designs</strong><span>Try removing one or more filters.</span></div>}
          </section>
        </section>
      </main>
      {selected && <DetailDrawer design={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

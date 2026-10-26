import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, Copy, Cpu, Fingerprint, GitFork, Search, X } from 'lucide-react'

type ChipRecord = {
  uid: string
  uidStatus?: 'generated' | 'placeholder'
  platform: string
  ioType: string
  wavelengths: string[]
  chipType: string
  main: string
  name: string
  createdDate: string
  lastUpdated: string
  currentRevision: string
  parentUid: string
  parentRevision: string
  description: string
  status: 'Active' | 'Draft' | 'Archived' | 'Imported' | 'Incomplete'
  source?: string
  recordKey?: string
  missingMetadata?: string[]
  revisions: Array<{ revision: string; date: string; change: string }>
}

const REPO = 'https://github.com/PIC-Designer/PIC_library'
const UID_LENGTH = 13

function normaliseValue(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

async function uidFromFactors(main: string, platform: string, wavelengths: string, ioType: string, chipType: string, createData: string) {
  const identity = [main, platform, wavelengths, ioType, chipType, createData].map(normaliseValue).join('\x1f')
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity)))
  let value = 0n
  for (const byte of digest) value = (value << 8n) + BigInt(byte)
  return (value % (36n ** BigInt(UID_LENGTH))).toString(36).toUpperCase().padStart(UID_LENGTH, '0')
}

function UidGenerator({ onClose }: { onClose: () => void }) {
  const [main, setMain] = useState('main_TE()')
  const [platform, setPlatform] = useState('SiN200')
  const [wavelengths, setWavelengths] = useState('520nm, 638nm, 780nm')
  const [ioType, setIoType] = useState('Grating Coupler')
  const [chipType, setChipType] = useState('test chip')
  const [createData, setCreateData] = useState('08/2026')
  const [generatedUid, setGeneratedUid] = useState('')
  const fields = [main, platform, wavelengths, ioType, chipType, createData]

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (fields.some((value) => !value.trim())) return
    setGeneratedUid(await uidFromFactors(main, platform, wavelengths, ioType, chipType, createData))
  }

  return <div className="chip-modal-scrim" onMouseDown={onClose}>
    <form className="chip-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
      <button type="button" className="drawer-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
      <span className="eyebrow">UID GENERATOR</span><h2>Generate a chip UID</h2>
      <p className="form-intro">The six values are used only to calculate the deterministic 13-character UID. Nothing is added to the Chip Library or saved in this browser.</p>
      <div className="chip-form-grid">
        <label><span>Main</span><input value={main} onChange={(event) => setMain(event.target.value)} placeholder="main()" /></label>
        <label><span>Platform</span><input value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="SiN200" /></label>
        <label className="full"><span>Wavelengths</span><input value={wavelengths} onChange={(event) => setWavelengths(event.target.value)} placeholder="520nm, 638nm, 780nm" /></label>
        <label><span>IOS</span><input value={ioType} onChange={(event) => setIoType(event.target.value)} placeholder="Grating Coupler" /></label>
        <label><span>Type</span><input value={chipType} onChange={(event) => setChipType(event.target.value)} placeholder="test chip" /></label>
        <label className="full"><span>Create data</span><input value={createData} onChange={(event) => setCreateData(event.target.value)} placeholder="08/2026" /></label>
      </div>
      {generatedUid && <div className="name-preview"><span>Generated UID — not saved</span><code>{generatedUid}</code><button type="button" className="copy-generated" onClick={() => navigator.clipboard.writeText(generatedUid)}><Copy size={13} /> Copy</button></div>}
      {fields.some((value) => !value.trim()) && <p className="form-error">All six fields are required.</p>}
      <div className="form-actions"><button type="button" onClick={onClose}>Close</button><button className="primary" disabled={fields.some((value) => !value.trim())}><Fingerprint size={16} /> Generate UID</button></div>
    </form>
  </div>
}

export function ChipLibrary() {
  const [importedRecords, setImportedRecords] = useState<ChipRecord[]>([])
  const [query, setQuery] = useState('')
  const [generating, setGenerating] = useState(false)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}chip_catalog.json`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then((catalog) => setImportedRecords(catalog.designs ?? []))
      .catch(() => setImportedRecords([]))
  }, [])
  const allRecords = importedRecords
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return allRecords.filter((record) => !term || [record.uid, record.name, record.main, record.description, record.currentRevision].join(' ').toLowerCase().includes(term))
  }, [allRecords, query])

  return <section className="content chip-library">
    <div className="chip-hero">
      <div><span className="eyebrow">DESIGN-LEVEL IDENTIFICATION</span><h2>Test chip library</h2><p>Track immutable design identities, revisions and design lineage independently from fabrication runs.</p></div>
      <div className="uid-example"><span>UID FORMAT</span><strong>A7F29C4D81B6X</strong><small>13 characters · derived from 6 header fields</small></div>
    </div>
    <div className="chip-summary">
      <div><Cpu /><span><strong>{allRecords.length}</strong> chip designs</span></div>
      <div><GitFork /><span><strong>{allRecords.filter((record) => record.parentUid).length}</strong> derived designs</span></div>
      <div><CalendarDays /><span><strong>{allRecords.reduce((sum, record) => sum + record.revisions.length, 0)}</strong> revisions</span></div>
    </div>
    <div className="chip-toolbar">
      <label className="search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search UID, chip name or description…" /></label>
      <button className="new-chip" onClick={() => setGenerating(true)}><Fingerprint size={17} /> Generate UID</button>
    </div>
    {filtered.length ? <div className="chip-grid">{filtered.map((record) => <article className="chip-card" key={record.recordKey ?? record.uid}>
      <div className="chip-card-head"><span className={`chip-status ${record.status.toLowerCase()}`}>{record.status}</span><code>{record.currentRevision}</code></div>
      <div className="uid-row"><strong>{record.uid}</strong>{record.uidStatus !== 'placeholder' && <button title="Copy UID" onClick={() => navigator.clipboard.writeText(record.uid)}><Copy size={14} /></button>}</div>
      <p className="chip-name">{record.name}</p>
      <p className="chip-description">{record.description || 'No description supplied.'}</p>
      <div className="chip-tags"><span>MAIN: {record.main}</span><span>{record.platform}</span><span>{record.ioType}</span><span>{record.wavelengths.join('+')}</span><span>{record.chipType}</span></div>
      {!!record.missingMetadata?.length && <div className="metadata-warning">Missing: {record.missingMetadata.join(', ')}</div>}
      {record.parentUid && <div className="parent-chip"><GitFork size={13} /> Parent {record.parentUid} / {record.parentRevision}</div>}
      <div className="chip-card-foot"><span>Updated {record.lastUpdated}</span>{record.source && <a href={`${REPO}/blob/main/${record.source}`} target="_blank" rel="noreferrer">Source <ArrowUpRight size={12} /></a>}</div>
    </article>)}</div> : <div className="empty chip-empty"><Cpu size={34} /><strong>{allRecords.length ? 'No matching chips' : 'No test chips yet'}</strong><span>{allRecords.length ? 'Try another UID, MAIN, chip name or description.' : 'No imported test-chip records are available.'}</span></div>}
    {generating && <UidGenerator onClose={() => setGenerating(false)} />}
  </section>
}

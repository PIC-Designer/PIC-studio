import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, Copy, Cpu, GitFork, Plus, Search, X } from 'lucide-react'

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

const STORAGE_KEY = 'pic-studio-chip-library-v2'
const REPO = 'https://github.com/PIC-Designer/PIC_library'
const PLATFORMS = ['SOI220', 'SOI340', 'SOI500', 'SiN200', 'SiN300', 'GeSi', 'SuspSi']
const IO_TYPES = ['GC', 'EC', 'Both']
const WAVELENGTHS = ['520', '638', '780', 'O', 'C']
const CHIP_TYPES = ['OTS', 'DEMO', 'CT']
const UID_LENGTH = 13

function today() {
  return new Date().toISOString().slice(0, 10)
}

function readableDate(date: string) {
  return date.replaceAll('-', '')
}

function chipName(platform: string, ioType: string, wavelengths: string[], chipType: string, date: string, main: string) {
  const ordered = WAVELENGTHS.filter((item) => wavelengths.includes(item))
  return `${platform}_${ordered.join('+')}_${ioType}_${chipType}_${readableDate(date)}_${main}`
}

async function uidFromFactors(platform: string, wavelengths: string[], ioType: string, chipType: string, date: string, main: string) {
  const identity = [main, platform, wavelengths.join(', '), ioType, chipType, date].join('\x1f')
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity)))
  let value = 0n
  for (const byte of digest) value = (value << 8n) + BigInt(byte)
  return (value % (36n ** BigInt(UID_LENGTH))).toString(36).toUpperCase().padStart(UID_LENGTH, '0')
}

function loadRecords(): ChipRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function NewChipForm({ records, onSave, onClose }: { records: ChipRecord[]; onSave: (record: ChipRecord) => void; onClose: () => void }) {
  const [platform, setPlatform] = useState(PLATFORMS[0])
  const [ioType, setIoType] = useState(IO_TYPES[0])
  const [wavelengths, setWavelengths] = useState<string[]>(['C'])
  const [chipType, setChipType] = useState(CHIP_TYPES[2])
  const [date] = useState(today())
  const [main, setMain] = useState('main()')
  const [parentUid, setParentUid] = useState('')
  const [parentRevision, setParentRevision] = useState('')
  const [description, setDescription] = useState('')
  const name = chipName(platform, ioType, wavelengths, chipType, date, main)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!wavelengths.length || !main.trim()) return
    const uid = await uidFromFactors(platform, wavelengths, ioType, chipType, date, main.trim())
    if (records.some((record) => record.uid === uid)) return
    onSave({
      uid, uidStatus: 'generated', platform, ioType, wavelengths, chipType, main: main.trim(), name,
      createdDate: date, lastUpdated: date, currentRevision: 'R00',
      parentUid, parentRevision: parentUid ? parentRevision || 'R00' : '',
      description, status: 'Draft',
      revisions: [{ revision: 'R00', date, change: 'Initial design' }],
    })
  }

  return <div className="chip-modal-scrim" onMouseDown={onClose}>
    <form className="chip-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
      <button type="button" className="drawer-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
      <span className="eyebrow">NEW TEST CHIP DESIGN</span><h2>Create chip identity</h2>
      <p className="form-intro">A deterministic 13-character UID is generated from MAIN, PLATFORM, WAVELENGTHS, IOS, TYPE and CREATE DATA.</p>
      <div className="chip-form-grid">
        <label><span>Main</span><input value={main} onChange={(event) => setMain(event.target.value)} placeholder="main()" /></label>
        <label><span>Platform</span><select value={platform} onChange={(event) => setPlatform(event.target.value)}>{PLATFORMS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>IO type</span><select value={ioType} onChange={(event) => setIoType(event.target.value)}>{IO_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <fieldset><legend>Wavelength</legend><div className="wavelength-options">{WAVELENGTHS.map((item) => <label key={item}><input type="checkbox" checked={wavelengths.includes(item)} onChange={() => setWavelengths((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} /><span>{item}</span></label>)}</div></fieldset>
        <label><span>Primary type</span><select value={chipType} onChange={(event) => setChipType(event.target.value)}>{CHIP_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Parent UID (optional)</span><select value={parentUid} onChange={(event) => setParentUid(event.target.value)}><option value="">Independent design</option>{records.map((record) => <option key={record.uid} value={record.uid}>{record.uid}</option>)}</select></label>
        <label><span>Parent revision</span><input value={parentRevision} onChange={(event) => setParentRevision(event.target.value.toUpperCase())} placeholder="R00" disabled={!parentUid} /></label>
        <label className="full"><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Purpose and design context…" /></label>
      </div>
      <div className="name-preview"><span>Human-readable name</span><code>{name}</code></div>
      {(!wavelengths.length || !main.trim()) && <p className="form-error">MAIN and at least one wavelength are required.</p>}
      <div className="form-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={!wavelengths.length || !main.trim()}><Plus size={16} /> Generate UID & create</button></div>
    </form>
  </div>
}

export function ChipLibrary() {
  const [records, setRecords] = useState<ChipRecord[]>(loadRecords)
  const [importedRecords, setImportedRecords] = useState<ChipRecord[]>([])
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}chip_catalog.json`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then((catalog) => setImportedRecords(catalog.designs ?? []))
      .catch(() => setImportedRecords([]))
  }, [])
  const allRecords = useMemo(() => {
    const localUids = new Set(records.map((record) => record.uid))
    return [...records, ...importedRecords.filter((record) => !localUids.has(record.uid))]
  }, [records, importedRecords])
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return allRecords.filter((record) => !term || [record.uid, record.name, record.main, record.description, record.currentRevision].join(' ').toLowerCase().includes(term))
  }, [allRecords, query])

  const persist = (next: ChipRecord[]) => {
    setRecords(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
  const addRecord = (record: ChipRecord) => { persist([record, ...records]); setCreating(false) }
  const addRevision = (uid: string) => persist(records.map((record) => {
    if (record.uid !== uid) return record
    const number = Number(record.currentRevision.slice(1)) + 1
    const revision = `R${String(number).padStart(2, '0')}`
    const date = today()
    return { ...record, currentRevision: revision, lastUpdated: date, name: chipName(record.platform, record.ioType, record.wavelengths, record.chipType, date, record.main), revisions: [...record.revisions, { revision, date, change: 'New OAS design revision' }] }
  }))

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
      <button className="new-chip" onClick={() => setCreating(true)}><Plus size={17} /> New chip design</button>
    </div>
    {filtered.length ? <div className="chip-grid">{filtered.map((record) => <article className="chip-card" key={record.recordKey ?? record.uid}>
      <div className="chip-card-head"><span className={`chip-status ${record.status.toLowerCase()}`}>{record.status}</span><code>{record.currentRevision}</code></div>
      <div className="uid-row"><strong>{record.uid}</strong>{record.uidStatus !== 'placeholder' && <button title="Copy UID" onClick={() => navigator.clipboard.writeText(record.uid)}><Copy size={14} /></button>}</div>
      <p className="chip-name">{record.name}</p>
      <p className="chip-description">{record.description || 'No description supplied.'}</p>
      <div className="chip-tags"><span>MAIN: {record.main}</span><span>{record.platform}</span><span>{record.ioType}</span><span>{record.wavelengths.join('+')}</span><span>{record.chipType}</span></div>
      {!!record.missingMetadata?.length && <div className="metadata-warning">Missing: {record.missingMetadata.join(', ')}</div>}
      {record.parentUid && <div className="parent-chip"><GitFork size={13} /> Parent {record.parentUid} / {record.parentRevision}</div>}
      <div className="chip-card-foot"><span>Updated {record.lastUpdated}</span>{record.source ? <a href={`${REPO}/blob/main/${record.source}`} target="_blank" rel="noreferrer">Source <ArrowUpRight size={12} /></a> : <button onClick={() => addRevision(record.uid)}>Create revision</button>}</div>
    </article>)}</div> : <div className="empty chip-empty"><Cpu size={34} /><strong>{records.length ? 'No matching chips' : 'No test chips yet'}</strong><span>{records.length ? 'Try another UID or name.' : 'Create the first design identity. It will start at revision R00.'}</span><button onClick={() => setCreating(true)}><Plus size={16} /> New chip design</button></div>}
    {creating && <NewChipForm records={allRecords} onSave={addRecord} onClose={() => setCreating(false)} />}
  </section>
}

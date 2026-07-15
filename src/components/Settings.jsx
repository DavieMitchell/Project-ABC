import { useRef, useState } from 'react'
import { exportData, importData } from '../utils/exportImport'

export default function Settings({ onBack, onDataChanged }) {
  const fileInput = useRef(null)
  const [status, setStatus] = useState('')

  const handleImportClick = () => fileInput.current?.click()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const mode = window.confirm(
        'Replace ALL existing data with this file?\n\nOK = replace everything\nCancel = merge with existing data'
      ) ? 'replace' : 'merge'
      const result = await importData(file, mode)
      setStatus(`Imported ${result.count} day(s).`)
      onDataChanged()
    } catch (err) {
      setStatus(err.message)
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="panel">
      <button className="back" onClick={onBack}>&#8592; Calendar</button>
      <h2>Data</h2>

      <div className="panel-row">
        <div>
          <div>Export data</div>
          <div className="desc">Downloads everything as a JSON file you can keep or move to another device.</div>
        </div>
        <button className="btn-primary" onClick={exportData}>Export</button>
      </div>

      <div className="panel-row">
        <div>
          <div>Import data</div>
          <div className="desc">Restore from a Project ABC export file.</div>
        </div>
        <button className="btn-secondary" onClick={handleImportClick}>Import</button>
        <input ref={fileInput} type="file" accept="application/json" onChange={handleFile} />
      </div>

      {status && <p className="desc">{status}</p>}
    </div>
  )
}

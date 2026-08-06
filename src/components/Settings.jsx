import { useRef, useState } from 'react'
import { exportData, exportCSV, importData } from '../utils/exportImport'
import { WORKER_URL } from '../utils/api'

export default function Settings({ onBack, onDataChanged }) {
  const fileInput = useRef(null)
  const [status, setStatus] = useState('')
  const [testResult, setTestResult] = useState('')
  const [testing, setTesting] = useState(false)

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

  const testConnection = async () => {
    setTesting(true)
    setTestResult('')
    try {
      const res = await fetch(`${WORKER_URL}/log-food`, { method: 'GET' })
      const text = await res.text()
      setTestResult(`GET /log-food \u2192 status ${res.status}, body: "${text}"`)
    } catch (err) {
      setTestResult(`GET request failed before reaching the server: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  const testPost = async () => {
    setTesting(true)
    setTestResult('')
    try {
      const res = await fetch(`${WORKER_URL}/log-food`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'one apple', images: [] })
      })
      const text = await res.text()
      setTestResult(`POST /log-food \u2192 status ${res.status}, body: "${text}"`)
    } catch (err) {
      setTestResult(`POST request failed before reaching the server: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="panel">
      <button className="back" onClick={onBack}>&#8592; Home</button>
      <h2>Data</h2>

      <div className="panel-row">
        <div>
          <div>Backup (full)</div>
          <div className="desc">Everything, as JSON — re-importable here later if your phone's cache clears.</div>
        </div>
        <button className="btn-primary" onClick={exportData}>Export</button>
      </div>

      <div className="panel-row">
        <div>
          <div>Food log (CSV)</div>
          <div className="desc">One row per food entry — opens straight into Excel or Numbers.</div>
        </div>
        <button className="btn-secondary" onClick={exportCSV}>Export</button>
      </div>

      <div className="panel-row">
        <div>
          <div>Import data</div>
          <div className="desc">Restore from a Project ABC backup file (JSON only).</div>
        </div>
        <button className="btn-secondary" onClick={handleImportClick}>Import</button>
        <input ref={fileInput} type="file" accept="application/json" onChange={handleFile} />
      </div>

      {status && <p className="desc">{status}</p>}

      <h2 style={{ marginTop: '1.5rem' }}>Worker diagnostics</h2>
      <div className="panel-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
        <div className="desc">Configured Worker URL (exactly as built into this app):</div>
        <div className="diagnostic-box">[{WORKER_URL || 'NOT SET'}]</div>
      </div>
      <div className="panel-row">
        <div>
          <div>Test connection (GET)</div>
          <div className="desc">Sends a plain GET to your Worker and shows the raw response.</div>
        </div>
        <button className="btn-secondary" onClick={testConnection} disabled={testing}>
          {testing ? 'Testing\u2026' : 'Test'}
        </button>
      </div>
      <div className="panel-row">
        <div>
          <div>Test connection (POST)</div>
          <div className="desc">Sends the exact same request "Add food" sends, with "one apple" as a test.</div>
        </div>
        <button className="btn-secondary" onClick={testPost} disabled={testing}>
          {testing ? 'Testing\u2026' : 'Test'}
        </button>
      </div>
      {testResult && <div className="diagnostic-box">{testResult}</div>}
    </div>
  )
}

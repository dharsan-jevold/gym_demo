import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Client = { id: number; firstName: string; lastName: string; email: string; phone: string; joinDate: string; membershipPlan: string; monthlyFee: number }
type Fee = { id: number; clientId: number; clientName: string; amount: number; dueDate: string; paid: boolean; paidDate?: string }
type Reminder = { feeId: number; clientName: string; amount: number; dueDate: string; daysUntilDue: number }
type Dashboard = { paid: number; unpaid: number; upcoming: number; fees: Fee[] }
type ClientForm = Omit<Client, 'id' | 'monthlyFee'> & { monthlyFee: string }
type FeeForm = { clientId: string; amount: string; dueDate: string; paid: boolean }
type Page = 'dashboard' | 'members' | 'payments' | 'alerts' | 'settings'

const today = new Date().toISOString().slice(0, 10)
const defaultClient: ClientForm = { firstName: '', lastName: '', email: '', phone: '', joinDate: today, membershipPlan: 'Monthly', monthlyFee: '120' }
const defaultFee: FeeForm = { clientId: '', amount: '', dueDate: today, paid: false }
const apiRoot = import.meta.env.PROD ? 'http://localhost:8080/api' : '/api'
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

function formatCurrency(value: number) {
  return currency.format(Number(value) || 0)
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00`))
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiRoot}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!response.ok) throw new Error((await response.text()) || 'Request failed.')
  return response.status === 204 ? undefined as T : response.json()
}

function feeStatus(fee: Fee) {
  if (fee.paid) return 'Paid'
  if (fee.dueDate < today) return 'Overdue'
  if (fee.dueDate === today) return 'Due today'
  return 'Upcoming'
}

export default function App() {
  const [clients, setClients] = useState<Client[]>([])
  const [dashboard, setDashboard] = useState<Dashboard>({ paid: 0, unpaid: 0, upcoming: 0, fees: [] })
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [clientForm, setClientForm] = useState<ClientForm>(defaultClient)
  const [feeForm, setFeeForm] = useState<FeeForm>(defaultFee)
  const [editingClient, setEditingClient] = useState<number | null>(null)
  const [editingFee, setEditingFee] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [planFilter, setPlanFilter] = useState('All')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('gym-theme') as 'light' | 'dark' | null) || 'dark')
  const [activePage, setActivePage] = useState<Page>('dashboard')

  const load = useCallback(async () => {
    try {
      const [members, data, reminderData] = await Promise.all([
        api<Client[]>('/clients'), api<Dashboard>('/dashboard'), api<Reminder[]>('/reminders'),
      ])
      setClients(members); setDashboard(data); setReminders(reminderData)
      if ('Notification' in window && Notification.permission === 'granted' && reminderData.length) {
        new Notification('Gym fee reminders', { body: `${reminderData.length} unpaid payment${reminderData.length === 1 ? '' : 's'} need attention.` })
      }
    } catch (error) {
      setMessage(error instanceof Error ? `Could not reach the API: ${error.message}` : 'Could not load data.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('gym-theme', theme)
  }, [theme])

  const saveClient = async (event: FormEvent) => {
    event.preventDefault()
    const id = editingClient
    try {
      await api(id ? `/clients/${id}` : '/clients', { method: id ? 'PUT' : 'POST', body: JSON.stringify({ ...clientForm, monthlyFee: Number(clientForm.monthlyFee) }) })
      setClientForm(defaultClient); setEditingClient(null); setMessage(id ? 'Client updated successfully.' : 'Client added successfully.'); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save client.') }
  }

  const saveFee = async (event: FormEvent) => {
    event.preventDefault()
    if (!feeForm.clientId) return setMessage('Choose a client first.')
    const id = editingFee
    const details = { amount: Number(feeForm.amount), dueDate: feeForm.dueDate, paid: feeForm.paid }
    try {
      await api(id ? `/fees/${id}` : '/fees', { method: id ? 'PUT' : 'POST', body: JSON.stringify(id ? details : { ...details, clientId: Number(feeForm.clientId) }) })
      setFeeForm(defaultFee); setEditingFee(null); setMessage(id ? 'Fee updated successfully.' : 'Fee recorded successfully.'); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save fee.') }
  }

  const editClient = (client: Client) => {
    setEditingClient(client.id); setClientForm({ ...client, monthlyFee: String(client.monthlyFee) })
    document.getElementById('client-form')?.scrollIntoView({ behavior: 'smooth' })
  }
  const editFee = (fee: Fee) => {
    setEditingFee(fee.id); setFeeForm({ clientId: String(fee.clientId), amount: String(fee.amount), dueDate: fee.dueDate, paid: fee.paid })
    document.getElementById('fee-form')?.scrollIntoView({ behavior: 'smooth' })
  }
  const openWhatsApp = (client: Client) => {
    const digits = client.phone.replace(/\D/g, '')
    const phone = digits.length === 10 ? `91${digits}` : digits
    if (!phone) return setMessage(`No phone number is saved for ${client.firstName} ${client.lastName}.`)
    const latestFee = dashboard.fees.filter(fee => fee.clientId === client.id).sort((left, right) => right.dueDate.localeCompare(left.dueDate))[0]
    const expiryText = latestFee ? `Your membership ${latestFee.dueDate < today ? 'expired' : 'will expire'} on ${formatDate(latestFee.dueDate)}.` : 'We do not have a membership expiry date recorded yet.'
    const text = `Hi ${client.firstName}, this is Gym Fee Management. This message was sent on ${formatDate(today)}. ${expiryText} Please let us know if you have any questions.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }
  const payment = async (fee: Fee) => {
    try { await api(`/fees/${fee.id}/payment`, { method: 'PATCH', body: JSON.stringify({ paid: !fee.paid }) }); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update payment.') }
  }
  const removeClient = async (client: Client) => {
    if (!window.confirm(`Remove ${client.firstName} ${client.lastName} and their payment records?`)) return
    try { await api(`/clients/${client.id}`, { method: 'DELETE' }); setMessage('Client removed.'); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not remove client.') }
  }
  const removeFee = async (fee: Fee) => {
    if (!window.confirm(`Delete the ${fee.clientName} fee record?`)) return
    try { await api(`/fees/${fee.id}`, { method: 'DELETE' }); setMessage('Fee deleted.'); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete fee.') }
  }
  const enableNotifications = async () => {
    if (!('Notification' in window)) return setMessage('Browser notifications are not available in this window.')
    const permission = await Notification.requestPermission()
    setMessage(permission === 'granted' ? 'Notifications enabled.' : 'Notification permission was not granted.')
    if (permission === 'granted' && reminders.length) new Notification('Gym fee reminders', { body: `${reminders.length} payment${reminders.length === 1 ? '' : 's'} need attention.` })
  }
  const downloadReport = async () => {
    try {
      const response = await fetch(`${apiRoot}/reports/fees.csv`)
      if (!response.ok) throw new Error('Could not create the report.')
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a')
      link.href = url; link.download = 'fee-report.csv'; link.click(); URL.revokeObjectURL(url)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not download report.') }
  }

  const query = search.toLowerCase().trim()
  const plans = [...new Set(clients.map(client => client.membershipPlan))]
  const visibleClients = clients.filter(client => `${client.firstName} ${client.lastName} ${client.email} ${client.phone}`.toLowerCase().includes(query) && (planFilter === 'All' || client.membershipPlan === planFilter))
  const visibleFees = dashboard.fees.filter(fee => `${fee.clientName} ${fee.amount} ${fee.dueDate}`.toLowerCase().includes(query) && (statusFilter === 'All' || feeStatus(fee) === statusFilter))
  const collectedAmount = dashboard.fees.filter(fee => fee.paid).reduce((total, fee) => total + Number(fee.amount), 0)
  const outstandingAmount = dashboard.fees.filter(fee => !fee.paid).reduce((total, fee) => total + Number(fee.amount), 0)
  const trendMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1); date.setMonth(date.getMonth() - (5 - index))
    const key = date.toISOString().slice(0, 7)
    const amount = dashboard.fees.filter(fee => fee.paidDate?.startsWith(key)).reduce((total, fee) => total + Number(fee.amount), 0)
    return { label: date.toLocaleDateString('en-IN', { month: 'short' }), amount }
  })
  const maxTrendAmount = Math.max(...trendMonths.map(month => month.amount), 1)
  const behavior = clients.map(client => {
    const history = dashboard.fees.filter(fee => fee.clientId === client.id && fee.paid && fee.paidDate)
    const onTime = history.filter(fee => (fee.paidDate || '') <= fee.dueDate).length
    const late = history.length - onTime
    const label = !history.length ? 'Not enough history' : onTime >= late ? 'Usually on time' : 'Usually late'
    return { client, history: history.length, onTime, late, label }
  }).filter(item => item.history || clients.length <= 6).slice(0, 6)

  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">✦</div><div><strong>BATRON GYM</strong><span>TECHNOLOGIES</span></div></div><nav className="sidebar-nav" aria-label="Main navigation">{([{ id: 'dashboard', icon: '▦', label: 'Dashboard' }, { id: 'members', icon: '♙', label: 'Members' }, { id: 'payments', icon: '▤', label: 'Payments' }, { id: 'alerts', icon: '♧', label: 'Alerts' }, { id: 'settings', icon: '⚙', label: 'Settings' }] as { id: Page; icon: string; label: string }[]).map(item => <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav><div className="sidebar-footer"><div className="user-chip"><span className="avatar">D</span><div><strong>DHARSAN</strong><small>admin</small></div><button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle theme">☼</button></div><button className="logout-button">↪ &nbsp; Logout</button></div></aside>
    <div className="main-column"><header className="app-topbar"><div className="global-search"><span>⌕</span><input placeholder="Search members, code, phone, or payments..." value={search} onChange={event => setSearch(event.target.value)} /></div><div className="topbar-actions"><span className="date-pill">▣ &nbsp; {dateFormatter.format(new Date())}</span><button className="icon-button" onClick={() => void enableNotifications()} aria-label="Enable notifications">♧</button><button className="project-button">✣ &nbsp; Project Demo</button><button className="primary-button" onClick={() => setActivePage('members')}>♙ &nbsp; Add Member</button></div></header><div className={`page-shell page-${activePage}`} id="dashboard">
    <section className="dashboard-hero"><div><p className="eyebrow">Gym operations · India</p><h1>BATRON Gym Operations Center</h1><p className="subtitle">Real-time membership tracking, payment reconciliations, and manual WhatsApp reminders.</p></div><div className="hero-actions"><button className="secondary-button" onClick={() => setMessage('Demo automation mode is active.')}>✣ &nbsp; Project Demo & Auto-Simulation</button><button className="secondary-button" onClick={() => void load()}>⟳ &nbsp; Refresh</button></div></section>
    {message && <div className="notice" role="status">{message}<button onClick={() => setMessage('')} aria-label="Dismiss">×</button></div>}
    {activePage !== 'dashboard' && activePage !== 'settings' && <div className="page-heading"><p className="eyebrow">Workspace</p><h2>{activePage === 'members' ? 'Members' : activePage === 'payments' ? 'Payments & reconciliation' : 'Alerts & reminders'}</h2><span>Manage this area without leaving the dashboard.</span></div>}
    {activePage === 'settings' && <section className="panel settings-panel"><div className="panel-header"><div><h3>Settings</h3><span>Personalize your operations workspace</span></div></div><div className="settings-row"><div><strong>Appearance</strong><span>Choose how the dashboard looks.</span></div><button className="secondary-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}</button></div><div className="settings-row"><div><strong>Notifications</strong><span>Receive reminders for unpaid payments.</span></div><button className="secondary-button" onClick={() => void enableNotifications()}>Enable notifications</button></div><div className="settings-row"><div><strong>Reports</strong><span>Download the current fee report as CSV.</span></div><button className="secondary-button" onClick={() => void downloadReport()}>Download report</button></div></section>}
    <section className="stats-grid">{[{ label: 'Collected this cycle', value: formatCurrency(collectedAmount), detail: `${dashboard.paid} paid payments` }, { label: 'Outstanding fees', value: formatCurrency(outstandingAmount), detail: `${dashboard.unpaid} unpaid payments` }, { label: 'Upcoming dues', value: dashboard.upcoming, detail: 'Payments due soon' }, { label: 'Active members', value: clients.length, detail: 'Registered clients' }].map(stat => <article key={stat.label} className="stat-card"><p>{stat.label}</p><h2>{stat.value}</h2><span>{stat.detail}</span></article>)}</section>
    <section className="insights-grid"><article className="panel chart-panel"><div className="panel-header"><div><h3>Collection trend</h3><span>Recorded payments by paid date</span></div><strong className="chart-total">{formatCurrency(collectedAmount)}</strong></div><div className="bar-chart" aria-label="Six month collection trend">{trendMonths.map(month => <div className="bar-group" key={month.label}><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(month.amount / maxTrendAmount * 100, month.amount ? 8 : 2)}%` }} title={`${month.label}: ${formatCurrency(month.amount)}`} /></div><span>{month.label}</span></div>)}</div></article><article className="panel behavior-panel"><div className="panel-header"><div><h3>Payment behavior</h3><span>Based on recorded payment dates</span></div><span className="behavior-legend"><i className="on-time-dot" /> on time</span></div>{behavior.length ? <div className="behavior-list">{behavior.map(item => <div className="behavior-row" key={item.client.id}><div><strong>{item.client.firstName} {item.client.lastName}</strong><span>{item.history ? `${item.onTime} on time · ${item.late} late` : 'Mark payments paid to build history'}</span></div><span className={`behavior-label ${item.label.toLowerCase().replaceAll(' ', '-')}`}>{item.label}</span></div>)}</div> : <p className="empty">Add members to see payment behavior.</p>}</article></section>
    <section className="toolbar panel"><div className="search-field"><label htmlFor="search">Search</label><input id="search" placeholder="Name, email, amount, or date" value={search} onChange={event => setSearch(event.target.value)} /></div><label>Status<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option>All</option><option>Paid</option><option>Due today</option><option>Upcoming</option><option>Overdue</option></select></label><label>Plan<select value={planFilter} onChange={event => setPlanFilter(event.target.value)}><option>All</option>{plans.map(plan => <option key={plan}>{plan}</option>)}</select></label><button className="secondary-button report-button" onClick={() => void downloadReport()}>Download report</button></section>
    <section className="forms-grid">
      <form id="client-form" className="panel form-panel" onSubmit={saveClient}><div className="panel-header"><div><h3>{editingClient ? 'Edit client' : 'Add a client'}</h3><span>Member profile and plan</span></div>{editingClient && <button type="button" className="text-button" onClick={() => { setEditingClient(null); setClientForm(defaultClient) }}>Cancel</button>}</div><div className="field-grid"><label>First name<input required value={clientForm.firstName} onChange={event => setClientForm({ ...clientForm, firstName: event.target.value })} /></label><label>Last name<input required value={clientForm.lastName} onChange={event => setClientForm({ ...clientForm, lastName: event.target.value })} /></label><label>Email<input required type="email" value={clientForm.email} onChange={event => setClientForm({ ...clientForm, email: event.target.value })} /></label><label>Phone<input required placeholder="+91 98765 43210" value={clientForm.phone} onChange={event => setClientForm({ ...clientForm, phone: event.target.value })} /></label><label>Join date<input required type="date" value={clientForm.joinDate} onChange={event => setClientForm({ ...clientForm, joinDate: event.target.value })} /></label><label>Plan<input required value={clientForm.membershipPlan} onChange={event => setClientForm({ ...clientForm, membershipPlan: event.target.value })} /></label><label>Monthly fee<input required min="0.01" step="0.01" type="number" value={clientForm.monthlyFee} onChange={event => setClientForm({ ...clientForm, monthlyFee: event.target.value })} /></label></div><button className="primary-button" type="submit">{editingClient ? 'Save changes' : 'Save client'}</button></form>
      <form id="fee-form" className="panel form-panel" onSubmit={saveFee}><div className="panel-header"><div><h3>{editingFee ? 'Edit fee' : 'Record a fee'}</h3><span>Payment amount and due date</span></div>{editingFee && <button type="button" className="text-button" onClick={() => { setEditingFee(null); setFeeForm(defaultFee) }}>Cancel</button>}</div><label>Client<select required disabled={Boolean(editingFee)} value={feeForm.clientId} onChange={event => setFeeForm({ ...feeForm, clientId: event.target.value })}><option value="">Select a client</option>{clients.map(client => <option key={client.id} value={client.id}>{client.firstName} {client.lastName}</option>)}</select></label><label>Amount<input required min="0.01" step="0.01" type="number" value={feeForm.amount} onChange={event => setFeeForm({ ...feeForm, amount: event.target.value })} /></label><label>Due date<input required type="date" value={feeForm.dueDate} onChange={event => setFeeForm({ ...feeForm, dueDate: event.target.value })} /></label><label className="checkbox"><input type="checkbox" checked={feeForm.paid} onChange={event => setFeeForm({ ...feeForm, paid: event.target.checked })} /> Paid already</label><button className="primary-button" type="submit" disabled={!clients.length}>{editingFee ? 'Save changes' : 'Record fee'}</button></form>
    </section>
    <section className="panel expiries-panel" id="reminders"><div className="panel-header"><div><h3>Upcoming Membership Expiries <span className="count-badge">{reminders.length} Records</span></h3><span>{reminders.length ? 'Targeted for manual WhatsApp follow-up' : 'All member accounts are active with plenty of time remaining.'}</span></div><button className="filter-button">All Upcoming ▾</button></div>{reminders.length ? <div className="reminder-list">{reminders.map(reminder => <div className="reminder-row" key={reminder.feeId}><strong>{reminder.clientName}</strong><span>{formatCurrency(reminder.amount)} due {reminder.daysUntilDue < 0 ? `${Math.abs(reminder.daysUntilDue)} days overdue` : reminder.daysUntilDue === 0 ? 'today' : `in ${reminder.daysUntilDue} days`}</span></div>)}</div> : <div className="empty-state"><div className="empty-icon">✧</div><strong>No upcoming expiries found</strong><span>All member accounts are active with plenty of time remaining.</span></div>}</section>
    <section className="panel" id="payments"><div className="panel-header"><div><h3>Payments</h3><span>{visibleFees.length} of {dashboard.fees.length} records</span></div></div>{loading ? <p>Loading data...</p> : <div className="table-wrap"><table><thead><tr><th>Client</th><th>Amount</th><th>Payment date</th><th>Renewal / expiry date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleFees.length ? visibleFees.map(fee => <tr key={fee.id}><td>{fee.clientName}</td><td>{formatCurrency(fee.amount)}</td><td>{fee.paidDate ? formatDate(fee.paidDate) : 'Not paid'}</td><td>{formatDate(fee.dueDate)}</td><td><span className={`status ${feeStatus(fee).toLowerCase().replace(' ', '-')}`}>{feeStatus(fee)}</span></td><td className="row-actions"><button className="text-button" onClick={() => void payment(fee)}>{fee.paid ? 'Mark unpaid' : 'Mark paid'}</button><button className="text-button" onClick={() => editFee(fee)}>Edit</button><button className="danger-text" onClick={() => void removeFee(fee)}>Delete</button></td></tr>) : <tr><td colSpan={6} className="empty">No matching fees.</td></tr>}</tbody></table></div>}</section>
    <section className="panel" id="clients"><div className="panel-header"><div><h3>Clients</h3><span>{visibleClients.length} of {clients.length} active members</span></div></div><div className="client-list">{visibleClients.map(client => { const latestFee = dashboard.fees.filter(fee => fee.clientId === client.id).sort((left, right) => right.dueDate.localeCompare(left.dueDate))[0]; return <article key={client.id} className="client-row"><div><strong>{client.firstName} {client.lastName}</strong><span>{client.membershipPlan} · {formatCurrency(client.monthlyFee)}/month</span><span>{client.email} · {client.phone}</span><span>{latestFee ? `Renewal / expiry: ${formatDate(latestFee.dueDate)}` : 'Renewal date not recorded'}</span></div><div className="row-actions"><button className="whatsapp-button" onClick={() => openWhatsApp(client)}>WhatsApp</button><button className="text-button" onClick={() => editClient(client)}>Edit</button><button className="danger-button" onClick={() => void removeClient(client)}>Remove</button></div></article> })}{!loading && !visibleClients.length && <p className="empty">No matching clients.</p>}</div></section>
    </div></div>
  </main>
}
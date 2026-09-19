import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Client = { id: number; firstName: string; lastName: string; email: string; phone: string; joinDate: string; membershipPlan: string; monthlyFee: number }
type Fee = { id: number; clientId: number; clientName: string; amount: number; dueDate: string; paid: boolean }
type Reminder = { feeId: number; clientName: string; amount: number; dueDate: string; daysUntilDue: number }
type Dashboard = { paid: number; unpaid: number; upcoming: number; fees: Fee[] }
type ClientForm = Omit<Client, 'id' | 'monthlyFee'> & { monthlyFee: string }
type FeeForm = { clientId: string; amount: string; dueDate: string; paid: boolean }

const today = new Date().toISOString().slice(0, 10)
const defaultClient: ClientForm = { firstName: '', lastName: '', email: '', phone: '', joinDate: today, membershipPlan: 'Monthly', monthlyFee: '120' }
const defaultFee: FeeForm = { clientId: '', amount: '', dueDate: today, paid: false }
const apiRoot = import.meta.env.PROD ? 'http://localhost:8080/api' : '/api'

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

  return <main className="page-shell">
    <header className="topbar"><div><p className="eyebrow">Gym operations</p><h1>Gym Fee Management</h1><p className="subtitle">Members, payments, reminders, and reports in one place.</p></div><div className="header-actions"><button className="secondary-button" onClick={() => void enableNotifications()}>Enable notifications</button><button className="primary-button" onClick={() => document.getElementById('client-form')?.scrollIntoView({ behavior: 'smooth' })}>Add client</button></div></header>
    {message && <div className="notice" role="status">{message}<button onClick={() => setMessage('')} aria-label="Dismiss">×</button></div>}
    <section className="stats-grid">{[{ label: 'Paid payments', value: dashboard.paid }, { label: 'Unpaid payments', value: dashboard.unpaid }, { label: 'Upcoming dues', value: dashboard.upcoming }].map(stat => <article key={stat.label} className="stat-card"><p>{stat.label}</p><h2>{stat.value}</h2></article>)}</section>
    <section className="toolbar panel"><div className="search-field"><label htmlFor="search">Search</label><input id="search" placeholder="Name, email, amount, or date" value={search} onChange={event => setSearch(event.target.value)} /></div><label>Status<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option>All</option><option>Paid</option><option>Due today</option><option>Upcoming</option><option>Overdue</option></select></label><label>Plan<select value={planFilter} onChange={event => setPlanFilter(event.target.value)}><option>All</option>{plans.map(plan => <option key={plan}>{plan}</option>)}</select></label><button className="secondary-button report-button" onClick={() => void downloadReport()}>Download report</button></section>
    <section className="forms-grid">
      <form id="client-form" className="panel form-panel" onSubmit={saveClient}><div className="panel-header"><div><h3>{editingClient ? 'Edit client' : 'Add a client'}</h3><span>Member profile and plan</span></div>{editingClient && <button type="button" className="text-button" onClick={() => { setEditingClient(null); setClientForm(defaultClient) }}>Cancel</button>}</div><div className="field-grid"><label>First name<input required value={clientForm.firstName} onChange={event => setClientForm({ ...clientForm, firstName: event.target.value })} /></label><label>Last name<input required value={clientForm.lastName} onChange={event => setClientForm({ ...clientForm, lastName: event.target.value })} /></label><label>Email<input required type="email" value={clientForm.email} onChange={event => setClientForm({ ...clientForm, email: event.target.value })} /></label><label>Phone<input required value={clientForm.phone} onChange={event => setClientForm({ ...clientForm, phone: event.target.value })} /></label><label>Join date<input required type="date" value={clientForm.joinDate} onChange={event => setClientForm({ ...clientForm, joinDate: event.target.value })} /></label><label>Plan<input required value={clientForm.membershipPlan} onChange={event => setClientForm({ ...clientForm, membershipPlan: event.target.value })} /></label><label>Monthly fee<input required min="0.01" step="0.01" type="number" value={clientForm.monthlyFee} onChange={event => setClientForm({ ...clientForm, monthlyFee: event.target.value })} /></label></div><button className="primary-button" type="submit">{editingClient ? 'Save changes' : 'Save client'}</button></form>
      <form id="fee-form" className="panel form-panel" onSubmit={saveFee}><div className="panel-header"><div><h3>{editingFee ? 'Edit fee' : 'Record a fee'}</h3><span>Payment amount and due date</span></div>{editingFee && <button type="button" className="text-button" onClick={() => { setEditingFee(null); setFeeForm(defaultFee) }}>Cancel</button>}</div><label>Client<select required disabled={Boolean(editingFee)} value={feeForm.clientId} onChange={event => setFeeForm({ ...feeForm, clientId: event.target.value })}><option value="">Select a client</option>{clients.map(client => <option key={client.id} value={client.id}>{client.firstName} {client.lastName}</option>)}</select></label><label>Amount<input required min="0.01" step="0.01" type="number" value={feeForm.amount} onChange={event => setFeeForm({ ...feeForm, amount: event.target.value })} /></label><label>Due date<input required type="date" value={feeForm.dueDate} onChange={event => setFeeForm({ ...feeForm, dueDate: event.target.value })} /></label><label className="checkbox"><input type="checkbox" checked={feeForm.paid} onChange={event => setFeeForm({ ...feeForm, paid: event.target.checked })} /> Paid already</label><button className="primary-button" type="submit" disabled={!clients.length}>{editingFee ? 'Save changes' : 'Record fee'}</button></form>
    </section>
    <section className="panel"><div className="panel-header"><div><h3>Reminders</h3><span>{reminders.length ? 'Unpaid and due within seven days' : 'No immediate reminders'}</span></div></div>{reminders.length ? <div className="reminder-list">{reminders.map(reminder => <div className="reminder-row" key={reminder.feeId}><strong>{reminder.clientName}</strong><span>${Number(reminder.amount).toFixed(2)} due {reminder.daysUntilDue < 0 ? `${Math.abs(reminder.daysUntilDue)} days overdue` : reminder.daysUntilDue === 0 ? 'today' : `in ${reminder.daysUntilDue} days`}</span></div>)}</div> : <p className="empty">You are all caught up.</p>}</section>
    <section className="panel"><div className="panel-header"><div><h3>Payments</h3><span>{visibleFees.length} of {dashboard.fees.length} records</span></div></div>{loading ? <p>Loading data...</p> : <div className="table-wrap"><table><thead><tr><th>Client</th><th>Amount</th><th>Due date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleFees.length ? visibleFees.map(fee => <tr key={fee.id}><td>{fee.clientName}</td><td>${Number(fee.amount).toFixed(2)}</td><td>{fee.dueDate}</td><td><span className={`status ${feeStatus(fee).toLowerCase().replace(' ', '-')}`}>{feeStatus(fee)}</span></td><td className="row-actions"><button className="text-button" onClick={() => void payment(fee)}>{fee.paid ? 'Mark unpaid' : 'Mark paid'}</button><button className="text-button" onClick={() => editFee(fee)}>Edit</button><button className="danger-text" onClick={() => void removeFee(fee)}>Delete</button></td></tr>) : <tr><td colSpan={5} className="empty">No matching fees.</td></tr>}</tbody></table></div>}</section>
    <section className="panel"><div className="panel-header"><div><h3>Clients</h3><span>{visibleClients.length} of {clients.length} active members</span></div></div><div className="client-list">{visibleClients.map(client => <article key={client.id} className="client-row"><div><strong>{client.firstName} {client.lastName}</strong><span>{client.membershipPlan} · ${Number(client.monthlyFee).toFixed(2)}/month</span><span>{client.email} · {client.phone}</span></div><div className="row-actions"><button className="text-button" onClick={() => editClient(client)}>Edit</button><button className="danger-button" onClick={() => void removeClient(client)}>Remove</button></div></article>)}{!loading && !visibleClients.length && <p className="empty">No matching clients.</p>}</div></section>
  </main>
}
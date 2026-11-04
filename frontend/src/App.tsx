
import { useEffect, useState } from 'react';
import { VoiceAssistant } from './VoiceAssistant';
import type { FormEvent, ReactNode } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, Wallet, ChartNoAxesCombined,
  Settings, Bell, Search, Plus, Menu, X, ArrowUpRight, Clock3,
  CircleCheck, AlertCircle, Mic, Languages, LogOut, Store,
  ChevronRight, Pencil, XCircle, RefreshCw, CalendarDays,
  FileText, Save, ArrowDownLeft
} from 'lucide-react';
import { api } from './services/api';

// TYPES
type Shop = {
  id: string;
  name: string;
  slug: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  createdAt?: string;
};

type Credit = {
  id: string;
  customerId: string;
  customer?: Customer;
  description?: string;
  totalAmount: number | string;
  createdAt: string;
  installments?: any[];
  payments?: any[];
  totalCredit?: number;
  totalPaid?: number;
  totalDue?: number;
};

type Summary = {
  customers: number;
  totalCredit: number;
  totalDue: number;
};

type CustomerLedger = {
  customer: Customer;
  credits: Credit[];
  totalBaki: number;
  totalPaid: number;
  totalDue: number;
};

// HELPERS
function money(value: number | string | undefined) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function dateText(value?: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function dateTimeText(value?: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function getFirstShop() {
  const result = await api<{ shops: Shop[] }>('/shops');
  return result.shops?.[0] || null;
}

function PageLoader() {
  return (
    <div className="empty-state">
      <RefreshCw size={25} />
      <p>Loading...</p>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  if (!message) return null;
  return <div className="error-msg">{message}</div>;
}

// CUSTOMER-WISE LEDGER
function buildCustomerLedgers(
  credits: Credit[],
  customers: Customer[]
): CustomerLedger[] {
  const grouped = new Map<string, Credit[]>();

  credits.forEach(credit => {
    if (!grouped.has(credit.customerId)) {
      grouped.set(credit.customerId, []);
    }

    grouped.get(credit.customerId)!.push(credit);
  });

  return Array.from(grouped.entries()).map(([customerId, items]) => {
    const customer =
      items[0]?.customer ||
      customers.find(c => c.id === customerId) || {
        id: customerId,
        name: 'Unknown Customer',
        phone: ''
      };

    const totalBaki = items.reduce(
      (sum, credit) => sum + Number(credit.totalAmount || 0),
      0
    );

    const totalPaid = items.reduce((sum, credit) => {
      const paid = (credit.payments || []).reduce(
        (paymentSum: number, payment: any) => {
          return paymentSum +
            (String(payment.status).toUpperCase() === 'PAID'
              ? Number(payment.amount || 0)
              : 0);
        },
        0
      );

      return sum + paid;
    }, 0);

    const hasInstallments = items.some(
      credit => (credit.installments || []).length > 0
    );

    const totalDue = hasInstallments
      ? items.reduce(
          (sum, credit) =>
            sum +
            (credit.installments || []).reduce(
              (due: number, installment: any) =>
                due +
                Math.max(
                  0,
                  Number(installment.amount || 0) -
                  Number(installment.paidAmount || 0)
                ),
              0
            ),
          0
        )
      : Math.max(0, totalBaki - totalPaid);

    return {
      customer,
      credits: items,
      totalBaki,
      totalPaid,
      totalDue
    };
  });
}

// LOGIN
function Login({ onLogin }: { onLogin: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const data: any = await api(
        register ? '/auth/register' : '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(
            register ? { name, phone, password } : { phone, password }
          )
        }
      );

      localStorage.setItem('hb_token', data.accessToken);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-art">
        <div className="brand">
          <span className="brand-mark">হি</span>
          <span>HisabBondhu</span>
        </div>

        <div className="auth-message">
          <span className="eyebrow">SMART BUSINESS COMPANION</span>
          <h1>Hisab thakuk<br /><em>ekdom shohoj.</em></h1>
          <p>Baki, kisti ar protidin-er bebshar hisab — ek jaygay, nirapode.</p>

          <div className="auth-mini-card">
            <div className="mini-icon"><Wallet size={20} /></div>
            <div>
              <b>Apnar bebsha, apnar control</b>
              <small>Clear hisab. Confident business.</small>
            </div>
            <CircleCheck className="mini-check" />
          </div>
        </div>

        <div className="auth-orb orb-one" />
        <div className="auth-orb orb-two" />
      </div>

      <form className="auth-form" onSubmit={submit}>
        <div className="mobile-brand brand">
          <span className="brand-mark">হি</span>
          <span>HisabBondhu</span>
        </div>

        <span className="eyebrow">WELCOME TO HISABBONDHU</span>
        <h2>{register ? 'Account khulun' : 'Shagotom fire ashar jonno'}</h2>
        <p className="muted">
          {register
            ? 'Apnar business journey shuru korun.'
            : 'Apnar account-e login korun.'}
        </p>

        {register && (
          <label>
            Apnar naam
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
              required
            />
          </label>
        )}

        <label>
          Mobile number
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
          />
        </label>

        <ErrorMessage message={error} />

        <button className="primary-btn full" disabled={busy}>
          {busy ? 'Please wait...' : register ? 'Create account' : 'Login'}
          <ChevronRight size={18} />
        </button>

        <p className="switch-auth">
          {register ? 'Already have an account?' : 'Not registered yet?'}
          <button
            type="button"
            onClick={() => {
              setRegister(!register);
              setError('');
            }}
          >
            {register ? 'Login' : 'Create account'}
          </button>
        </p>

        <div className="secure-note">
          <span /> Secure connection · Your business data stays private
        </div>
      </form>
    </div>
  );
}

// APP LAYOUT
function AppShell({
  children,
  onLogout
}: {
  children: ReactNode;
  onLogout: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const links = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/baki', label: 'Baki Khata', icon: BookOpen },
    { to: '/kisti', label: 'Kisti', icon: Wallet },
    { to: '/reports', label: 'Reports', icon: ChartNoAxesCombined },
    { to: '/settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">হি</span>
          <span>HisabBondhu</span>
          <button className="close-menu" onClick={() => setMobileOpen(false)}>
            <X />
          </button>
        </div>

        <div className="shop-switch">
          <div className="shop-avatar"><Store size={18} /></div>
          <div><b>My Business</b><small>Shop owner</small></div>
          <ChevronRight size={16} />
        </div>

        <div className="nav-caption">WORKSPACE</div>

        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {to === '/customers' && <small className="nav-count">+</small>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><Mic size={18} /></div>
            <b>Need a hand?</b>
            <p>Use voice to manage your hisab.</p>
            <button onClick={() => setVoiceOpen(true)}>
              Try voice assistant <ArrowUpRight size={14} />
            </button>
          </div>

          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}>
            <Menu />
          </button>

          <div className="breadcrumb">
            Workspace <ChevronRight size={14} /> <b>Dashboard</b>
          </div>

          <div className="top-actions">
            <button className="icon-btn" title="Language">
              <Languages size={19} />
            </button>
            <button className="icon-btn notification">
              <Bell size={19} /><i />
            </button>
            <div className="user-chip">
              <div className="user-avatar">S</div>
              <div><b>Shop Owner</b><small>Administrator</small></div>
            </div>
          </div>
        </header>

        <div className="page-content">{children}</div>
            </main>

      {voiceOpen && (
        <VoiceAssistant onClose={() => setVoiceOpen(false)} />
      )}
    </div>
  );
}

// REUSABLE STAT CARD
function Stat({
  title, value, note, icon, tone
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function Quick({
  icon, title, text, to
}: {
  icon: ReactNode;
  title: string;
  text: string;
  to: string;
}) {
  return (
    <NavLink className="quick-action" to={to}>
      <div className="quick-icon">{icon}</div>
      <b>{title}</b>
      <small>{text}</small>
      <ArrowUpRight size={16} className="quick-arrow" />
    </NavLink>
  );
}

// DASHBOARD
function Dashboard() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [summary, setSummary] = useState<Summary>({
    customers: 0,
    totalCredit: 0,
    totalDue: 0
  });
  const [error, setError] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopSlug, setShopSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);

    try {
      const currentShop = await getFirstShop();
      setShop(currentShop);

      if (currentShop) {
        const result = await api<{ summary: Summary }>(
          `/reports/${currentShop.id}/summary`
        );
        setSummary(result.summary);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dashboard load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function createShop(e: FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const data = await api<{ shop: Shop }>('/shops', {
        method: 'POST',
        body: JSON.stringify({ name: shopName, slug: shopSlug })
      });

      setShop(data.shop);
      setCreating(false);
      await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create shop');
    }
  }

  if (loading) return <PageLoader />;

  if (!shop && !creating) {
    return (
      <div className="welcome-card">
        <div className="welcome-icon"><Store size={28} /></div>
        <span className="eyebrow">LET'S GET STARTED</span>
        <h1>Apnar dokaner digital hisab shuru korun.</h1>
        <p>Prothome apnar dokaner information add korun. Tarpor customer, baki o kisti manage korte parben.</p>
        <ErrorMessage message={error} />
        <button className="primary-btn" onClick={() => setCreating(true)}>
          Create your shop <Plus size={18} />
        </button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="form-card narrow">
        <span className="eyebrow">NEW BUSINESS</span>
        <h2>Create your shop</h2>
        <form onSubmit={createShop}>
          <label>
            Shop name
            <input
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              required
              placeholder="e.g. Rahman Store"
            />
          </label>
          <label>
            Unique shop URL
            <input
              value={shopSlug}
              onChange={e => setShopSlug(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
              )}
              required
              placeholder="rahman-store"
            />
          </label>
          <ErrorMessage message={error} />
          <button className="primary-btn">Save shop</button>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR BUSINESS AT A GLANCE</span>
          <h1>Good morning, Shop Owner <span>✦</span></h1>
          <p>Ajker business-er obostha ek nojore dekhe nin.</p>
        </div>
        <NavLink className="primary-btn" to="/customers">
          <Plus size={18} /> Add customer
        </NavLink>
      </div>

      <div className="welcome-strip">
        <div>
          <span className="strip-label">YOUR ACTIVE SHOP</span>
          <h3>{shop?.name}</h3>
          <p>Business overview · All numbers are in BDT</p>
        </div>
        <div className="strip-symbol"><Store size={30} /></div>
      </div>

      <div className="stats-grid">
        <Stat title="Total customers" value={summary.customers.toLocaleString('en-US')} note="Registered customers" icon={<Users />} tone="violet" />
        <Stat title="Total baki" value={money(summary.totalCredit)} note="Total credit created" icon={<BookOpen />} tone="blue" />
        <Stat title="Total due" value={money(summary.totalDue)} note="Outstanding amount" icon={<Wallet />} tone="orange" />
        <Stat title="Collection status" value={summary.totalDue === 0 ? 'All clear' : 'Due pending'} note="Based on recorded installments" icon={<CircleCheck />} tone="green" />
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-head">
            <div><h3>Quick actions</h3><p>Common kajgulo ekhan theke korun</p></div>
            <span className="soft-pill">SHORTCUTS</span>
          </div>
          <div className="quick-grid">
            <Quick icon={<Users />} title="Add customer" text="Notun customer add korun" to="/customers" />
            <Quick icon={<BookOpen />} title="Baki entry" text="Notun baki record korun" to="/baki" />
            <Quick icon={<Wallet />} title="Taka adai" text="Payment record korun" to="/baki" />
            <Quick icon={<ChartNoAxesCombined />} title="Reports" text="Business report dekhun" to="/reports" />
          </div>
        </section>

        <section className="panel activity-panel">
          <div className="panel-head">
            <div><h3>Today's overview</h3><p>Apnar business snapshot</p></div>
            <span className="live-dot">LIVE</span>
          </div>
          <div className="overview-row">
            <div className="overview-icon orange"><Clock3 /></div>
            <div><b>Due collection</b><small>Outstanding installment amount</small></div>
            <strong>{money(summary.totalDue)}</strong>
          </div>
          <div className="overview-row">
            <div className="overview-icon green"><CircleCheck /></div>
            <div><b>Customer base</b><small>Active customer records</small></div>
            <strong>{summary.customers}</strong>
          </div>
          <div className="tip-box">
            <AlertCircle size={18} />
            <p>Customer-er payment receive korar sathe sathe record korun, tahole baki balance update hobe.</p>
          </div>
        </section>
      </div>
    </>
  );
}

// CUSTOMERS
function Customers() {
  const [shopId, setShopId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const shop = await getFirstShop();

    if (!shop) {
      setError('Age Dashboard theke shop create korun.');
      return;
    }

    setShopId(shop.id);

    const data = await api<{ customers: Customer[] }>(
      `/customers/${shop.id}`
    );

    setCustomers(data.customers || []);
  }

  useEffect(() => {
    load().catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  function openAddForm() {
    setEditingId('');
    setName('');
    setPhone('');
    setAddress('');
    setError('');
    setShow(true);
  }

  function openEditForm(customer: Customer) {
    setEditingId(customer.id);
    setName(customer.name);
    setPhone(customer.phone);
    setAddress(customer.address || '');
    setError('');
    setShow(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const body = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim()
      };

      if (editingId) {
        await api(`/customers/${shopId}/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(body)
        });
      } else {
        await api(`/customers/${shopId}`, {
          method: 'POST',
          body: JSON.stringify(body)
        });
      }

      setShow(false);
      setEditingId('');
      setName('');
      setPhone('');
      setAddress('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const filtered = customers.filter(customer =>
    `${customer.name} ${customer.phone} ${customer.address || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (loading) return <PageLoader />;

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CUSTOMER DIRECTORY</span>
          <h1>Customers</h1>
          <p>Apnar shob customer-er information ek jaygay.</p>
        </div>
        <button className="primary-btn" onClick={openAddForm}>
          <Plus size={18} /> Add customer
        </button>
      </div>

      {show && (
        <form className="form-card inline-form" onSubmit={save}>
          <h3>{editingId ? 'Edit customer' : 'New customer'}</h3>

          <div className="form-row">
            <label>
              Customer name
              <input value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={100} placeholder="Customer name" />
            </label>
            <label>
              Mobile number
              <input value={phone} onChange={e => setPhone(e.target.value)} required minLength={10} maxLength={16} placeholder="01XXXXXXXXX" />
            </label>
            <label>
              Address
              <input value={address} onChange={e => setAddress(e.target.value)} maxLength={250} placeholder="Area / address" />
            </label>
          </div>

          <ErrorMessage message={error} />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="primary-btn" disabled={saving}>
              <Save size={16} /> {saving ? 'Please wait...' : editingId ? 'Update customer' : 'Save customer'}
            </button>
            <button
              type="button"
              className="primary-btn"
              style={{ background: '#667085' }}
              onClick={() => {
                setShow(false);
                setEditingId('');
                setError('');
              }}
            >
              <XCircle size={16} /> Cancel
            </button>
          </div>
        </form>
      )}

      <ErrorMessage message={!show ? error : ''} />

      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Customer list</h3>
            <p>{filtered.length} customer found</p>
          </div>
          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Search customer..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Address</th>
                <th>Added</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(customer => (
                <tr key={customer.id}>
                  <td>
                    <div className="customer-cell">
                      <div className="customer-avatar">{customer.name?.[0]}</div>
                      <b>{customer.name}</b>
                    </div>
                  </td>
                  <td>{customer.phone}</td>
                  <td>{customer.address || '—'}</td>
                  <td>{dateText(customer.createdAt)}</td>
                  <td><span className="status active">Active</span></td>
                  <td>
                    <button
                      type="button"
                      onClick={() => openEditForm(customer)}
                      style={{
                        border: '1px solid #e5e0ff',
                        background: '#f2efff',
                        color: '#6955c9',
                        borderRadius: 7,
                        padding: '7px 11px',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: 'pointer'
                      }}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="empty-state">
              <Users size={28} />
              <b>No customers found</b>
              <p>Customer add korun othoba search change korun.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// TRANSACTION HISTORY MODAL
function TransactionModal({
  ledger,
  onClose
}: {
  ledger: CustomerLedger;
  onClose: () => void;
}) {
  const transactions: any[] = [];

  ledger.credits.forEach(credit => {
    transactions.push({
      id: `credit-${credit.id}`,
      type: 'baki',
      amount: Number(credit.totalAmount),
      date: credit.createdAt,
      description: credit.description || 'Baki added'
    });

    (credit.payments || []).forEach((payment: any) => {
      if (String(payment.status).toUpperCase() !== 'PAID') return;

      transactions.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        amount: Number(payment.amount),
        date: payment.receivedAt || payment.createdAt,
        description: payment.reference || 'Payment received'
      });
    });
  });

  transactions.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let runningBalance = 0;

  const history = transactions.map(transaction => {
    runningBalance += transaction.type === 'baki'
      ? transaction.amount
      : -transaction.amount;

    return {
      ...transaction,
      balance: runningBalance
    };
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 18, 35, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          color: '#222',
          width: '100%',
          maxWidth: 760,
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 18,
          padding: 24,
          boxShadow: '0 25px 80px rgba(0,0,0,.25)'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20
        }}>
          <div>
            <h2 style={{ margin: 0 }}>{ledger.customer.name}</h2>
            <p style={{ margin: '5px 0 0', color: '#777' }}>
              {ledger.customer.phone}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction history"
            style={{
              border: 0,
              background: '#f1f1f5',
              borderRadius: 9,
              padding: 9,
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12,
          marginBottom: 24
        }}>
          <div style={{ background: '#f2efff', padding: 15, borderRadius: 12 }}>
            <small>Total Baki</small>
            <h3 style={{ margin: '7px 0 0' }}>{money(ledger.totalBaki)}</h3>
          </div>

          <div style={{ background: '#eaf8ef', padding: 15, borderRadius: 12 }}>
            <small>Total Payment</small>
            <h3 style={{ margin: '7px 0 0', color: '#16834a' }}>
              {money(ledger.totalPaid)}
            </h3>
          </div>

          <div style={{ background: '#fff1e8', padding: 15, borderRadius: 12 }}>
            <small>Remaining Due</small>
            <h3 style={{ margin: '7px 0 0', color: '#d46a22' }}>
              {money(ledger.totalDue)}
            </h3>
          </div>
        </div>

        <h3 style={{ marginBottom: 14 }}>Transaction History</h3>

        {history.length === 0 ? (
          <div className="empty-state">
            <FileText size={28} />
            <p>No transaction history found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {history.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: 14,
                  border: '1px solid #eee',
                  borderRadius: 11
                }}
              >
                <div>
                  <b style={{
                    color: item.type === 'baki' ? '#d45d38' : '#16834a'
                  }}>
                    {item.type === 'baki' ? 'Baki Added' : 'Payment Received'}
                  </b>

                  <div style={{ color: '#777', fontSize: 12, marginTop: 5 }}>
                    {dateTimeText(item.date)} · {item.description}
                  </div>

                  <div style={{ fontSize: 12, marginTop: 5, color: '#555' }}>
                    Balance: <b>{money(item.balance)}</b>
                  </div>
                </div>

                <b style={{
                  color: item.type === 'baki' ? '#d45d38' : '#16834a',
                  whiteSpace: 'nowrap'
                }}>
                  {item.type === 'baki' ? '+' : '−'}{money(item.amount)}
                </b>
              </div>
            ))}
          </div>
        )}

        <button
          className="primary-btn"
          type="button"
          onClick={onClose}
          style={{ marginTop: 20 }}
        >
          Close History
        </button>
      </div>
    </div>
  );
}

// BAKI KHATA
function BakiKhata() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [intervalDays, setIntervalDays] = useState('30');

  const [saving, setSaving] = useState(false);
  const [paymentCredit, setPaymentCredit] = useState('');
  const [paymentCustomerId, setPaymentCustomerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [selectedLedger, setSelectedLedger] =
    useState<CustomerLedger | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  async function load() {
    const currentShop = await getFirstShop();

    if (!currentShop) {
      setError('Age Dashboard theke shop create korun.');
      return;
    }

    setShop(currentShop);

    const [customerData, creditData] = await Promise.all([
      api<{ customers: Customer[] }>(`/customers/${currentShop.id}`),
      api<{ credits: Credit[] }>(`/credits/${currentShop.id}`)
    ]);

    setCustomers(customerData.customers || []);
    setCredits(creditData.credits || []);
  }

  useEffect(() => {
    load()
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function addBaki(e: FormEvent) {
    e.preventDefault();
    if (!shop) return;

    setSaving(true);
    setError('');

    try {
      await api(`/credits/${shop.id}`, {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomer,
          description,
          totalAmount: Number(amount),
          installmentCount: Number(installmentCount),
          firstDueDate: new Date(
            `${firstDueDate}T00:00:00`
          ).toISOString(),
          intervalDays: Number(intervalDays)
        })
      });

      setShowAdd(false);
      setDescription('');
      setAmount('');
      setSelectedCustomer('');
      setInstallmentCount('1');

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Baki add kora jayni');
    } finally {
      setSaving(false);
    }
  }

  async function addPayment(e: FormEvent) {
    e.preventDefault();

    if (!paymentCredit) {
      setError('Baki account select korun.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api('/payments/cash', {
        method: 'POST',
        body: JSON.stringify({
          creditId: paymentCredit,
          amount: Number(paymentAmount),
          reference: paymentReference || undefined
        })
      });

      setPaymentCredit('');
      setPaymentCustomerId('');
      setPaymentAmount('');
      setPaymentReference('');

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment save kora jayni');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  const ledgers = buildCustomerLedgers(credits, customers);

  const filteredLedgers = ledgers.filter(ledger =>
    `${ledger.customer.name} ${ledger.customer.phone}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const paymentOptions = credits.filter(
    credit => credit.customerId === paymentCustomerId
  );

  const paymentCreditInfo = credits.find(c => c.id === paymentCredit);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CUSTOMER CREDIT MANAGEMENT</span>
          <h1>Baki Khata</h1>
          <p>Ek customer-er shob baki o payment ekshathe dekhun.</p>
        </div>

        <button className="primary-btn" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={18} /> Baki Add
        </button>
      </div>

      <ErrorMessage message={error} />

      {showAdd && (
        <form className="form-card inline-form" onSubmit={addBaki}>
          <h3>Notun Baki Entry</h3>

          <div className="form-row">
            <label>
              Customer select korun
              <select
                value={selectedCustomer}
                onChange={e => setSelectedCustomer(e.target.value)}
                required
              >
                <option value="">Select customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.phone}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Baki amount (৳)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                placeholder="5000"
              />
            </label>

            <label>
              Description
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Product / reason"
              />
            </label>

            <label>
              Kisti koyta?
              <input
                type="number"
                min="1"
                max="120"
                value={installmentCount}
                onChange={e => setInstallmentCount(e.target.value)}
                required
              />
            </label>

            <label>
              First due date
              <input
                type="date"
                value={firstDueDate}
                onChange={e => setFirstDueDate(e.target.value)}
                required
              />
            </label>

            <label>
              Kisti interval (days)
              <input
                type="number"
                min="1"
                max="365"
                value={intervalDays}
                onChange={e => setIntervalDays(e.target.value)}
                required
              />
            </label>
          </div>

          <button className="primary-btn" disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Baki'}
          </button>
        </form>
      )}

      {paymentCustomerId && (
        <form className="form-card inline-form" onSubmit={addPayment}>
          <h3>Taka Joma korun</h3>

          <div className="form-row">
            <label>
              Customer
              <select
                value={paymentCustomerId}
                onChange={e => {
                  const customerId = e.target.value;
                  setPaymentCustomerId(customerId);

                  const firstCredit = credits.find(
                    c => c.customerId === customerId
                  );

                  setPaymentCredit(firstCredit?.id || '');
                }}
                required
              >
                <option value="">Select customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.phone}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Baki account
              <select
                value={paymentCredit}
                onChange={e => setPaymentCredit(e.target.value)}
                required
              >
                <option value="">Select baki account</option>
                {paymentOptions.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.description || 'Baki'} — {money(c.totalAmount)} — {dateText(c.createdAt)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Jomar amount (৳)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                required
                placeholder="1000"
              />
            </label>

            <label>
              Note / Reference
              <input
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                placeholder="Cash payment"
              />
            </label>
          </div>

          {paymentCreditInfo && (
            <p className="muted">
              Selected baki: {money(paymentCreditInfo.totalAmount)}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="primary-btn" disabled={saving || !paymentCredit}>
              {saving ? 'Saving...' : 'Save Joma'}
            </button>

            <button
              type="button"
              className="primary-btn"
              style={{ background: '#667085' }}
              onClick={() => {
                setPaymentCustomerId('');
                setPaymentCredit('');
                setPaymentAmount('');
                setPaymentReference('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Customer-wise Baki</h3>
            <p>{filteredLedgers.length} customers found</p>
          </div>

          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Search customer..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Total Baki</th>
                <th>Total Payment</th>
                <th>Remaining Due</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredLedgers.map(ledger => (
                <tr key={ledger.customer.id}>
                  <td>
                    <button
                      type="button"
                      onClick={() => setSelectedLedger(ledger)}
                      style={{
                        border: 0,
                        padding: 0,
                        background: 'transparent',
                        color: '#6955c9',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                        textDecoration: 'underline'
                      }}
                    >
                      {ledger.customer.name}
                    </button>

                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      {ledger.customer.phone}
                    </div>
                  </td>

                  <td><b>{money(ledger.totalBaki)}</b></td>

                  <td style={{ color: '#16834a', fontWeight: 700 }}>
                    {money(ledger.totalPaid)}
                  </td>

                  <td style={{ color: '#d46a22', fontWeight: 700 }}>
                    {money(ledger.totalDue)}
                  </td>

                  <td>
                    <button
                      className="primary-btn"
                      type="button"
                      style={{ padding: '7px 10px', fontSize: 12 }}
                      onClick={() => {
                        setPaymentCustomerId(ledger.customer.id);
                        setPaymentCredit(ledger.credits[0]?.id || '');
                        setPaymentAmount('');
                        setPaymentReference('');
                      }}
                    >
                      <Plus size={14} /> Taka Joma
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLedgers.length === 0 && (
            <div className="empty-state">
              <BookOpen size={28} />
              <b>Kono baki record nei</b>
              <p>Baki Add button diye prothom entry korun.</p>
            </div>
          )}
        </div>
      </section>

      {selectedLedger && (
        <TransactionModal
          ledger={selectedLedger}
          onClose={() => setSelectedLedger(null)}
        />
      )}
    </>
  );
}

// KISTI MANAGEMENT
function KistiManagement() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const shop = await getFirstShop();

      if (!shop) {
        setError('Age shop create korun.');
        return;
      }

      const data = await api<{ credits: Credit[] }>(
        `/credits/${shop.id}`
      );

      setCredits(data.credits || []);
    }

    load().catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const installments = credits.flatMap(credit =>
    (credit.installments || []).map(item => ({
      ...item,
      customerName: credit.customer?.name || 'Customer',
      description: credit.description || 'Baki'
    }))
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PAYMENT SCHEDULE</span>
          <h1>Kisti Management</h1>
          <p>Customer-er installment schedule ebong due status.</p>
        </div>
      </div>

      <ErrorMessage message={error} />

      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Installment list</h3>
            <p>{installments.length} installment found</p>
          </div>
          <CalendarDays size={22} />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Description</th>
                <th>Installment</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Due date</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {installments.map((item: any) => (
                <tr key={item.id}>
                  <td><b>{item.customerName}</b></td>
                  <td>{item.description}</td>
                  <td>{money(Number(item.amount))}</td>
                  <td>{money(Number(item.paidAmount || 0))}</td>
                  <td>
                    {money(Math.max(
                      0,
                      Number(item.amount || 0) - Number(item.paidAmount || 0)
                    ))}
                  </td>
                  <td>{dateText(item.dueDate)}</td>
                  <td>
                    <span className={`status ${String(item.status).toLowerCase() === 'paid' ? 'active' : ''}`}>
                      {item.status || 'UPCOMING'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {installments.length === 0 && (
            <div className="empty-state">
              <CalendarDays size={28} />
              <b>Kono installment paoa jayni</b>
              <p>Baki entry korar somoy installment create hobe.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// REPORTS
function Reports() {
  const [summary, setSummary] = useState<Summary>({
    customers: 0,
    totalCredit: 0,
    totalDue: 0
  });

  const [credits, setCredits] = useState<Credit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLedger, setSelectedLedger] =
    useState<CustomerLedger | null>(null);

  useEffect(() => {
    async function load() {
      const shop = await getFirstShop();

      if (!shop) {
        setError('Age shop create korun.');
        return;
      }

      const [summaryData, creditData, customerData] = await Promise.all([
        api<{ summary: Summary }>(`/reports/${shop.id}/summary`),
        api<{ credits: Credit[] }>(`/credits/${shop.id}`),
        api<{ customers: Customer[] }>(`/customers/${shop.id}`)
      ]);

      setSummary(summaryData.summary);
      setCredits(creditData.credits || []);
      setCustomers(customerData.customers || []);
    }

    load().catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const ledgers = buildCustomerLedgers(credits, customers);

  const totalPayments = ledgers.reduce(
    (sum, ledger) => sum + ledger.totalPaid,
    0
  );

  const totalBaki = ledgers.reduce(
    (sum, ledger) => sum + ledger.totalBaki,
    0
  );

  const totalDue = ledgers.reduce(
    (sum, ledger) => sum + ledger.totalDue,
    0
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BUSINESS PERFORMANCE</span>
          <h1>Reports</h1>
          <p>Apnar business-er customer-wise baki ebong collection report.</p>
        </div>
      </div>

      <ErrorMessage message={error} />

      <div className="stats-grid">
        <Stat title="Total customers" value={String(summary.customers)} note="Registered customers" icon={<Users />} tone="violet" />
        <Stat title="Total baki" value={money(totalBaki)} note="Total credit created" icon={<BookOpen />} tone="blue" />
        <Stat title="Total joma" value={money(totalPayments)} note="Recorded paid payments" icon={<ArrowDownLeft />} tone="green" />
        <Stat title="Current due" value={money(totalDue)} note="Remaining balance" icon={<Wallet />} tone="orange" />
      </div>

      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Customer-wise Report</h3>
            <p>{ledgers.length} customers</p>
          </div>
          <FileText size={22} />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Total Baki</th>
                <th>Total Payment</th>
                <th>Remaining Due</th>
              </tr>
            </thead>

            <tbody>
              {ledgers.map(ledger => (
                <tr key={ledger.customer.id}>
                  <td>
                    <button
                      type="button"
                      onClick={() => setSelectedLedger(ledger)}
                      style={{
                        border: 0,
                        padding: 0,
                        background: 'transparent',
                        color: '#6955c9',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      {ledger.customer.name}
                    </button>

                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      {ledger.customer.phone}
                    </div>
                  </td>

                  <td><b>{money(ledger.totalBaki)}</b></td>

                  <td style={{ color: '#16834a', fontWeight: 700 }}>
                    {money(ledger.totalPaid)}
                  </td>

                  <td style={{ color: '#d46a22', fontWeight: 700 }}>
                    {money(ledger.totalDue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {ledgers.length === 0 && (
            <div className="empty-state">
              <FileText size={28} />
              <b>No report data yet</b>
            </div>
          )}
        </div>
      </section>

      {selectedLedger && (
        <TransactionModal
          ledger={selectedLedger}
          onClose={() => setSelectedLedger(null)}
        />
      )}
    </>
  );
}

// SETTINGS
function SettingsPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getFirstShop()
      .then(setShop)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BUSINESS PREFERENCES</span>
          <h1>Settings</h1>
          <p>Apnar shop-er basic information.</p>
        </div>
      </div>

      <ErrorMessage message={error} />

      <section className="panel" style={{ maxWidth: 650, padding: 24 }}>
        <div className="panel-head">
          <div>
            <h3>Shop information</h3>
            <p>Current business details</p>
          </div>
          <Store size={24} />
        </div>

        {shop ? (
          <>
            <div className="overview-row">
              <div className="overview-icon orange"><Store /></div>
              <div><b>Shop name</b><small>{shop.name}</small></div>
            </div>

            <div className="overview-row">
              <div className="overview-icon green"><FileText /></div>
              <div><b>Shop URL slug</b><small>{shop.slug}</small></div>
            </div>

            <p className="muted" style={{ marginTop: 18 }}>
              Shop information edit korar backend endpoint ekhono add kora hoyni.
            </p>
          </>
        ) : (
          <p>Age Dashboard theke shop create korun.</p>
        )}
      </section>
    </>
  );
}

// APP
export default function App() {
  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem('hb_token')
  );

  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('hb_token');
    setLoggedIn(false);
    navigate('/');
  }

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <AppShell onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/baki" element={<BakiKhata />} />
        <Route path="/kisti" element={<KistiManagement />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  );
}

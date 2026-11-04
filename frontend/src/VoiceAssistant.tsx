
import { useEffect, useRef, useState } from 'react';
import { api } from './services/api';
import {
  Mic, MicOff, X, Volume2, Send, CheckCircle2,
  AlertCircle, Loader2, Bot
} from 'lucide-react';

type Shop = {
  id: string;
  name: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
};

type Credit = {
  id: string;
  customerId: string;
  customer?: Customer;
  totalAmount: number | string;
  totalPaid?: number;
  totalDue?: number;
  description?: string;
  installments?: any[];
  payments?: any[];
};

type ActionPreview = {
  type: 'baki' | 'payment';
  customer: Customer;
  amount: number;
  credit?: Credit;
};

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[০-৯]/g, digit =>
      String('০১২৩৪৫৬৭৮৯'.indexOf(digit))
    )
    .replace(/[৳,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCreditDue(credit: Credit) {
  if (credit.totalDue !== undefined) {
    return Math.max(0, Number(credit.totalDue));
  }

  if (credit.installments?.length) {
    return credit.installments.reduce((sum, item) => {
      return sum + Math.max(
        0,
        Number(item.amount || 0) - Number(item.paidAmount || 0)
      );
    }, 0);
  }

  const paid = (credit.payments || []).reduce((sum, payment) => {
    return sum + (
      String(payment.status).toUpperCase() === 'PAID'
        ? Number(payment.amount || 0)
        : 0
    );
  }, 0);

  return Math.max(0, Number(credit.totalAmount) - paid);
}

function getCustomerMatch(
  text: string,
  customers: Customer[]
) {
  const normalized = normalizeText(text);

  const matches = customers
    .filter(customer =>
      normalized.includes(normalizeText(customer.name))
    )
    .sort((a, b) => b.name.length - a.name.length);

  return matches[0] || null;
}

function getAmount(text: string) {
  const normalized = normalizeText(text);
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

export function VoiceAssistant({
  onClose
}: {
  onClose: () => void;
}) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [command, setCommand] = useState('');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState(
    'Assalamu alaikum! Ami HisabBondhu Voice Assistant. Ki hisab korte chan?'
  );
  const [language, setLanguage] = useState('bn-BD');
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ActionPreview | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    async function loadData() {
      const shopData = await api<{ shops: Shop[] }>('/shops');
      const currentShop = shopData.shops?.[0];

      if (!currentShop) {
        throw new Error('Age Dashboard theke shop create korun.');
      }

      setShop(currentShop);

      const [customerData, creditData] = await Promise.all([
        api<{ customers: Customer[] }>(
          `/customers/${currentShop.id}`
        ),
        api<{ credits: Credit[] }>(
          `/credits/${currentShop.id}`
        )
      ]);

      setCustomers(customerData.customers || []);
      setCredits(creditData.credits || []);
    }

    loadData()
      .catch(err => setError(
        err instanceof Error ? err.message : 'Data load failed'
      ))
      .finally(() => setLoading(false));

    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  function speak(message: string) {
    setReply(message);

    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = language;
    utterance.rate = 0.95;

    window.speechSynthesis.speak(utterance);
  }

  function stopListening() {
    recognitionRef.current?.stop?.();
    setListening(false);
  }

  function startListening() {
    setError('');

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        'Voice recognition support nei. Chrome browser use korun, othoba command type korun.'
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      setTranscript(text);
      setCommand(text);
      processCommand(text);
    };

    recognition.onerror = (event: any) => {
      setListening(false);

      if (event.error === 'not-allowed') {
        setError('Microphone permission allow korun.');
      } else if (event.error !== 'no-speech') {
        setError('Voice bujhte problem hoyeche. Abar try korun.');
      }
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }

  function processCommand(rawText: string) {
    setError('');
    setPreview(null);

    const text = normalizeText(rawText);

    if (!text) {
      speak('Command bujhte parini. Abar bolun.');
      return;
    }

    // REPORT QUESTIONS
    const asksReport =
      /total|mot|koto|how much|report|hisab|due|baki ache|joma ache/.test(text);

    if (asksReport) {
      const totalBaki = credits.reduce(
        (sum, credit) => sum + Number(credit.totalAmount || 0),
        0
      );

      const totalDue = credits.reduce(
        (sum, credit) => sum + getCreditDue(credit),
        0
      );

      const totalPaid = credits.reduce((sum, credit) => {
        const paid = (credit.payments || []).reduce(
          (paymentSum, payment) => {
            return paymentSum + (
              String(payment.status).toUpperCase() === 'PAID'
                ? Number(payment.amount || 0)
                : 0
            );
          },
          0
        );

        return sum + paid;
      }, 0);

      if (/customer|grahok|লোক/.test(text)) {
        speak(`Apnar total customer ${customers.length} jon.`);
      } else if (/joma|collection|payment/.test(text)) {
        speak(`Apnar total recorded joma ${totalPaid.toFixed(2)} taka.`);
      } else if (/due|remaining|baki ache/.test(text)) {
        speak(`Apnar current remaining due ${totalDue.toFixed(2)} taka.`);
      } else {
        speak(
          `Total baki ${totalBaki.toFixed(2)} taka. Total joma ${totalPaid.toFixed(2)} taka. Current due ${totalDue.toFixed(2)} taka.`
        );
      }

      return;
    }

    // ADD BAKI OR RECEIVE PAYMENT
    const customer = getCustomerMatch(text, customers);
    const amount = getAmount(text);

    const isPayment =
      /joma|payment|paid|receive|received|taka nilam|taka dise|taka diyeche/.test(text);

    const isBaki =
      /baki|dhare|credit|add/.test(text);

    if (!customer) {
      speak(
        'Customer-er naam bujhte parini. Customer-er naam shoho abar bolun.'
      );
      return;
    }

    if (!amount || amount <= 0) {
      speak('Koto taka, seta bujhte parini. Amount shoho abar bolun.');
      return;
    }

    if (isPayment) {
      const customerCredits = credits
        .filter(credit => credit.customerId === customer.id)
        .filter(credit => getCreditDue(credit) > 0)
        .sort((a, b) => getCreditDue(b) - getCreditDue(a));

      const credit = customerCredits[0];

      if (!credit) {
        speak(`${customer.name}-er kono baki due paoa jayni.`);
        return;
      }

      const due = getCreditDue(credit);

      if (amount > due) {
        speak(
          `Ei account-er due ${due.toFixed(2)} taka. Tar cheye beshi payment deya jabe na.`
        );
        return;
      }

      setPreview({
        type: 'payment',
        customer,
        amount,
        credit
      });

      speak(
        `${customer.name}-er ${amount} taka payment record korbo. Save korar age confirm korun.`
      );

      return;
    }

    if (isBaki) {
      setPreview({
        type: 'baki',
        customer,
        amount
      });

      speak(
        `${customer.name}-er name ${amount} taka baki add korbo. Save korar age confirm korun.`
      );

      return;
    }

    speak(
      'Command bujhte parini. Baki add, payment, othoba total hisab jiggesh korte paren.'
    );
  }

  async function confirmSave() {
    if (!preview || !shop) return;

    setSaving(true);
    setError('');

    try {
      if (preview.type === 'baki') {
        await api(`/credits/${shop.id}`, {
          method: 'POST',
          body: JSON.stringify({
            customerId: preview.customer.id,
            description: 'Added using Voice Assistant',
            totalAmount: preview.amount,
            installmentCount: 1,
            firstDueDate: new Date(
              `${today()}T00:00:00`
            ).toISOString(),
            intervalDays: 30
          })
        });

        speak(
          `${preview.customer.name}-er ${preview.amount} taka baki successfully save hoyeche.`
        );
      } else if (preview.credit) {
        await api('/payments/cash', {
          method: 'POST',
          body: JSON.stringify({
            creditId: preview.credit.id,
            amount: preview.amount,
            reference: 'Received using Voice Assistant'
          })
        });

        speak(
          `${preview.customer.name}-er ${preview.amount} taka payment successfully save hoyeche.`
        );
      }

      const creditData = await api<{ credits: Credit[] }>(
        `/credits/${shop.id}`
      );

      setCredits(creditData.credits || []);
      setPreview(null);
      setCommand('');
      setTranscript('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Save kora jayni'
      );
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTranscript(command);
    processCommand(command);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(12, 15, 30, .68)',
        backdropFilter: 'blur(7px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          color: '#20243a',
          width: '100%',
          maxWidth: 510,
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 22,
          padding: 25,
          boxShadow: '0 25px 90px rgba(0,0,0,.3)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{
              width: 43,
              height: 43,
              borderRadius: 14,
              background: '#eeeaff',
              color: '#7258d5',
              display: 'grid',
              placeItems: 'center'
            }}>
              <Bot size={24} />
            </div>
            <div>
              <b style={{ fontSize: 17 }}>HisabBondhu Assistant</b>
              <div style={{ color: '#8990a4', fontSize: 12 }}>
                Voice-powered business helper
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: 0,
              background: '#f1f2f6',
              borderRadius: 10,
              padding: 9,
              cursor: 'pointer'
            }}
          >
            <X size={19} />
          </button>
        </div>

        <div style={{
          marginTop: 22,
          background: 'linear-gradient(135deg,#f1edff,#f8f4ff)',
          borderRadius: 18,
          padding: '24px 18px',
          textAlign: 'center'
        }}>
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            disabled={loading}
            style={{
              width: 82,
              height: 82,
              borderRadius: '50%',
              border: 'none',
              background: listening ? '#e65b69' : '#7458d8',
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(116,88,216,.25)',
              display: 'inline-grid',
              placeItems: 'center'
            }}
          >
            {loading ? (
              <Loader2 size={30} />
            ) : listening ? (
              <MicOff size={30} />
            ) : (
              <Mic size={30} />
            )}
          </button>

          <h3 style={{ margin: '15px 0 5px' }}>
            {loading
              ? 'Loading your business data...'
              : listening
                ? 'Listening...'
                : 'Tap microphone to speak'}
          </h3>

          <p style={{
            color: '#747b91',
            fontSize: 13,
            margin: 0
          }}>
            {listening
              ? 'Apnar command bolun'
              : 'Bangla ba English-e command dite paren'}
          </p>
        </div>

        <div style={{ marginTop: 17 }}>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 7
          }}>
            Voice language
          </label>

          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            style={{
              width: '100%',
              padding: 11,
              border: '1px solid #e5e7ef',
              borderRadius: 10,
              background: '#fff'
            }}
          >
            <option value="bn-BD">Bangla (Bangladesh)</option>
            <option value="en-US">English</option>
          </select>
        </div>

        <div style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 13,
          background: '#f7f7fb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 12,
            color: '#777f94',
            fontWeight: 700,
            marginBottom: 8
          }}>
            <Volume2 size={15} /> ASSISTANT RESPONSE
          </div>
          <p style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.6
          }}>
            {reply}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 7
          }}>
            Or type your command
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={command}
              onChange={e => setCommand(e.target.value)}
              placeholder="Example: Rahim 500 taka baki add"
              style={{
                minWidth: 0,
                flex: 1,
                border: '1px solid #e2e4ec',
                borderRadius: 11,
                padding: '12px 13px',
                outlineColor: '#7458d8'
              }}
            />

            <button
              type="submit"
              disabled={!command.trim() || loading}
              style={{
                border: 0,
                borderRadius: 11,
                padding: '0 15px',
                background: '#7458d8',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </form>

        {transcript && (
          <div style={{
            marginTop: 12,
            fontSize: 12,
            color: '#777f94'
          }}>
            <b>Recognized command:</b> {transcript}
          </div>
        )}

        {preview && (
          <div style={{
            marginTop: 17,
            border: '1px solid #e6e1ff',
            borderRadius: 14,
            padding: 16,
            background: '#fbfaff'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              color: '#7057cc',
              fontWeight: 800,
              fontSize: 13
            }}>
              <AlertCircle size={17} />
              CONFIRM BEFORE SAVING
            </div>

            <h3 style={{ margin: '13px 0 8px' }}>
              {preview.type === 'baki'
                ? 'New Baki Entry'
                : 'Payment Received'}
            </h3>

            <p style={{ margin: '5px 0', fontSize: 14 }}>
              Customer: <b>{preview.customer.name}</b>
            </p>

            <p style={{ margin: '5px 0', fontSize: 14 }}>
              Amount: <b>৳{preview.amount.toLocaleString('en-BD')}</b>
            </p>

            {preview.type === 'baki' ? (
              <p style={{ margin: '5px 0', fontSize: 12, color: '#777' }}>
                Default: 1 installment · First due: {today()}
              </p>
            ) : (
              <p style={{ margin: '5px 0', fontSize: 12, color: '#777' }}>
                Remaining account due: ৳
                {getCreditDue(preview.credit!).toLocaleString('en-BD')}
              </p>
            )}

            <div style={{
              display: 'flex',
              gap: 9,
              marginTop: 15,
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={confirmSave}
                disabled={saving}
                style={{
                  border: 0,
                  borderRadius: 10,
                  padding: '11px 15px',
                  background: '#198754',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7
                }}
              >
                {saving ? <Loader2 size={16} /> : <CheckCircle2 size={16} />}
                {saving ? 'Saving...' : 'Confirm & Save'}
              </button>

              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={saving}
                style={{
                  border: '1px solid #e0e2e9',
                  borderRadius: 10,
                  padding: '11px 15px',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            marginTop: 15,
            padding: 12,
            borderRadius: 10,
            background: '#fff0f0',
            color: '#c03939',
            fontSize: 13
          }}>
            {error}
          </div>
        )}

        <div style={{
          marginTop: 19,
          borderTop: '1px solid #eee',
          paddingTop: 15
        }}>
          <b style={{ fontSize: 12 }}>Try these commands:</b>
          <ul style={{
            paddingLeft: 19,
            color: '#747b91',
            fontSize: 12,
            lineHeight: 1.9,
            marginBottom: 0
          }}>
            <li>Rahim 500 taka baki add</li>
            <li>Rahim 300 taka joma</li>
            <li>Total baki koto?</li>
            <li>Total joma koto?</li>
            <li>Current due koto?</li>
          </ul>
        </div>

        <p style={{
          fontSize: 11,
          color: '#9298a8',
          textAlign: 'center',
          margin: '15px 0 0'
        }}>
          Voice recognition depends on your browser and microphone permission.
        </p>
      </div>
    </div>
  );
}

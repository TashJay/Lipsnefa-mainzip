import express from 'express';
import type { Request, Response } from 'express';

const app = express();
app.use(express.json());

// ── CORS for dev ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

// ── Config ────────────────────────────────────────────────────────────────────
const MPESA_ENV = process.env.MPESA_ENV || 'sandbox';
const BASE_URL = MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

const CONSUMER_KEY    = process.env.MPESA_CONSUMER_KEY || '';
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || '';
const SHORT_CODE      = process.env.MPESA_BUSINESS_SHORT_CODE || '';
const PASSKEY         = process.env.MPESA_PASSKEY || '';
const CALLBACK_URL    = process.env.MPESA_CALLBACK_URL || 'https://example.com/api/mpesa/callback';

// ── Token cache ───────────────────────────────────────────────────────────────
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) throw new Error(`Token fetch failed: ${res.status} ${await res.text()}`);

  const data: any = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (Number(data.expires_in) - 60) * 1000;
  return cachedToken!;
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

function getPassword(timestamp: string): string {
  return Buffer.from(`${SHORT_CODE}${PASSKEY}${timestamp}`).toString('base64');
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/mpesa/health', (_req: Request, res: Response) => {
  const configured = !!(CONSUMER_KEY && CONSUMER_SECRET && SHORT_CODE && PASSKEY);
  res.json({ ok: true, configured, env: MPESA_ENV });
});

// ── STK Push ──────────────────────────────────────────────────────────────────
app.post('/api/mpesa/stkpush', async (req: Request, res: Response) => {
  const { phone, amount, reference } = req.body as {
    phone: string;
    amount: number;
    reference: string;
  };

  if (!phone || !amount) {
    res.status(400).json({ error: 'phone and amount are required' });
    return;
  }

  if (!CONSUMER_KEY || !CONSUMER_SECRET || !SHORT_CODE || !PASSKEY) {
    res.status(503).json({ error: 'M-Pesa credentials not configured on server' });
    return;
  }

  try {
    const token = await getAccessToken();
    const timestamp = getTimestamp();
    const password = getPassword(timestamp);

    // Normalize phone: 07... → 2547...
    const normalizedPhone = phone.replace(/^0/, '254').replace(/^\+/, '');

    const body = {
      BusinessShortCode: SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount),
      PartyA: normalizedPhone,
      PartyB: SHORT_CODE,
      PhoneNumber: normalizedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: reference || 'Lips & Sips',
      TransactionDesc: 'POS Payment',
    };

    const pushRes = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data: any = await pushRes.json();

    if (data.ResponseCode === '0') {
      res.json({
        success: true,
        checkoutRequestId: data.CheckoutRequestID,
        merchantRequestId: data.MerchantRequestID,
        message: data.CustomerMessage,
      });
    } else {
      res.status(400).json({ error: data.errorMessage || data.ResponseDescription || 'STK push failed' });
    }
  } catch (err: any) {
    console.error('STK push error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── STK Query (poll status) ───────────────────────────────────────────────────
app.post('/api/mpesa/query', async (req: Request, res: Response) => {
  const { checkoutRequestId } = req.body as { checkoutRequestId: string };

  if (!checkoutRequestId) {
    res.status(400).json({ error: 'checkoutRequestId required' });
    return;
  }

  try {
    const token = await getAccessToken();
    const timestamp = getTimestamp();
    const password = getPassword(timestamp);

    const queryRes = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: SHORT_CODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });

    const data: any = await queryRes.json();

    // ResultCode 0 = success, 1032 = cancelled, 1037 = timeout
    if (data.ResultCode === '0' || data.ResultCode === 0) {
      res.json({ status: 'PAID', resultCode: data.ResultCode, message: data.ResultDesc });
    } else if (data.ResultCode === '1032' || data.ResultCode === 1032) {
      res.json({ status: 'CANCELLED', resultCode: data.ResultCode, message: 'Customer cancelled' });
    } else if (data.ResultCode === '1037' || data.ResultCode === 1037) {
      res.json({ status: 'TIMEOUT', resultCode: data.ResultCode, message: 'Request timed out' });
    } else if (data.errorCode === '500.001.1001') {
      // Still pending / being processed
      res.json({ status: 'PENDING', message: 'Waiting for customer to pay' });
    } else {
      res.json({ status: 'PENDING', resultCode: data.ResultCode, message: data.ResultDesc || 'Pending' });
    }
  } catch (err: any) {
    console.error('STK query error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Daraja Callback (receives confirmation from Safaricom) ────────────────────
app.post('/api/mpesa/callback', (req: Request, res: Response) => {
  const body = req.body?.Body?.stkCallback;
  if (body) {
    const { ResultCode, CheckoutRequestID, CallbackMetadata } = body;
    console.log('[Daraja Callback]', { ResultCode, CheckoutRequestID, CallbackMetadata });
    // In a production system you'd persist this to Firestore here
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[M-Pesa API] Running on port ${PORT} (${MPESA_ENV})`);
  if (!CONSUMER_KEY) console.warn('[M-Pesa API] WARNING: MPESA_CONSUMER_KEY not set');
});

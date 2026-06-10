import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheck, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from './Pricing.module.css';

const PLANS = [
  {
    name: 'Free',
    price: 0,
    desc: 'Perfect for occasional PDF tasks',
    color: '#8888a0',
    features: [
      'All enabled tools',
      'Up to 100MB per file',
      '10 tasks per day',
      'Files deleted after 1 hour',
      'Standard speed',
    ],
    cta: 'Get Started Free',
    link: '/register',
    featured: false,
  },
  {
    name: 'Pro',
    price: 9,
    desc: 'For professionals and power users',
    color: '#6c63ff',
    features: [
      'All enabled tools',
      'Up to 100MB per file',
      '100 tasks per day',
      'Files deleted after 1 hour',
      'UPI · Cards · Net Banking · QR',
      'Access to configured premium tools',
    ],
    cta: 'Subscribe Now',
    link: null,
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 29,
    desc: 'For teams and organizations',
    color: '#f59e0b',
    features: [
      'Everything in Pro',
      'Up to 100MB per file',
      'Unlimited tasks',
      'Files deleted after 1 hour',
      'API access',
    ],
    cta: 'Subscribe Now',
    link: null,
    featured: false,
  },
];

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Pricing() {
  const { user, updateUser } = useAuth();
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const handleSubscribe = async (plan) => {
    if (!user) {
      toast.error('Please login first to subscribe');
      return;
    }

    setBusy(plan);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway. Please try again.');
        return;
      }

      const { data } = await api.post('/payments/create-order', { plan });
      if (!data.success) {
        toast.error(data.message);
        return;
      }

      const { order } = data;
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'PDFForge',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
        order_id: order.id,
        prefill: {
          name: order.userName,
          email: order.userEmail,
        },
        theme: { color: '#6c63ff' },
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.success) {
              toast.success(`Plan upgraded to ${verifyRes.data.plan}!`);
              updateUser({ ...user, plan: verifyRes.data.plan });
            }
          } catch {
            toast.error('Payment verification failed. Contact support.');
          }
        },
        modal: {
          ondismiss: function () {
            toast('Payment cancelled', { icon: 'ℹ️' });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment failed. Try again.';
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page-enter">
      <div className={styles.header}>
        <span className={styles.tag}>Pricing</span>
        <h1>Simple, Transparent Pricing</h1>
        <p>Powered by Razorpay. Secure payments, instant plan activation.</p>
      </div>

      <div className={styles.grid}>
        {PLANS.map((plan, i) => {
          const isCurrentPlan = user?.plan === plan.name.toLowerCase();
          const isPaid = plan.price > 0;

          return (
            <motion.div
              key={plan.name}
              className={`${styles.card} ${plan.featured ? styles.featured : ''} ${isCurrentPlan ? styles.currentPlan : ''}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              {plan.featured && !isCurrentPlan && <span className={styles.badge}>Most Popular</span>}
              {isCurrentPlan && <span className={styles.badge} style={{ background: '#4caf50' }}>Current Plan</span>}
              <div className={styles.planName} style={{ color: isCurrentPlan ? '#4caf50' : plan.color }}>
                {plan.name}
              </div>
              <div className={styles.price}>
                ₹{plan.price}<span>/mo</span>
              </div>
              <p className={styles.planDesc}>{plan.desc}</p>
              <ul className={styles.features}>
                {plan.features.map(f => (
                  <li key={f}>
                    <FiCheck size={14} color={plan.color} /> {f}
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                <div className={styles.cta} style={{ background: '#e8f5e9', color: '#2e7d32', cursor: 'default', border: 'none' }}>
                  ✓ Active
                </div>
              ) : isPaid ? (
                <button
                  className={`${styles.cta} ${plan.featured ? styles.ctaFeatured : ''}`}
                  style={plan.featured ? {} : { borderColor: plan.color, color: plan.color }}
                  onClick={() => handleSubscribe(plan.name.toLowerCase())}
                  disabled={busy === plan.name.toLowerCase()}
                >
                  {busy === plan.name.toLowerCase() ? (
                    <><FiLoader className="spin" style={{ marginRight: 6 }} /> Processing...</>
                  ) : (
                    plan.cta
                  )}
                </button>
              ) : (
                <Link
                  to={user ? '/dashboard' : '/register'}
                  className={`${styles.cta} ${plan.featured ? styles.ctaFeatured : ''}`}
                  style={plan.featured ? {} : { borderColor: plan.color, color: plan.color }}
                >
                  {plan.cta}
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className={styles.paymentMethods}>
        <h3>Accepted Payment Methods</h3>
        <div className={styles.methodsGrid}>
          {['UPI (GPay, PhonePe, Paytm)', 'Credit / Debit Cards', 'Net Banking', 'International Cards', 'QR Code'].map(m => (
            <span key={m} className={styles.methodBadge}>{m}</span>
          ))}
        </div>
      </div>

      <div className={styles.faq}>
        <div className="container">
          <h2>Frequently Asked Questions</h2>
          <div className={styles.faqGrid}>
            {[
              { q: 'Is the free plan really free?', a: 'Yes. The free plan gives you access to the enabled PDF tools with a daily task limit.' },
              { q: 'How long are output files available?', a: 'Output files use expiring signed download links and are deleted from the configured server after 1 hour.' },
              { q: 'What payment methods are accepted?', a: 'All major payment methods: UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, International Cards, and QR Code.' },
              { q: 'Does this require system dependencies?', a: 'Some tools require Ghostscript or LibreOffice on the server. The setup guide lists the required dependencies.' },
            ].map(({ q, a }) => (
              <div key={q} className={styles.faqItem}>
                <h4>{q}</h4>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

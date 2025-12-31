
import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, Check, X, ChevronDown, ChevronUp,
  Mail, Search, FileText, Zap, Globe, Clock, ShieldCheck,
  Layout, Users, Lock, Mic, ArrowLeft, Building2
} from 'lucide-react';
import { fetchPlans, Plan } from '../services/planService';

const LANDING_STYLES = `
  :root {
      --bg-color: #FFFFFF;
      --text-main: #111111;
      --text-muted: #666666;
      --text-light: #999999;
      --btn-bg: #111111;
      --btn-text: #FFFFFF;
      --border-color: #E5E5E5;
      --bg-secondary: #F9FAFB;
      --ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);
      
      /* Pricing Colors */
      --pricing-bg-gradient: linear-gradient(135deg, #E8F0FE 0%, #F3F0FF 100%);
      --accent-purple: #5B4EFF;
      --accent-purple-gradient: linear-gradient(135deg, #5B4EFF 0%, #4A3Ece 100%);
  }

  .landing-page-wrapper {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-color);
      color: var(--text-main);
      height: 100vh; /* Fixed height for viewport */
      overflow-y: auto; /* Enable vertical scrolling */
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      selection-background-color: #EEE;
      scroll-behavior: smooth;
  }

  /* --- Navigation --- */
  .nav-header {
      padding: 32px 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      position: sticky; /* Sticky inside scroll container */
      top: 0;
      left: 0;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(12px);
      z-index: 100;
      border-bottom: 1px solid transparent;
      transition: border-color 0.3s;
  }
  
  .nav-header.scrolled {
      border-color: var(--border-color);
  }

  .brand-logo {
      display: flex;
      gap: 6px;
      align-items: center;
      font-weight: 700;
      font-size: 20px;
      letter-spacing: -0.03em;
      cursor: pointer;
  }
  
  .brand-logo-icon {
      width: 20px;
      height: 20px;
      background: #111;
      border-radius: 4px;
  }

  .nav-links {
      display: flex;
      gap: 32px;
      list-style: none;
  }

  .nav-links button, .nav-links a {
      font-size: 14px;
      font-weight: 500;
      color: #555;
      text-decoration: none;
      transition: color 0.2s;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
  }
  
  .nav-links button:hover, .nav-links a:hover {
      color: #111;
  }

  .nav-cta {
      padding: 10px 24px;
      border: 1px solid var(--border-color);
      border-radius: 100px;
      font-size: 13px;
      font-weight: 600;
      background: transparent;
      color: #111;
      cursor: pointer;
      transition: all 0.2s ease;
  }

  .nav-cta:hover {
      border-color: #111;
      background: #111;
      color: #fff;
  }

  /* --- Hero Section --- */
  .hero-section {
      min-height: 90vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 100px 24px 80px; /* Adjusted padding */
  }

  .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #555;
      margin-bottom: 32px;
      font-weight: 500;
      background: #F5F5F5;
      padding: 6px 14px;
      border-radius: 100px;
  }

  .status-dot {
      width: 6px;
      height: 6px;
      background-color: #00D68F;
      border-radius: 50%;
  }

  .hero-headline {
      font-size: clamp(48px, 6vw, 84px);
      font-weight: 600;
      letter-spacing: -0.04em;
      line-height: 1.05;
      color: #111;
      margin-bottom: 24px;
      max-width: 900px;
  }

  .hero-subheadline {
      font-size: 18px;
      color: var(--text-muted);
      font-weight: 400;
      max-width: 540px;
      line-height: 1.6;
      margin-bottom: 48px;
  }

  .hero-actions {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
  }

  .btn-primary {
      background-color: #111;
      color: #fff;
      padding: 16px 36px;
      border-radius: 100px;
      font-size: 15px;
      font-weight: 500;
      border: 1px solid #111;
      cursor: pointer;
      transition: transform 0.2s ease, opacity 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
  }

  .btn-primary:hover {
      opacity: 0.9;
      transform: translateY(-2px);
  }

  .btn-secondary {
      background-color: transparent;
      color: #111;
      padding: 16px 36px;
      border-radius: 100px;
      font-size: 15px;
      font-weight: 500;
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: all 0.2s ease;
  }

  .btn-secondary:hover {
      border-color: #111;
  }

  /* --- Shared Section Styles --- */
  .section {
      padding: 120px 48px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
  }

  .section-header {
      margin-bottom: 80px;
      max-width: 600px;
  }

  .section-title {
      font-size: 40px;
      font-weight: 600;
      letter-spacing: -0.03em;
      margin-bottom: 16px;
      line-height: 1.1;
  }

  .section-subtitle {
      font-size: 18px;
      color: var(--text-muted);
      line-height: 1.5;
  }

  /* --- Features Grid --- */
  .features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
  }

  .feature-card {
      background: var(--bg-secondary);
      padding: 48px;
      border-radius: 16px;
      transition: transform 0.3s var(--ease-out), box-shadow 0.3s;
      display: flex;
      flex-direction: column;
      gap: 24px;
      border: 1px solid transparent;
  }

  .feature-card:hover {
      transform: translateY(-4px);
      background: #FFFFFF;
      border-color: var(--border-color);
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.05);
  }

  .feature-icon-wrapper {
      width: 48px;
      height: 48px;
      background: #FFF;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #111;
  }

  .feature-card h3 {
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.02em;
  }

  .feature-card p {
      font-size: 16px;
      color: var(--text-muted);
      line-height: 1.6;
  }

  /* --- How It Works --- */
  .steps-container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 40px;
      position: relative;
  }
  
  .step-item {
      position: relative;
      padding-top: 24px;
  }

  .step-number {
      font-size: 64px;
      font-weight: 600;
      color: #E5E5E5;
      line-height: 1;
      margin-bottom: 24px;
      font-family: 'Inter', sans-serif;
      letter-spacing: -0.04em;
  }

  .step-content h3 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 12px;
  }

  .step-content p {
      font-size: 15px;
      color: var(--text-muted);
      line-height: 1.6;
  }

  /* --- Comparison --- */
  .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      align-items: stretch;
  }

  .comp-card {
      padding: 56px;
      border-radius: 24px;
      display: flex;
      flex-direction: column;
  }

  .comp-card.others {
      background: #FFFFFF;
      border: 1px solid var(--border-color);
  }

  .comp-card.tyna {
      background: #111;
      color: #FFF;
      box-shadow: 0 30px 60px -12px rgba(0,0,0,0.25);
      position: relative;
      overflow: hidden;
  }

  .comp-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 40px;
      letter-spacing: -0.02em;
  }
  
  .tyna .comp-title { color: #FFF; }
  .others .comp-title { color: #999; }

  .comp-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 20px;
  }

  .comp-item {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 16px;
  }

  .others .comp-item { color: #999; }
  .tyna .comp-item { color: #EEE; }

  .icon-box {
      display: flex;
      align-items: center;
      justify-content: center;
  }
  
  /* --- Stats --- */
  .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 48px;
      border-top: 1px solid var(--border-color);
      border-bottom: 1px solid var(--border-color);
      padding: 64px 0;
  }

  .stat-item {
      text-align: center;
  }

  .stat-number {
      font-size: 72px;
      font-weight: 600;
      letter-spacing: -0.04em;
      color: #111;
      line-height: 1;
      margin-bottom: 12px;
      display: block;
  }

  .stat-label {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #111;
      margin-bottom: 8px;
      display: block;
  }

  .stat-desc {
      font-size: 14px;
      color: var(--text-muted);
  }

  /* --- FAQ --- */
  .faq-list {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
  }

  .faq-item {
      border-bottom: 1px solid var(--border-color);
  }

  .faq-question {
      padding: 24px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      font-size: 18px;
      font-weight: 500;
      color: #111;
      transition: color 0.2s;
  }

  .faq-question:hover {
      color: #444;
  }

  .faq-answer {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s var(--ease-out), opacity 0.3s;
      opacity: 0;
  }

  .faq-item.active .faq-answer {
      max-height: 200px;
      opacity: 1;
      padding-bottom: 24px;
  }

  .faq-answer p {
      color: var(--text-muted);
      line-height: 1.6;
      font-size: 16px;
  }

  /* --- Footer --- */
  .footer {
      background: #FAFAFA;
      padding: 100px 48px 48px;
      border-top: 1px solid var(--border-color);
  }

  .footer-cta-container {
      text-align: center;
      margin-bottom: 100px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
  }

  .footer-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 40px;
      max-width: 1200px;
      margin: 0 auto 60px;
  }

  .footer-col h4 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 24px;
      color: #111;
  }

  .footer-col ul {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 16px;
  }

  .footer-col a {
      font-size: 14px;
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.2s;
  }

  .footer-col a:hover {
      color: #111;
  }

  .footer-bottom {
      max-width: 1200px;
      margin: 0 auto;
      padding-top: 32px;
      border-top: 1px solid #E5E5E5;
      display: flex;
      justify-content: space-between;
      color: #999;
      font-size: 13px;
  }

  /* --- Pricing Page Styles --- */
  .pricing-wrapper {
      background: var(--pricing-bg-gradient);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 160px; /* Increased from 80px for visual separation */
      padding-bottom: 120px;
      font-family: 'Inter', sans-serif;
  }

  .pricing-header {
      text-align: center;
      margin-bottom: 48px;
      max-width: 700px;
      padding: 0 24px;
  }

  .pricing-title {
      font-size: 56px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #111;
      margin-bottom: 24px;
  }

  .pricing-subtitle {
      font-size: 18px;
      color: #666;
      line-height: 1.6;
  }

  .billing-toggle-container {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 60px;
      background: rgba(255,255,255,0.5);
      padding: 6px;
      border-radius: 100px;
      border: 1px solid rgba(255,255,255,0.8);
      backdrop-filter: blur(8px);
  }

  .billing-label {
      font-size: 15px;
      font-weight: 500;
      color: #444;
      cursor: pointer;
  }
  
  .billing-toggle-switch {
      width: 52px;
      height: 28px;
      background: #E5E7EB;
      border-radius: 30px;
      position: relative;
      cursor: pointer;
      transition: background 0.3s;
  }
  
  .billing-toggle-switch.active {
      background: var(--accent-purple);
  }

  .billing-toggle-thumb {
      width: 24px;
      height: 24px;
      background: #FFF;
      border-radius: 50%;
      position: absolute;
      top: 2px;
      left: 2px;
      transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .billing-toggle-switch.active .billing-toggle-thumb {
      transform: translateX(24px);
  }

  .billing-discount {
      font-size: 12px;
      font-weight: 700;
      color: var(--accent-purple);
      background: rgba(91, 78, 255, 0.1);
      padding: 4px 8px;
      border-radius: 100px;
  }

  .pricing-cards-container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      max-width: 1200px;
      width: 100%;
      padding: 0 24px;
      margin-bottom: 80px; /* Space for Enterprise section */
  }

  .pricing-card {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      transition: transform 0.3s, box-shadow 0.3s;
      border: 1px solid rgba(0,0,0,0.02);
      position: relative;
  }

  .pricing-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.08);
  }

  .pricing-card.popular {
      border: 2px solid var(--accent-purple);
      box-shadow: 0 10px 40px -10px rgba(91, 78, 255, 0.15);
  }

  .popular-badge {
      position: absolute;
      top: -12px;
      right: 24px;
      background: var(--accent-purple);
      color: white;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 100px;
      letter-spacing: 0.05em;
  }

  .plan-name {
      font-size: 18px;
      font-weight: 700;
      color: #111;
      margin-bottom: 8px;
  }

  .plan-price {
      display: flex;
      align-items: baseline;
      margin-bottom: 8px;
  }

  .price-amount {
      font-size: 48px;
      font-weight: 700;
      color: #111;
      letter-spacing: -0.02em;
  }

  .price-period {
      font-size: 16px;
      color: #666;
      margin-left: 4px;
  }

  .plan-desc {
      font-size: 14px;
      color: #666;
      margin-bottom: 24px;
      line-height: 1.5;
  }

  .pricing-features {
      list-style: none;
      margin-bottom: 32px;
      flex: 1;
  }

  .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 14px;
      color: #555;
      line-height: 1.5;
  }

  .feature-check {
      color: var(--accent-purple);
      flex-shrink: 0;
      margin-top: 2px;
  }

  .btn-pricing {
      width: 100%;
      height: 48px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
  }

  .btn-pricing.dark {
      background: #1F2937;
      color: #FFF;
  }
  .btn-pricing.dark:hover {
      background: #000;
      transform: scale(1.02);
  }

  .btn-pricing.purple {
      background: var(--accent-purple-gradient);
      color: #FFF;
      box-shadow: 0 4px 12px rgba(91, 78, 255, 0.25);
  }
  .btn-pricing.purple:hover {
      opacity: 0.95;
      transform: scale(1.02);
      box-shadow: 0 8px 20px rgba(91, 78, 255, 0.3);
  }

  /* Enterprise Banner */
  .enterprise-section {
      width: 100%;
      max-width: 1200px;
      padding: 0 24px;
      margin-bottom: 100px;
  }
  
  .enterprise-card {
      background: #111;
      border-radius: 20px;
      padding: 48px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      position: relative;
      overflow: hidden;
  }

  .enterprise-card::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 300px;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05));
      pointer-events: none;
  }

  .enterprise-content {
      position: relative;
      z-index: 2;
      max-width: 600px;
  }

  .enterprise-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
  }

  .enterprise-desc {
      color: #AAA;
      font-size: 16px;
      line-height: 1.6;
  }

  .btn-enterprise {
      background: white;
      color: black;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      transition: transform 0.2s;
      z-index: 2;
  }
  .btn-enterprise:hover {
      transform: scale(1.02);
  }

  .pricing-faq {
      max-width: 800px;
      width: 100%;
      padding: 0 24px 80px;
      text-align: center;
  }

  .pricing-faq h3 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 40px;
  }

  .pricing-faq-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      text-align: left;
  }

  .p-faq-item h4 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
  }
  .p-faq-item p {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
  }

  /* --- Responsive --- */
  @media (max-width: 1024px) {
      .hero-headline { font-size: 56px; }
      .features-grid { grid-template-columns: 1fr; }
      .comparison-grid { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: 1fr; gap: 40px; }
      .steps-container { grid-template-columns: 1fr; gap: 40px; }
      .footer-grid { grid-template-columns: 1fr 1fr; gap: 40px; }
      .pricing-cards-container { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
      .pricing-faq-grid { grid-template-columns: 1fr; }
      .enterprise-card { flex-direction: column; text-align: center; gap: 32px; }
  }

  @media (max-width: 768px) {
      .nav-links { display: none; }
      .nav-header { padding: 20px 24px; }
      .hero-section { padding: 140px 24px 60px; }
      .hero-headline { font-size: 42px; }
      .hero-subheadline { font-size: 16px; }
      .section { padding: 80px 24px; }
      .section-title { font-size: 32px; }
      .comp-card { padding: 32px; }
      .footer-grid { grid-template-columns: 1fr; }
      .footer-cta-container { margin-bottom: 60px; }
      
      .pricing-title { font-size: 40px; }
      .pricing-cards-container { padding-left: 24px; padding-right: 24px; }
  }

  /* Fade In Animation Helpers */
  .fade-in-up {
      animation: fadeInUp 0.8s var(--ease-out) forwards;
      opacity: 0;
      transform: translateY(20px);
  }

  .delay-1 { animation-delay: 0.1s; }
  .delay-2 { animation-delay: 0.2s; }
  .delay-3 { animation-delay: 0.3s; }

  @keyframes fadeInUp {
      to {
          opacity: 1;
          transform: translateY(0);
      }
  }
`;

interface PricingPageProps {
  onBack: () => void;
  onGetStarted: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onBack, onGetStarted }) => {
    const [isAnnual, setIsAnnual] = useState(false);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Charger les plans depuis le backend
    useEffect(() => {
        const loadPlans = async () => {
            try {
                setLoading(true);
                setError(null);
                const interval = isAnnual ? 'year' : 'month';
                const fetchedPlans = await fetchPlans(interval);
                console.log('[PricingPage] Plans loaded:', fetchedPlans);
                setPlans(fetchedPlans);
            } catch (err) {
                console.error('[PricingPage] Error loading plans:', err);
                setError('Failed to load plans. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        loadPlans();
    }, [isAnnual]); // Recharger quand on change monthly/yearly

    return (
        <div className="pricing-wrapper">
            <div className="nav-header" style={{ position: 'fixed', top: 0, width: '100%', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div className="brand-logo" onClick={onBack}>
                    <div className="brand-logo-icon"></div>
                    Tyna.
                </div>
                <button onClick={onBack} className="nav-cta" style={{ border: 'none', background: 'transparent', fontSize: '14px', color: '#666' }}>
                    <ArrowLeft size={16} style={{ display: 'inline', marginRight: '6px' }} />
                    Back to Home
                </button>
            </div>

            <div className="pricing-header fade-in-up delay-1">
                <h1 className="pricing-title">Start for free.</h1>
                <p className="pricing-subtitle">
                    Whether you're using Tyna for meetings, sales calls, or consultations, it's free to start. Upgrade anytime for unlimited access.
                </p>
            </div>

            {/* Toggle */}
            <div className="billing-toggle-container fade-in-up delay-2">
                <span className={`billing-label ${!isAnnual ? 'text-[#111]' : ''}`} onClick={() => setIsAnnual(false)}>Bill Monthly</span>
                <div className={`billing-toggle-switch ${isAnnual ? 'active' : ''}`} onClick={() => setIsAnnual(!isAnnual)}>
                    <div className="billing-toggle-thumb"></div>
                </div>
                <span className={`billing-label ${isAnnual ? 'text-[#111]' : ''}`} onClick={() => setIsAnnual(true)}>Bill Yearly</span>
                <span className="billing-discount">-50%</span>
            </div>

            {/* Cards */}
            <div className="pricing-cards-container fade-in-up delay-3">
                {loading ? (
                    <div className="text-center py-10">Loading plans...</div>
                ) : error ? (
                    <div className="text-center py-10 text-red-500">{error}</div>
                ) : plans.length > 0 ? (
                    plans.map((plan, index) => {
                        const isPopular = plan.name === 'Plus' || index === 1;
                        const period = plan.interval === 'year' ? 'year' : 'month';
                        const hasTrial = plan.trial_days && plan.trial_days > 0;
                        
                        return (
                            <div key={plan.id} className={`pricing-card ${isPopular ? 'popular' : ''}`}>
                                {isPopular && <div className="popular-badge">Most Popular</div>}
                                <h3 className="plan-name">{plan.name}</h3>
                                <div className="plan-price">
                                    <span className="price-amount">{plan.amount_formatted || '$0'}</span>
                                    <span className="price-period">/ {period}</span>
                                </div>
                                <p className="plan-desc">{plan.description || 'Perfect plan for your needs.'}</p>
                                <ul className="pricing-features">
                                    {/* Features will be displayed based on plan name */}
                                    {plan.name === 'Starter' && (
                                        <>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> 5 meetings per month</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> Basic AI notetaking</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> 2 languages supported</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> Email summaries</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> 24-hour support response</li>
                                        </>
                                    )}
                                    {plan.name === 'Plus' && (
                                        <>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> Unlimited meetings</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> Advanced AI notetaking</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> 25+ languages supported</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> Real-time transcription</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> Instant follow-up emails</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> Contact intelligence</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> Priority support</li>
                                        </>
                                    )}
                                    {plan.name === 'Pro' && (
                                        <>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> Everything in Plus</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> 100% undetectable mode</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> Screen share invisibility</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> Custom AI instructions</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> Team collaboration tools</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> API access</li>
                                            <li className="feature-item"><Check size={16} className="feature-check" /> Dedicated account manager</li>
                                        </>
                                    )}
                                </ul>
                                <button 
                                    onClick={async () => {
                                        if (plan.amount === 0) {
                                            onGetStarted();
                                        } else {
                                            try {
                                                const { createSubscription } = await import('../services/planService');
                                                const successUrl = `${window.location.origin}/dashboard?subscription=success`;
                                                const cancelUrl = `${window.location.origin}/pricing?subscription=cancelled`;
                                                const { checkout_url } = await createSubscription(plan.id, successUrl, cancelUrl);
                                                window.location.href = checkout_url;
                                            } catch (error) {
                                                console.error('Failed to create subscription:', error);
                                                const errorMessage = error instanceof Error ? error.message : 'Failed to start subscription. Please try again.';
                                                alert(errorMessage);
                                            }
                                        }
                                    }}
                                    className={`btn-pricing ${isPopular ? 'purple' : 'dark'}`}
                                >
                                    {plan.amount === 0 ? 'Get Started' : hasTrial ? `Start ${plan.trial_days}-Day Free Trial` : 'Subscribe'}
                                </button>
                            </div>
                        );
                    })
                ) : (
                    // Fallback to default plans if API fails
                    <>
                        <div className="pricing-card">
                            <h3 className="plan-name">Starter</h3>
                            <div className="plan-price">
                                <span className="price-amount">$0</span>
                                <span className="price-period">/ month</span>
                            </div>
                            <p className="plan-desc">Perfect for trying Tyna and basic meeting needs.</p>
                            <ul className="pricing-features">
                                <li className="feature-item"><Check size={16} className="feature-check" /> 5 meetings per month</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> Basic AI notetaking</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> 2 languages supported</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> Email summaries</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> 24-hour support response</li>
                            </ul>
                            <button onClick={onGetStarted} className="btn-pricing dark">Get Started</button>
                        </div>
                        <div className="pricing-card popular">
                            <div className="popular-badge">Most Popular</div>
                            <h3 className="plan-name">Plus</h3>
                            <div className="plan-price">
                                <span className="price-amount">${isAnnual ? '8' : '15'}</span>
                                <span className="price-period">/ month</span>
                            </div>
                            <p className="plan-desc">For professionals who have frequent meetings.</p>
                            <ul className="pricing-features">
                                <li className="feature-item"><Check size={16} className="feature-check" /> Unlimited meetings</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> Advanced AI notetaking</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> 25+ languages supported</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> Real-time transcription</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> Instant follow-up emails</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> Contact intelligence</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> Priority support</li>
                            </ul>
                            <button onClick={onGetStarted} className="btn-pricing purple">Start Free Trial</button>
                        </div>
                        <div className="pricing-card">
                            <h3 className="plan-name">Pro</h3>
                            <div className="plan-price">
                                <span className="price-amount">${isAnnual ? '15' : '30'}</span>
                                <span className="price-period">/ month</span>
                            </div>
                            <p className="plan-desc">Complete invisibility and enterprise features.</p>
                            <ul className="pricing-features">
                                <li className="feature-item"><Check size={16} className="feature-check" /> Everything in Plus</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> 100% undetectable mode</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> Screen share invisibility</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> Custom AI instructions</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> Team collaboration tools</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> API access</li>
                                <li className="feature-item"><Check size={16} className="feature-check" /> Dedicated account manager</li>
                            </ul>
                            <button onClick={onGetStarted} className="btn-pricing dark">Start Free Trial</button>
                        </div>
                    </>
                )}
            </div>

            {/* Enterprise Banner */}
            <div className="enterprise-section fade-in-up delay-3">
                <div className="enterprise-card">
                    <div className="enterprise-content">
                        <h3 className="enterprise-title"><Building2 size={32} /> Enterprise</h3>
                        <p className="enterprise-desc">
                            Need custom integrations, on-premise deployment, or dedicated support? 
                            We offer tailored solutions for large organizations.
                        </p>
                    </div>
                    <button className="btn-enterprise">Contact Sales</button>
                </div>
            </div>

            {/* FAQ */}
            <div className="pricing-faq fade-in-up delay-3">
                <h3>Frequently Asked Questions</h3>
                <div className="pricing-faq-grid">
                    <div className="p-faq-item">
                        <h4>Can I change plans anytime?</h4>
                        <p>Yes, upgrade or downgrade at any time. Changes take effect immediately.</p>
                    </div>
                    <div className="p-faq-item">
                        <h4>Is there a free trial?</h4>
                        <p>Yes, 7 days free trial for Plus and Pro plans. No charges if you cancel before it ends.</p>
                    </div>
                    <div className="p-faq-item">
                        <h4>What payment methods do you accept?</h4>
                        <p>All major credit cards, PayPal, and invoicing for annual enterprise plans.</p>
                    </div>
                    <div className="p-faq-item">
                        <h4>Can I cancel anytime?</h4>
                        <p>Yes, cancel anytime with no questions asked from your dashboard.</p>
                    </div>
                </div>
            </div>

            <div className="text-center text-gray-400 text-sm pb-10">
                <ShieldCheck size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                Secure payments. 7-day money-back guarantee.
            </div>

        </div>
    );
};

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const scrollToSection = (sectionId: string) => {
    setShowPricing(false);
    // slight delay to allow React to render the main landing page view
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  if (showPricing) {
      return (
          <div className="landing-page-wrapper">
              <style>{LANDING_STYLES}</style>
              <PricingPage onBack={() => setShowPricing(false)} onGetStarted={onGetStarted} />
          </div>
      );
  }

  return (
    <div className="landing-page-wrapper">
      <style>{LANDING_STYLES}</style>

      {/* Navigation */}
      <nav className="nav-header">
        <div className="brand-logo" onClick={() => scrollToSection('hero')}>
          <div className="brand-logo-icon"></div>
          Tyna.
        </div>

        <ul className="nav-links">
          <li><button onClick={() => scrollToSection('features')}>Features</button></li>
          <li><button onClick={() => setShowPricing(true)}>Pricing</button></li>
          <li><button onClick={() => scrollToSection('how')}>How It Works</button></li>
          <li><button onClick={() => scrollToSection('faq')}>FAQ</button></li>
        </ul>

        <button onClick={onGetStarted} className="nav-cta">
          Get Started
        </button>
      </nav>

      {/* Main Hero */}
      <header id="hero" className="hero-section">
        <h1 className="hero-headline fade-in-up delay-1">
          The invisible meeting<br />
          assistant for pros.
        </h1>

        <p className="hero-subheadline fade-in-up delay-2">
          Takes flawless notes, answers questions in real-time, and makes you the most prepared person on every call—completely undetectable.
        </p>

        <div className="hero-actions fade-in-up delay-3">
          <button onClick={onGetStarted} className="btn-primary">
            Get Tyna for today <ArrowRight size={16} />
          </button>
          <button onClick={() => setShowPricing(true)} className="btn-secondary">
            View Pricing
          </button>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="section">
        <div className="section-header">
           <h2 className="section-title">Elevate your meetings.</h2>
           <p className="section-subtitle">Advanced intelligence that works silently in the background to give you an edge.</p>
        </div>

        <div className="features-grid">
           {/* Feature 1 */}
           <div className="feature-card">
              <div className="feature-icon-wrapper">
                 <Zap size={24} />
              </div>
              <div>
                <h3>Real-time Intelligence</h3>
                <p>Tyna uses screen capture, transcript analysis, and AI to answer questions and provide context instantly, right when you need it.</p>
              </div>
           </div>
           
           {/* Feature 2 */}
           <div className="feature-card">
              <div className="feature-icon-wrapper">
                 <Mail size={24} />
              </div>
              <div>
                <h3>Instant Follow-ups</h3>
                <p>Send perfectly crafted follow-up emails within seconds after every call, capturing all key points and action items automatically.</p>
              </div>
           </div>

           {/* Feature 3 */}
           <div className="feature-card">
              <div className="feature-icon-wrapper">
                 <Search size={24} />
              </div>
              <div>
                <h3>Deep Contact Intelligence</h3>
                <p>Learn everything about your contacts before meetings—their background, interests, role, company insights, and relevant context.</p>
              </div>
           </div>

           {/* Feature 4 */}
           <div className="feature-card">
              <div className="feature-icon-wrapper">
                 <FileText size={24} />
              </div>
              <div>
                <h3>Beautiful Meeting Notes</h3>
                <p>AI-generated meeting notes that are instantly shareable, perfectly formatted, and capture every important detail.</p>
              </div>
           </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="section" style={{ background: '#FAFAFA' }}>
         <div className="section-header">
            <h2 className="section-title">Meeting notes in 3 steps.</h2>
            <p className="section-subtitle">The easiest way to get beautiful, shareable meeting notes.</p>
         </div>

         <div className="steps-container">
            <div className="step-item">
               <div className="step-number">01</div>
               <div className="step-content">
                  <h3>Start Tyna</h3>
                  <p>Simply launch Tyna before your meeting begins. It works silently in the background.</p>
               </div>
            </div>
            <div className="step-item">
               <div className="step-number">02</div>
               <div className="step-content">
                  <h3>Have Your Meeting</h3>
                  <p>Tyna listens, transcribes, and assists in real-time without anyone knowing it's there.</p>
               </div>
            </div>
            <div className="step-item">
               <div className="step-number">03</div>
               <div className="step-content">
                  <h3>Get Your Notes</h3>
                  <p>Instantly receive comprehensive, organized notes plus AI-generated insights.</p>
               </div>
            </div>
         </div>
      </section>

      {/* Undetectable Comparison */}
      <section id="undetectable" className="section">
         <div className="section-header">
            <h2 className="section-title">No meeting bots.<br/>100% undetectable.</h2>
            <p className="section-subtitle">How does Tyna stay invisible while others disrupt?</p>
         </div>

         <div className="comparison-grid">
            {/* Competitors */}
            <div className="comp-card others">
               <div className="comp-title">Other AI Notetakers</div>
               <ul className="comp-list">
                  <li className="comp-item"><span className="icon-box text-red-500"><X size={20} /></span> Joins as an invasive participant</li>
                  <li className="comp-item"><span className="icon-box text-red-500"><X size={20} /></span> Visible to everyone in the meeting</li>
                  <li className="comp-item"><span className="icon-box text-red-500"><X size={20} /></span> Creates awkward bot announcements</li>
                  <li className="comp-item"><span className="icon-box text-red-500"><X size={20} /></span> Disrupts meeting flow</li>
                  <li className="comp-item"><span className="icon-box text-red-500"><X size={20} /></span> Reduces authenticity</li>
               </ul>
            </div>

            {/* Tyna */}
            <div className="comp-card tyna">
               <div className="comp-title">Tyna Assistant</div>
               <ul className="comp-list">
                  <li className="comp-item"><span className="icon-box text-green-400"><Check size={20} /></span> Completely invisible to others</li>
                  <li className="comp-item"><span className="icon-box text-green-400"><Check size={20} /></span> Undetectable by screen share</li>
                  <li className="comp-item"><span className="icon-box text-green-400"><Check size={20} /></span> Works locally on your device</li>
                  <li className="comp-item"><span className="icon-box text-green-400"><Check size={20} /></span> Natural, authentic conversations</li>
                  <li className="comp-item"><span className="icon-box text-green-400"><Check size={20} /></span> 100% privacy-focused design</li>
               </ul>
            </div>
         </div>
      </section>

      {/* Specs / Stats */}
      <section className="section">
         <div className="stats-grid">
            <div className="stat-item">
               <span className="stat-number">25+</span>
               <span className="stat-label">Languages</span>
               <p className="stat-desc">English, Spanish, Mandarin, French, and more.</p>
            </div>
            <div className="stat-item">
               <span className="stat-number">200ms</span>
               <span className="stat-label">Response Time</span>
               <p className="stat-desc">Lightning-fast transcription and AI responses.</p>
            </div>
            <div className="stat-item">
               <span className="stat-number">97%</span>
               <span className="stat-label">Accuracy</span>
               <p className="stat-desc">Industry-leading accuracy across all accents.</p>
            </div>
         </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section" style={{ paddingTop: 0 }}>
         <div className="section-header">
            <h2 className="section-title">Common Questions</h2>
         </div>

         <div className="faq-list">
            {[
              {
                q: "Why invisible vs. a regular AI notetaker?",
                a: "Regular notetakers join your calls as 'bots', which can make clients feel uncomfortable or recorded. Tyna works locally on your device, listening to system audio just like you do, ensuring natural conversations without the awkward bot presence."
              },
              {
                q: "Who is Tyna for?",
                a: "Tyna is built for professionals who attend high-stakes meetings: Sales Executives, Consultants, Recruiters, and Founders who need to focus on the conversation rather than taking notes."
              },
              {
                q: "Is Tyna free?",
                a: "We offer a generous free tier that includes 300 minutes of transcription per month. Our Pro plan offers unlimited transcription and advanced AI features."
              },
              {
                q: "How is it undetectable?",
                a: "Tyna runs entirely on your local machine and captures system audio output. It does not interface with the meeting API (Zoom, Teams, etc.) as a participant, so it is physically impossible for others to see it."
              },
              {
                q: "What platforms are supported?",
                a: "Tyna works with Zoom, Google Meet, Microsoft Teams, Slack Huddles, and any other conferencing software because it captures audio at the system level on Windows and macOS."
              },
              {
                q: "Is my data secure?",
                a: "Absolutely. Tyna processes audio locally and uses enterprise-grade encryption for all cloud features. We do not sell your data, and your transcripts are private to you."
              }
            ].map((faq, index) => (
               <div key={index} className={`faq-item ${activeFaq === index ? 'active' : ''}`}>
                  <div className="faq-question" onClick={() => toggleFaq(index)}>
                     {faq.q}
                     {activeFaq === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                  <div className="faq-answer">
                     <p>{faq.a}</p>
                  </div>
               </div>
            ))}
         </div>
      </section>

      {/* Footer */}
      <footer className="footer">
         <div className="footer-cta-container">
            <h2 className="section-title">Meeting AI that helps during the call, not after.</h2>
            <p className="section-subtitle" style={{ marginBottom: '32px' }}>Try Tyna on your next meeting today.</p>
            <button onClick={onGetStarted} className="btn-primary" style={{ margin: '0 auto' }}>
               Get Tyna for Windows
            </button>
         </div>

         <div className="footer-grid">
            <div className="footer-col">
               <h4>Product</h4>
               <ul>
                  <li><button onClick={() => scrollToSection('features')}>Features</button></li>
                  <li><button onClick={() => setShowPricing(true)}>Pricing</button></li>
                  <li><button onClick={() => scrollToSection('how')}>How It Works</button></li>
                  <li><button onClick={() => scrollToSection('faq')}>FAQ</button></li>
               </ul>
            </div>
            <div className="footer-col">
               <h4>Use Cases</h4>
               <ul>
                  <li><a href="#">Sales Teams</a></li>
                  <li><a href="#">Consultants</a></li>
                  <li><a href="#">Recruiters</a></li>
                  <li><a href="#">Executives</a></li>
               </ul>
            </div>
            <div className="footer-col">
               <h4>Company</h4>
               <ul>
                  <li><a href="#">About</a></li>
                  <li><a href="#">Blog</a></li>
                  <li><a href="#">Careers</a></li>
                  <li><a href="#">Contact</a></li>
               </ul>
            </div>
            <div className="footer-col">
               <h4>Legal</h4>
               <ul>
                  <li><a href="#">Privacy Policy</a></li>
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">Security</a></li>
                  <li><a href="#">GDPR</a></li>
               </ul>
            </div>
         </div>

         <div className="footer-bottom">
            <div>© 2025 Tyna AI Inc. All rights reserved.</div>
            <div style={{ display: 'flex', gap: '20px' }}>
               <a href="#" style={{ color: '#999', textDecoration: 'none' }}>Twitter</a>
               <a href="#" style={{ color: '#999', textDecoration: 'none' }}>LinkedIn</a>
               <a href="#" style={{ color: '#999', textDecoration: 'none' }}>Instagram</a>
            </div>
         </div>
      </footer>

    </div>
  );
};
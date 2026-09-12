import { Link, useNavigate } from 'react-router-dom';
import { MENTORA_FAQS } from '../data/helpContent';
import { useAuth, roleHome } from '../context/AuthContext';

type Section = { title: string; body: string };

const TERMS: Section[] = [
  { title: 'Using Mentora', body: 'Mentora connects parents and students with tutors and provides tools for profiles, bookings, communications, learning activity, and payments. Users must provide accurate information and use the platform only for lawful educational purposes.' },
  { title: 'Parent responsibilities', body: 'Parents own and manage student profiles, Student IDs, passwords, bookings, and tutor communications. Parents must supervise children appropriately, protect student credentials, and ensure information submitted about a child is accurate and authorized.' },
  { title: 'Tutor responsibilities', body: 'Tutors must provide accurate qualifications and availability, act professionally, protect student information, follow safeguarding expectations, and deliver only the services they are qualified and booked to provide.' },
  { title: 'Student and child safety', body: 'Students must use parent-managed accounts. Student-to-tutor messaging is not provided. Parents should supervise sessions as appropriate and promptly report conduct, content, or contact that creates a safety concern.' },
  { title: 'Acceptable use', body: 'Users must not harass others, misrepresent identity or qualifications, bypass account controls, misuse personal information, interfere with the service, upload harmful material, or use Mentora for unlawful or exploitative activity.' },
  { title: 'Accounts and security', body: 'You are responsible for protecting account credentials and activity performed through your account. Notify Mentora promptly if credentials are lost, disclosed, or used without authorization.' },
  { title: 'Payments, cancellations, and refunds', body: 'Prices and available payment methods are shown before confirmation. Cancellation and refund eligibility depend on the terms displayed for the relevant booking and applicable payment-provider processing.' },
  { title: 'Platform availability and limitations', body: 'Mentora may change, suspend, or discontinue features and cannot guarantee uninterrupted availability. Tutor verification and platform information support decision-making but do not replace a parent’s judgment and supervision.' },
  { title: 'User-provided information', body: 'You retain responsibility for information and materials you submit and grant Mentora permission to process them as needed to operate, secure, and improve the service, subject to the Privacy Policy.' },
  { title: 'Suspension and termination', body: 'Mentora may restrict or close accounts that create safety, fraud, legal, or platform-integrity risks. Users may request account deletion subject to legitimate retention requirements.' },
  { title: 'Liability and disputes', body: 'The final allocation of liability, governing law, dispute process, refund rules, and jurisdiction must be reviewed and approved by qualified legal counsel before production launch.' },
  { title: 'Contact', body: 'Questions, reports, or disputes can be sent to helpdesk@mentora.dev.' },
];

const PRIVACY: Section[] = [
  { title: 'Information collected', body: 'Mentora may collect account details, contact information, profile content, authentication events, bookings, learning activity, support requests, device information, and service usage data.' },
  { title: 'Parent and student information', body: 'Parents provide their own information and create student profiles that may include a student name, age, grade, interests, photograph, Student ID, lesson history, and progress information.' },
  { title: 'Tutor information', body: 'Tutor information may include identity, contact details, profile content, subjects, qualifications, verification documents, availability, bookings, reviews, and payout-related records.' },
  { title: 'Children’s data', body: 'Student accounts are parent-managed. Mentora should collect only information needed to provide and protect the learning service. The final children’s privacy approach and consent language require legal review before production launch.' },
  { title: 'Authentication and payments', body: 'Authentication providers process login credentials and session information. Payment providers process payment details; Mentora should store only the transaction and payment-method references required to operate the service.' },
  { title: 'How information is used', body: 'Information is used to create accounts, match tutors, manage lessons and payments, display progress, deliver notifications, provide support, prevent abuse, and maintain service security.' },
  { title: 'Sharing', body: 'Information may be shared with tutors, parents, service providers, and authorities only as necessary for the service, safety, payment processing, legal obligations, or a user’s instructions.' },
  { title: 'Security and retention', body: 'Mentora uses technical and organizational safeguards appropriate to the service. Information should be retained only while needed for service, safety, financial, dispute, and legal purposes.' },
  { title: 'Your choices and rights', body: 'Depending on applicable law, users may request access, correction, export, restriction, objection, or deletion. Some records may be retained where required for security, payments, disputes, or law.' },
  { title: 'Cookies and analytics', body: 'Mentora may use essential browser storage for sessions and preferences. Any production analytics or non-essential cookies should be documented and controlled before launch.' },
  { title: 'Account deletion and contact', body: 'Account deletion options are available in account settings where supported. Privacy questions and requests can be sent to helpdesk@mentora.dev.' },
  { title: 'Review notice', body: 'This policy is a product-ready draft, not a claim of compliance with any specific law. It must be reviewed by qualified legal counsel before production launch.' },
];

export function LegalHelpPage({ kind }: { kind: 'terms' | 'privacy' | 'faq' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const title = kind === 'terms' ? 'Terms & Conditions' : kind === 'privacy' ? 'Privacy Policy' : 'Frequently Asked Questions';
  const intro = kind === 'faq' ? 'Answers to common questions about using Mentora.' : 'Draft for product review. Legal counsel must review this content before production launch.';
  const closePage = () => {
    const historyIndex = Number(window.history.state?.idx ?? 0);
    if (historyIndex > 0) { navigate(-1); return; }
    // No real history to go back to (e.g. a fresh page load or direct link) — for a
    // signed-in user this must land back in their own dashboard, never the public
    // landing page, which would look like an unexpected sign-out.
    navigate(user ? roleHome(user.role) : '/', { replace: true });
  };

  return <main className="legal-page"><header><Link className="legal-brand-link" to="/">Mentora</Link><div className="legal-header-actions"><Link to="/login">Sign in</Link><button type="button" className="legal-close-button" onClick={closePage} aria-label={`Close ${title}`}><span aria-hidden="true">×</span> Close</button></div></header><article><p className="legal-eyebrow">Mentora Help & Legal</p><h1>{title}</h1><p className="legal-intro">{intro}</p>{kind === 'faq' ? <div className="faq-list">{MENTORA_FAQS.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div> : <div className="legal-sections">{(kind === 'terms' ? TERMS : PRIVACY).map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}</div>}<footer><Link to="/terms">Terms & Conditions</Link><Link to="/privacy">Privacy Policy</Link><Link to="/help/faq">FAQ</Link><a href="mailto:helpdesk@mentora.dev">Contact support</a></footer></article></main>;
}

import { Link } from 'react-router-dom';
import svgPaths from '../../../imports/OectorLandingPage-1/svg-vyqskjqma9';
import imgHero from 'figma:asset/04cc2b0921090ccb256a5141126ed657a6f7d830.png';

/* ─── Navbar ─────────────────────────────────────────────────────────────── */
function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-md" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between px-[80px] py-[24px]">
        <p className="font-['Lora',serif] font-bold text-[24px] text-white leading-normal whitespace-nowrap">Oector</p>
        <div className="hidden md:flex items-center gap-[32px] font-['Inter',sans-serif] text-[15px] text-white/80">
          {['Platform', 'Solutions', 'Trust Center', 'Pricing', 'Docs'].map((l) => (
            <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-[16px]">
          <Link to="/login" className="font-['Inter',sans-serif] font-medium text-[15px] text-white/80 hover:text-white transition-colors">Sign In</Link>
          <Link
            to="/signup"
            className="bg-white font-['Inter',sans-serif] font-semibold text-[14px] text-[#070b19] px-[20px] py-[10px] rounded-[99px] hover:bg-white/90 transition-colors"
          >
            Talk to Sales
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background image */}
      <div className="absolute left-0 right-0 top-0" style={{ aspectRatio: '1200/675' }}>
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" style={{ opacity: 0.67 }} src={imgHero} />
      </div>
      {/* Glow orb */}
      <div className="absolute left-1/2 -translate-x-1/2 size-[600px]" style={{ top: '-100px' }}>
        <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 600 600">
          <circle cx="300" cy="300" fill="url(#heroGlow)" fillOpacity="0.25" r="300" />
          <defs>
            <radialGradient id="heroGlow" cx="0" cy="0" gradientTransform="translate(300 300) rotate(90) scale(300)" gradientUnits="userSpaceOnUse" r="1">
              <stop stopColor="#4F46E5" />
              <stop offset="1" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-[48px] overflow-clip pb-[100px] pt-[180px] px-[80px]">
        {/* Status pill */}
        <div className="flex items-center gap-[8px] bg-white/[0.06] px-[14px] py-[6px] rounded-[100px]" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none"><circle cx="3" cy="3" r="3" fill="#06B6D4" /></svg>
          <p className="font-['Inter',sans-serif] font-semibold text-[12px] text-white whitespace-nowrap tracking-wider">AUTOPILOT FOR TRUST</p>
        </div>

        {/* Hero titles */}
        <div className="flex flex-col gap-[24px] items-center text-center w-full">
          <p className="font-['Lora',serif] text-[72px] text-white tracking-[-1.44px] max-w-[1040px]" style={{ lineHeight: 1.1 }}>
            {'Your '}
            <em className="italic">Compliance</em>
            {' on '}
            <em className="italic text-[#06b6d4]">Autopilot.</em>
            {' Your Customers in Perfect '}
            <em className="italic">Trust</em>
            {'.'}
          </p>
          <p className="font-['Inter',sans-serif] text-[#bdbdbe] text-[20px] max-w-[720px]" style={{ lineHeight: 1.5 }}>
            Oector unites continuous security control monitoring, automated audit preparation, and proactive assurance sharing into one beautiful, AI-forward Trust Copilot.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-[16px]">
          <Link
            to="/signup"
            className="bg-white font-['Inter',sans-serif] font-semibold text-[16px] text-[#070b19] px-[32px] py-[16px] rounded-[99px] hover:bg-white/90 transition-colors"
          >
            Get Started Free
          </Link>
          <a
            href="#"
            className="font-['Inter',sans-serif] font-medium text-[16px] text-white px-[32px] py-[16px] rounded-[99px] hover:bg-white/5 transition-colors relative"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
          >
            Schedule Demo
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── Social Proof ───────────────────────────────────────────────────────── */
function SocialProof() {
  return (
    <section className="flex flex-col gap-[24px] items-center px-[80px] pb-[80px] pt-[40px]" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="font-['Inter',sans-serif] font-medium text-[14px] text-[#94a3b8] whitespace-nowrap tracking-wider">TRUSTED BY SECURITY-FIRST ENTERPRISES</p>
      <div className="flex flex-wrap gap-[80px] items-center justify-center">
        {/* Github */}
        <div className="flex items-center gap-[8px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={svgPaths.pb242500} stroke="white" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
          </svg>
          <span className="font-['Inter',sans-serif] font-semibold text-[16px] text-white/50">Github</span>
        </div>
        {/* Slack */}
        <div className="flex items-center gap-[8px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={svgPaths.pb462a00} stroke="white" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p1228ab40} stroke="white" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p3bf28100} stroke="white" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p4ad79f0} stroke="white" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p25bf5d80} stroke="white" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p1388e600} stroke="white" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p2dd5e6b0} stroke="white" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p3063d200} stroke="white" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
          </svg>
          <span className="font-['Inter',sans-serif] font-semibold text-[16px] text-white/50">Slack</span>
        </div>
        {/* Stripe */}
        <div className="flex items-center gap-[8px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={svgPaths.p1a5d0500} stroke="white" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
          </svg>
          <span className="font-['Inter',sans-serif] font-semibold text-[16px] text-white/50">Stripe</span>
        </div>
        {/* Figma */}
        <div className="flex items-center gap-[8px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={svgPaths.p3226600} stroke="white" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
          </svg>
          <span className="font-['Inter',sans-serif] font-semibold text-[16px] text-white/50">Figma</span>
        </div>
        {/* Datadog */}
        <div className="flex items-center gap-[8px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={svgPaths.p37d79c40} stroke="white" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
          </svg>
          <span className="font-['Inter',sans-serif] font-semibold text-[16px] text-white/50">Datadog</span>
        </div>
        {/* Vercel */}
        <div className="flex items-center gap-[8px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={svgPaths.p13053670} stroke="white" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
          </svg>
          <span className="font-['Inter',sans-serif] font-semibold text-[16px] text-white/50">Vercel</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Copilot Section ────────────────────────────────────────────────────── */
function CopilotSection() {
  return (
    <section
      className="flex flex-col gap-[64px] items-center px-[80px] pb-[120px] pt-[100px]"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Section header */}
      <div className="flex flex-col gap-[16px] items-center max-w-[800px]">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d={svgPaths.paa98c00} stroke="#06B6D4" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <p className="font-['Lora',serif] text-[48px] text-white text-center leading-normal">Ask Your Trust Copilot Anything</p>
        <p className="font-['Inter',sans-serif] text-[#94a3b8] text-[18px] text-center max-w-[640px] leading-normal">
          No more manual spreadsheet auditing or hunting for evidence files. Ask Oector to generate policies, pre-fill security questionnaires, or verify architecture controls instantly.
        </p>
      </div>

      {/* Chat interface */}
      <div
        className="bg-white/[0.02] flex flex-col gap-[24px] items-start p-[24px] rounded-[24px] w-full max-w-[800px]"
        style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0px 24px 40px 0px rgba(0,0,0,0.5)' }}
      >
        {/* User message */}
        <div className="bg-white/[0.03] rounded-[16px] w-full" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-[16px] p-[16px]">
            <div className="shrink-0 size-[36px] rounded-full bg-[#1E293B]" />
            <p className="font-['Inter',sans-serif] text-[16px] text-white flex-1 min-w-0">
              {`"Compile our SOC 2 Type II audit readiness summary and highlight outstanding gaps."`}
            </p>
          </div>
        </div>

        {/* Copilot response */}
        <div className="bg-[#090e1f] rounded-[16px] w-full relative" style={{ border: '1px solid #06b6d4' }}>
          <div className="flex flex-col gap-[20px] items-start p-[24px]">
            {/* Copilot header */}
            <div className="flex items-center gap-[12px]">
              <div className="bg-[#06b6d4] flex items-center justify-center rounded-[16px] size-[32px] shrink-0">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <clipPath id="sparkClip"><rect width="18" height="18" fill="white" /></clipPath>
                  <g clipPath="url(#sparkClip)">
                    <path d={svgPaths.pc53a880} stroke="#070B19" strokeLinecap="round" strokeWidth="2" />
                  </g>
                </svg>
              </div>
              <p className="font-['Inter',sans-serif] font-semibold text-[16px] text-white whitespace-nowrap">Oector Copilot</p>
              <div className="bg-[rgba(6,182,212,0.13)] px-[8px] py-[2px] rounded-[8px] relative" style={{ border: '1px solid rgba(6,182,212,0.25)' }}>
                <p className="font-['Inter',sans-serif] font-semibold text-[10px] text-[#06b6d4] whitespace-nowrap">AI READY</p>
              </div>
            </div>

            {/* Copilot text */}
            <p className="font-['Inter',sans-serif] text-[#e2e8f0] text-[15px]" style={{ lineHeight: 1.6 }}>
              {"I've scanned all active AWS endpoints, GitHub deployment pipelines, and Okta identity logs. Your SOC 2 Type II readiness is currently at "}
              <span className="font-bold text-[#06b6d4]">94%</span>
              {". I have identified 2 minor gaps that require attention before our auditor review."}
            </p>

            <div className="w-full h-px bg-white/10" />

            {/* Gap rows */}
            <div className="flex flex-col gap-[12px] w-full">
              {/* Gap row 1 */}
              <div className="bg-white/[0.02] rounded-[8px] w-full" style={{ border: '1px solid rgba(255,255,255,0.03)' }}>
                <div className="flex items-center justify-between p-[12px]">
                  <div className="flex items-center gap-[12px]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d={svgPaths.p95db000} stroke="#EF4444" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                    <p className="font-['Inter',sans-serif] text-[14px] text-white whitespace-nowrap">MFA not enforced on 2 legacy AWS staging accounts</p>
                  </div>
                  <div className="bg-[rgba(239,68,68,0.13)] px-[10px] py-[4px] rounded-[6px] shrink-0">
                    <p className="font-['Inter',sans-serif] font-semibold text-[11px] text-[#f87171] whitespace-nowrap">Critical Gap</p>
                  </div>
                </div>
              </div>
              {/* Gap row 2 */}
              <div className="bg-white/[0.02] rounded-[8px] w-full" style={{ border: '1px solid rgba(255,255,255,0.03)' }}>
                <div className="flex items-center justify-between p-[12px]">
                  <div className="flex items-center gap-[12px]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d={svgPaths.p95db000} stroke="#F59E0B" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                    <p className="font-['Inter',sans-serif] text-[14px] text-white whitespace-nowrap">Data retention policy requires formal board approval</p>
                  </div>
                  <div className="bg-[rgba(245,158,11,0.13)] px-[10px] py-[4px] rounded-[6px] shrink-0">
                    <p className="font-['Inter',sans-serif] font-semibold text-[11px] text-[#fbbf24] whitespace-nowrap">Action Needed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Features Section ───────────────────────────────────────────────────── */
function FeaturesSection() {
  return (
    <section className="bg-[#f8fafc] flex flex-col gap-[64px] items-center px-[80px] py-[120px]">
      {/* Header */}
      <div className="flex flex-col gap-[16px] items-center text-center max-w-[800px]">
        <p className="font-['Lora',serif] text-[#0f172a] text-[40px] leading-normal">Continuous Assurance, Automated</p>
        <p className="font-['Inter',sans-serif] text-[#64748b] text-[18px] max-w-[600px] leading-normal">
          Instead of once-a-year checks, Oector turns compliance into an active trust generator that updates in real time.
        </p>
      </div>

      {/* Bento grid */}
      <div className="flex flex-col md:flex-row gap-[32px] w-full">
        {/* Card 1 */}
        <div className="bg-white flex-1 rounded-[24px] relative" style={{ border: '1px solid rgba(15,23,42,0.1)' }}>
          <div className="flex flex-col gap-[24px] items-start p-[32px]">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d={svgPaths.p6bd580} stroke="#4F46E5" strokeLinecap="round" strokeWidth="2" />
            </svg>
            <div className="flex flex-col gap-[12px]">
              <p className="font-['Lora',serif] font-semibold text-[#0f172a] text-[24px] leading-normal">Continuous Evidence Gathering</p>
              <p className="font-['Inter',sans-serif] text-[#64748b] text-[15px] leading-[1.5]">
                Integrate directly with your tech stack. We collect evidence hourly, ensuring your audit readiness is never out of date.
              </p>
            </div>
          </div>
        </div>
        {/* Card 2 */}
        <div className="bg-white flex-1 rounded-[24px] relative" style={{ border: '1px solid rgba(15,23,42,0.1)' }}>
          <div className="flex flex-col gap-[24px] items-start p-[32px]">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d={svgPaths.p1433e672} stroke="#06B6D4" strokeLinecap="round" strokeWidth="2" />
            </svg>
            <div className="flex flex-col gap-[12px]">
              <p className="font-['Lora',serif] font-semibold text-[#0f172a] text-[24px] leading-normal whitespace-nowrap">Questionnaire Copilot</p>
              <p className="font-['Inter',sans-serif] text-[#64748b] text-[15px] leading-[1.5]">
                Answer tedious customer security questionnaires in minutes. Oector learns your security posture and drafts accurate answers.
              </p>
            </div>
          </div>
        </div>
        {/* Card 3 */}
        <div className="bg-white flex-1 rounded-[24px] relative" style={{ border: '1px solid rgba(15,23,42,0.1)' }}>
          <div className="flex flex-col gap-[24px] items-start p-[32px]">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d={svgPaths.p34c8c3f0} stroke="#06B6D4" strokeLinecap="round" strokeWidth="2" />
            </svg>
            <div className="flex flex-col gap-[12px]">
              <p className="font-['Lora',serif] font-semibold text-[#0f172a] text-[24px] leading-normal whitespace-nowrap">Real-time Trust Centers</p>
              <p className="font-['Inter',sans-serif] text-[#64748b] text-[15px] leading-[1.5]">
                Securely publish your SOC 2 reports, system health status, and pen tests directly to prospects with automatic NDA workflows.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Metrics Section ────────────────────────────────────────────────────── */
function MetricsSection() {
  return (
    <section
      className="bg-white flex items-center justify-between px-[80px] py-[100px] gap-8 flex-wrap"
      style={{ borderTop: '1px solid rgba(15,23,42,0.1)', borderBottom: '1px solid rgba(15,23,42,0.1)' }}
    >
      <div className="flex flex-col gap-[12px] items-center text-center flex-1 min-w-[200px]">
        <p className="font-['Lora',serif] font-medium text-[#0f172a] text-[64px] leading-normal whitespace-nowrap">10x</p>
        <p className="font-['Inter',sans-serif] text-[#64748b] text-[16px] whitespace-nowrap">{'Faster SOC 2 & ISO 27001 Certification'}</p>
      </div>
      <div className="bg-[rgba(15,23,42,0.1)] h-[80px] w-px shrink-0 hidden md:block" />
      <div className="flex flex-col gap-[12px] items-center text-center flex-1 min-w-[200px]">
        <p className="font-['Lora',serif] font-medium text-[#0f172a] text-[64px] leading-normal whitespace-nowrap">99%</p>
        <p className="font-['Inter',sans-serif] text-[#64748b] text-[16px] whitespace-nowrap">Reduction in security questionnaire friction</p>
      </div>
      <div className="bg-[rgba(15,23,42,0.1)] h-[80px] w-px shrink-0 hidden md:block" />
      <div className="flex flex-col gap-[12px] items-center text-center flex-1 min-w-[200px]">
        <p className="font-['Lora',serif] font-medium text-[#0f172a] text-[64px] leading-normal whitespace-nowrap">$10B+</p>
        <p className="font-['Inter',sans-serif] text-[#64748b] text-[16px] whitespace-nowrap">Enterprise deals unlocked and accelerated</p>
      </div>
    </section>
  );
}

/* ─── Integrations Section ───────────────────────────────────────────────── */
function IntegrationChip({ icon, name }: { icon: React.ReactNode; name: string }) {
  return (
    <div
      className="bg-white/[0.06] flex items-center gap-[12px] px-[16px] py-[12px] rounded-[12px]"
      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {icon}
      <p className="font-['Inter',sans-serif] font-medium text-[14px] text-white whitespace-nowrap">{name}</p>
    </div>
  );
}

function IntegrationsSection() {
  const circleXIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <clipPath id="cxClip"><rect width="20" height="20" fill="white" /></clipPath>
      <g clipPath="url(#cxClip)">
        <path d={svgPaths.p30a06080} stroke="white" strokeLinecap="round" strokeWidth="2" />
      </g>
    </svg>
  );
  const githubIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d={svgPaths.p3a3a2b00} stroke="white" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
  const slackIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <clipPath id="slClip"><rect width="20" height="20" fill="white" /></clipPath>
      <g clipPath="url(#slClip)">
        <path d={svgPaths.p2a64af00} stroke="white" strokeLinecap="round" strokeWidth="2" />
        <path d={svgPaths.p3b001900} stroke="white" strokeLinecap="round" strokeWidth="2" />
        <path d={svgPaths.p36a69800} stroke="white" strokeLinecap="round" strokeWidth="2" />
        <path d={svgPaths.p2f6f3d00} stroke="white" strokeLinecap="round" strokeWidth="2" />
        <path d={svgPaths.p3aac4780} stroke="white" strokeLinecap="round" strokeWidth="2" />
        <path d={svgPaths.p22082f40} stroke="white" strokeLinecap="round" strokeWidth="2" />
        <path d={svgPaths.p3418a400} stroke="white" strokeLinecap="round" strokeWidth="2" />
        <path d={svgPaths.p297bd100} stroke="white" strokeLinecap="round" strokeWidth="2" />
      </g>
    </svg>
  );

  return (
    <section className="bg-black flex flex-col gap-[56px] items-center px-[80px] py-[120px]">
      <div className="flex flex-col gap-[16px] items-center text-center max-w-[800px]">
        <p className="font-['Lora',serif] text-white text-[40px] leading-normal">Connects With Your Tech Stack</p>
        <p className="font-['Inter',sans-serif] text-[#94a3b8] text-[18px] max-w-[600px] leading-normal">
          No manual configuration. Connect your workspace in 30 seconds for automatic, continuous security posture assessment.
        </p>
      </div>
      <div className="flex flex-wrap gap-[16px] items-start justify-center max-w-[900px]">
        <IntegrationChip icon={circleXIcon} name="AWS" />
        <IntegrationChip icon={circleXIcon} name="Google Cloud" />
        <IntegrationChip icon={githubIcon} name="GitHub" />
        <IntegrationChip icon={slackIcon} name="Slack" />
        <IntegrationChip icon={circleXIcon} name="Okta" />
        <IntegrationChip icon={circleXIcon} name="Jira" />
        <IntegrationChip icon={circleXIcon} name="Notion" />
        <IntegrationChip icon={circleXIcon} name="Vercel" />
        <IntegrationChip icon={circleXIcon} name="Kubernetes" />
      </div>
    </section>
  );
}

/* ─── Testimonials Section ───────────────────────────────────────────────── */
function TestimonialsSection() {
  return (
    <section className="bg-[#f8fafc] flex flex-col gap-[64px] items-center px-[80px] py-[120px]">
      <div className="flex flex-col gap-[16px] items-center text-center max-w-[800px]">
        <p className="font-['Lora',serif] text-[#0f172a] text-[40px] leading-normal">Loved by Security Leaders</p>
        <p className="font-['Inter',sans-serif] text-[#64748b] text-[18px] max-w-[600px] leading-normal">
          Hear how modern engineering teams use Oector to bypass compliance pain and close enterprise sales faster.
        </p>
      </div>
      <div className="flex flex-col md:flex-row gap-[32px] w-full">
        {[
          {
            quote: '"Before Oector, security questionnaires were eating up our entire Fridays. Now our trust center answers them before they even hit our inbox."',
            name: 'Sarah Jenkins',
            role: 'CISO, Horizon SaaS',
          },
          {
            quote: '"We cleared our SOC 2 Type II audit in record time. Our auditors commented on how organized our evidence was inside the Oector workspace."',
            name: 'David Chen',
            role: 'VP of Engineering, Flowstate',
          },
        ].map((t) => (
          <div key={t.name} className="bg-white flex-1 rounded-[16px] relative" style={{ border: '1px solid rgba(15,23,42,0.1)' }}>
            <div className="flex flex-col gap-[24px] items-start p-[32px]">
              <p className="font-['Inter',sans-serif] text-[#0f172a] text-[16px] leading-[1.6]">{t.quote}</p>
              <div className="flex items-center gap-[12px]">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="20" fill="#F8FAFC" />
                </svg>
                <div className="flex flex-col gap-[4px]">
                  <p className="font-['Inter',sans-serif] font-semibold text-[#0f172a] text-[15px] whitespace-nowrap">{t.name}</p>
                  <p className="font-['Inter',sans-serif] text-[#64748b] text-[13px] whitespace-nowrap">{t.role}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Final CTA ──────────────────────────────────────────────────────────── */
function FinalCTASection() {
  return (
    <section className="bg-[#070b19] flex flex-col gap-[32px] items-center overflow-clip px-[80px] py-[140px] relative">
      {/* Glow */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ top: '100px', width: '700px', height: '400px' }}>
        <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 700 400">
          <ellipse cx="350" cy="200" fill="url(#ctaGlow)" fillOpacity="0.15" rx="350" ry="200" />
          <defs>
            <radialGradient id="ctaGlow" cx="0" cy="0" gradientTransform="translate(350 200) rotate(90) scale(200 350)" gradientUnits="userSpaceOnUse" r="1">
              <stop stopColor="#06B6D4" />
              <stop offset="1" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
      <div className="relative z-10 flex flex-col gap-[24px] items-center text-center max-w-[800px]">
        <p className="font-['Lora',serif] text-white text-[48px] leading-normal">Transform Compliance from a Hurdle into a Superpower</p>
        <p className="font-['Inter',sans-serif] text-[#94a3b8] text-[18px] max-w-[600px] leading-normal">
          Join security-conscious businesses who automate evidence collection and build perfect customer trust with Oector.
        </p>
      </div>
      <div className="relative z-10 flex items-center gap-[16px]">
        <Link
          to="/signup"
          className="bg-white font-['Inter',sans-serif] font-semibold text-[16px] text-[#070b19] px-[32px] py-[16px] rounded-[99px] hover:bg-white/90 transition-colors"
        >
          Start Free Trial
        </Link>
        <a
          href="#"
          className="font-['Inter',sans-serif] font-medium text-[16px] text-white px-[32px] py-[16px] rounded-[99px] hover:bg-white/5 transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.15)' }}
        >
          Schedule Demo
        </a>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-[#070b19] flex flex-col gap-[64px] items-start px-[80px] pb-[60px] pt-[100px]" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-start justify-between w-full flex-wrap gap-12">
        {/* Brand column */}
        <div className="flex flex-col gap-[24px] max-w-[360px]">
          <div className="flex items-center gap-[12px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d={svgPaths.p1c00680} stroke="#06B6D4" strokeLinecap="round" strokeWidth="2" />
            </svg>
            <p className="font-['Lora',serif] font-bold text-[22px] text-white whitespace-nowrap">Oector</p>
          </div>
          <p className="font-['Inter',sans-serif] text-[#94a3b8] text-[15px] leading-[1.5]">
            Automated SOC 2, ISO 27001, and continuous customer trust acceleration in one integrated platform.
          </p>
        </div>
        {/* Nav columns */}
        <div className="flex gap-[64px] flex-wrap">
          {[
            { title: 'Platform', links: ['Trust Center', 'Autopilot', 'Integrations', 'Pricing'] },
            { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Press Kit'] },
            { title: 'Resources', links: ['Security Docs', 'Trust Status', 'Guides', 'Support'] },
          ].map((col) => (
            <div key={col.title} className="flex flex-col gap-[16px] w-[140px]">
              <p className="font-['Inter',sans-serif] font-semibold text-white text-[14px]">{col.title}</p>
              {col.links.map((l) => (
                <a key={l} href="#" className="font-['Inter',sans-serif] text-[#94a3b8] text-[14px] hover:text-white transition-colors">{l}</a>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* Bottom bar */}
      <div className="flex items-center justify-between w-full pt-[32px] flex-wrap gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="font-['Inter',sans-serif] text-[#94a3b8] text-[14px] whitespace-nowrap">© 2026 Oector Inc. All rights reserved.</p>
        <p className="font-['Inter',sans-serif] text-[#94a3b8] text-[14px]">{'Privacy Policy  ·  Terms of Service  ·  Security Policies'}</p>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <SocialProof />
      <CopilotSection />
      <FeaturesSection />
      <MetricsSection />
      <IntegrationsSection />
      <TestimonialsSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
}

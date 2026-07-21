import svgPaths from "./svg-yr8ikuj8xz";
import imgImage2 from "./04cc2b0921090ccb256a5141126ed657a6f7d830.png";

function StatusPill() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex gap-[8px] items-center px-[14px] py-[6px] relative rounded-[100px] shrink-0" data-name="Status-Pill">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <div className="relative shrink-0 size-[6px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 6">
          <circle cx="3" cy="3" fill="var(--fill-0, #06B6D4)" id="Ellipse" r="3" />
        </svg>
      </div>
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap">AUTOPILOT FOR TRUST</p>
    </div>
  );
}

function HeroTitles() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-normal gap-[24px] items-center relative shrink-0 text-center w-full" data-name="Hero-Titles">
      <p className="font-['Lora:Regular',sans-serif] leading-[0] relative shrink-0 text-[72px] text-white tracking-[-1.44px] w-[1040px]">
        <span className="leading-[1.1]">{`Your `}</span>
        <span className="font-['Lora:Italic',sans-serif] italic leading-[1.1]">Compliance</span>
        <span className="leading-[1.1]">{` on `}</span>
        <span className="font-['Lora:Italic',sans-serif] italic leading-[1.1] text-[#06b6d4]">Autopilot.</span>
        <span className="leading-[1.1]">{` Your Customers in Perfect `}</span>
        <span className="font-['Lora:Italic',sans-serif] italic leading-[1.1]">Trust</span>
        <span className="leading-[1.1]">.</span>
      </p>
      <p className="font-['Geist:Regular',sans-serif] leading-[1.5] relative shrink-0 text-[#bdbdbe] text-[20px] w-[720px]">Oector unites continuous security control monitoring, automated audit preparation, and proactive assurance sharing into one beautiful, AI-forward Trust Copilot.</p>
    </div>
  );
}

function CtaPrimary() {
  return (
    <div className="bg-white content-stretch flex items-start px-[32px] py-[16px] relative rounded-[99px] shrink-0" data-name="CTA-Primary">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#070b19] text-[16px] whitespace-nowrap">Get Started Free</p>
    </div>
  );
}

function CtaSecondary() {
  return (
    <div className="content-stretch flex items-start px-[32px] py-[16px] relative rounded-[99px] shrink-0" data-name="CTA-Secondary">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.15)] border-solid inset-0 pointer-events-none rounded-[99px]" />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Schedule Demo</p>
    </div>
  );
}

function CtaRow() {
  return (
    <div className="content-stretch flex gap-[16px] items-start justify-center relative shrink-0" data-name="CTA-Row">
      <CtaPrimary />
      <CtaSecondary />
    </div>
  );
}

function Hero() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[48px] items-center left-0 overflow-clip pb-[100px] pt-[180px] px-[80px] right-0 top-0" data-name="Hero">
      <div className="-translate-x-1/2 absolute left-1/2 size-[600px] top-[-100px]" data-name="Hero-Glow-Orb">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 600 600">
          <circle cx="300" cy="300" fill="url(#paint0_radial_1_608)" fillOpacity="0.25" id="Hero-Glow-Orb" r="300" />
          <defs>
            <radialGradient cx="0" cy="0" gradientTransform="translate(300 300) rotate(90) scale(300)" gradientUnits="userSpaceOnUse" id="paint0_radial_1_608" r="1">
              <stop stopColor="#4F46E5" />
              <stop offset="1" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
      <StatusPill />
      <HeroTitles />
      <CtaRow />
    </div>
  );
}

function LogoGroup() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="Logo-Group">
      <p className="[word-break:break-word] font-['Lora:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[24px] text-white whitespace-nowrap">Oector</p>
    </div>
  );
}

function NavLinks() {
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular',sans-serif] font-normal gap-[32px] items-center leading-[normal] relative shrink-0 text-[15px] text-[rgba(255,255,255,0.8)] whitespace-nowrap" data-name="Nav-Links">
      <p className="relative shrink-0">Platform</p>
      <p className="relative shrink-0">Solutions</p>
      <p className="relative shrink-0">Trust Center</p>
      <p className="relative shrink-0">Pricing</p>
      <p className="relative shrink-0">Docs</p>
    </div>
  );
}

function ButtonPrimary() {
  return (
    <div className="bg-white content-stretch flex items-start px-[20px] py-[10px] relative rounded-[99px] shrink-0" data-name="Button-Primary">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#070b19] text-[14px] whitespace-nowrap">Talk to Sales</p>
    </div>
  );
}

function NavActions() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="Nav-Actions">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[15px] text-[rgba(255,255,255,0.8)] whitespace-nowrap">Sign In</p>
      <ButtonPrimary />
    </div>
  );
}

function Navbar() {
  return (
    <div className="absolute content-stretch flex items-center justify-between left-0 px-[80px] py-[24px] right-0 top-0" data-name="Navbar">
      <div aria-hidden className="absolute border-[rgba(255,255,255,0.06)] border-b border-solid inset-0 pointer-events-none" />
      <LogoGroup />
      <NavLinks />
      <NavActions />
    </div>
  );
}

function Github() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="github">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="github">
          <path d={svgPaths.pb242500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <Github />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[16px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">Github</p>
    </div>
  );
}

function Slack() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="slack">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="slack">
          <g id="Vector">
            <path d={svgPaths.pb462a00} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p1228ab40} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p3bf28100} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p4ad79f0} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p25bf5d80} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p1388e600} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p2dd5e6b0} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
            <path d={svgPaths.p3063d200} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <Slack />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[16px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">Slack</p>
    </div>
  );
}

function CircleX() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="circle-x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="circle-x">
          <path d={svgPaths.p1a5d0500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <CircleX />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[16px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">Stripe</p>
    </div>
  );
}

function Figma() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="figma">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="figma">
          <path d={svgPaths.p3226600} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <Figma />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[16px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">Figma</p>
    </div>
  );
}

function Database() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="database">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="database">
          <path d={svgPaths.p37d79c40} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <Database />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[16px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">Datadog</p>
    </div>
  );
}

function Zap() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="zap">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="zap">
          <path d={svgPaths.p13053670} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <Zap />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[16px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">Vercel</p>
    </div>
  );
}

function LogosRow() {
  return (
    <div className="content-stretch flex gap-[80px] items-center justify-center relative shrink-0" data-name="Logos-Row">
      <Frame />
      <Frame1 />
      <Frame2 />
      <Frame3 />
      <Frame4 />
      <Frame5 />
    </div>
  );
}

function SocialProof() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[24px] items-center left-0 pb-[80px] pt-[40px] px-[80px] right-0 top-[808px]" data-name="Social-Proof">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#94a3b8] text-[14px] whitespace-nowrap">TRUSTED BY SECURITY-FIRST ENTERPRISES</p>
      <LogosRow />
    </div>
  );
}

function Sparkles() {
  return (
    <div className="relative shrink-0 size-[36px]" data-name="sparkles">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 36">
        <g id="sparkles">
          <path d={svgPaths.paa98c00} id="Vector" stroke="var(--stroke-0, #06B6D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function SparkleIcon() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[36px]" data-name="sparkle-icon">
      <Sparkles />
    </div>
  );
}

function SectionHeader() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-center relative shrink-0 w-[800px]" data-name="Section-Header">
      <SparkleIcon />
      <p className="[word-break:break-word] font-['Lora:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[48px] text-center text-white w-[min-content]">Ask Your Trust Copilot Anything</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[18px] text-center w-[640px]">No more manual spreadsheet auditing or hunting for evidence files. Ask Oector to generate policies, pre-fill security questionnaires, or verify architecture controls instantly.</p>
    </div>
  );
}

function UserMessage() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] relative rounded-[16px] shrink-0 w-full" data-name="User-Message">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.04)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center p-[16px] relative size-full">
          <div className="relative shrink-0 size-[36px]" data-name="Ellipse">
            <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 36">
              <circle cx="18" cy="18" fill="var(--fill-0, #1E293B)" id="Ellipse" r="18" />
            </svg>
          </div>
          <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[16px] text-white">{`"Compile our SOC 2 Type II audit readiness summary and highlight outstanding gaps."`}</p>
        </div>
      </div>
    </div>
  );
}

function Sparkles1() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="sparkles">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g clipPath="url(#clip0_1_610)" id="sparkles">
          <path d={svgPaths.pc53a880} id="Vector" stroke="var(--stroke-0, #070B19)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_610">
            <rect fill="white" height="18" width="18" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function SparkleIcon1() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[18px]" data-name="sparkle-icon">
      <Sparkles1 />
    </div>
  );
}

function Frame6() {
  return (
    <div className="bg-[#06b6d4] content-stretch flex items-center justify-center relative rounded-[16px] shrink-0 size-[32px]" data-name="Frame">
      <SparkleIcon1 />
    </div>
  );
}

function Frame7() {
  return (
    <div className="bg-[rgba(6,182,212,0.13)] content-stretch flex items-start px-[8px] py-[2px] relative rounded-[8px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(6,182,212,0.25)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#06b6d4] text-[10px] whitespace-nowrap">AI READY</p>
    </div>
  );
}

function CopilotHeader() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Copilot-Header">
      <Frame6 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Oector Copilot</p>
      <Frame7 />
    </div>
  );
}

function ShieldCheck() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="shield-check">
          <path d={svgPaths.p95db000} id="Vector" stroke="var(--stroke-0, #EF4444)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function ShieldIcon() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[20px]" data-name="shield-icon">
      <ShieldCheck />
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <ShieldIcon />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">MFA not enforced on 2 legacy AWS staging accounts</p>
    </div>
  );
}

function Frame9() {
  return (
    <div className="bg-[rgba(239,68,68,0.13)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#f87171] text-[11px] whitespace-nowrap">Critical Gap</p>
    </div>
  );
}

function GapRow() {
  return (
    <div className="bg-[rgba(255,255,255,0.02)] relative rounded-[8px] shrink-0 w-full" data-name="Gap-Row-1">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.03)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between p-[12px] relative size-full">
          <Frame8 />
          <Frame9 />
        </div>
      </div>
    </div>
  );
}

function ShieldCheck1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="shield-check">
          <path d={svgPaths.p95db000} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function ShieldIcon1() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[20px]" data-name="shield-icon">
      <ShieldCheck1 />
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <ShieldIcon1 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Data retention policy requires formal board approval</p>
    </div>
  );
}

function Frame11() {
  return (
    <div className="bg-[rgba(245,158,11,0.13)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#fbbf24] text-[11px] whitespace-nowrap">Action Needed</p>
    </div>
  );
}

function GapRow1() {
  return (
    <div className="bg-[rgba(255,255,255,0.02)] relative rounded-[8px] shrink-0 w-full" data-name="Gap-Row-2">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.03)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between p-[12px] relative size-full">
          <Frame10 />
          <Frame11 />
        </div>
      </div>
    </div>
  );
}

function GapsContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Gaps-Container">
      <GapRow />
      <GapRow1 />
    </div>
  );
}

function CopilotResponse() {
  return (
    <div className="bg-[#090e1f] relative rounded-[16px] shrink-0 w-full" data-name="Copilot-Response">
      <div aria-hidden className="absolute border border-[#06b6d4] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[20px] items-start p-[24px] relative size-full">
        <CopilotHeader />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[0] min-w-full relative shrink-0 text-[#e2e8f0] text-[15px] w-[min-content]">
          <span className="leading-[1.6]">{`I've scanned all active AWS endpoints, GitHub deployment pipelines, and Okta identity logs. Your SOC 2 Type II readiness is currently at `}</span>
          <span className="font-['Geist:Bold',sans-serif] font-bold leading-[1.6] text-[#06b6d4]">94%</span>
          <span className="leading-[1.6]">. I have identified 2 minor gaps that require attention before our auditor review.</span>
        </p>
        <div className="h-0 relative shrink-0 w-full" data-name="Line">
          <div className="absolute inset-[-1px_0_0_0]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 704 1">
              <line id="Line" stroke="var(--stroke-0, white)" strokeOpacity="0.101961" x2="704" y1="0.5" y2="0.5" />
            </svg>
          </div>
        </div>
        <GapsContainer />
      </div>
    </div>
  );
}

function ChatInterface() {
  return (
    <div className="bg-[rgba(255,255,255,0.02)] content-stretch flex flex-col gap-[24px] items-start p-[24px] relative rounded-[24px] shrink-0 w-[800px]" data-name="Chat-Interface">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[24px] shadow-[0px_24px_40px_0px_rgba(0,0,0,0.5)]" />
      <UserMessage />
      <CopilotResponse />
    </div>
  );
}

function CopilotSection() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[64px] items-center left-0 pb-[120px] pt-[100px] px-[80px] right-0 top-[994px]" data-name="Copilot-Section">
      <div aria-hidden className="absolute border-[rgba(255,255,255,0.06)] border-b border-solid border-t inset-0 pointer-events-none" />
      <SectionHeader />
      <ChatInterface />
    </div>
  );
}

function FeaturesHeader() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-normal gap-[16px] items-center leading-[normal] relative shrink-0 text-center w-[800px]" data-name="Features-Header">
      <p className="font-['Lora:Regular',sans-serif] min-w-full relative shrink-0 text-[#0f172a] text-[40px] w-[min-content]">Continuous Assurance, Automated</p>
      <p className="font-['Geist:Regular',sans-serif] relative shrink-0 text-[#64748b] text-[18px] w-[600px]">Instead of once-a-year checks, Oector turns compliance into an active trust generator that updates in real time.</p>
    </div>
  );
}

function ShieldCheck2() {
  return (
    <div className="relative shrink-0 size-[32px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="shield-check">
          <path d={svgPaths.p6bd580} id="Vector" stroke="var(--stroke-0, #4F46E5)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function ShieldIcon2() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[32px]" data-name="shield-icon">
      <ShieldCheck2 />
    </div>
  );
}

function Frame12() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Lora:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[24px] w-full">Continuous Evidence Gathering</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#64748b] text-[15px] w-full">Integrate directly with your tech stack. We collect evidence hourly, ensuring your audit readiness is never out of date.</p>
    </div>
  );
}

function BentoCard() {
  return (
    <div className="bg-white flex-[1_0_0] min-w-px relative rounded-[24px] self-stretch" data-name="Bento-Card">
      <div aria-hidden className="absolute border border-[rgba(15,23,42,0.1)] border-solid inset-0 pointer-events-none rounded-[24px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[32px] relative size-full">
        <ShieldIcon2 />
        <Frame12 />
      </div>
    </div>
  );
}

function Sparkles2() {
  return (
    <div className="relative shrink-0 size-[32px]" data-name="sparkles">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="sparkles">
          <path d={svgPaths.p1433e672} id="Vector" stroke="var(--stroke-0, #06B6D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function SparkleIcon2() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[32px]" data-name="sparkle-icon">
      <Sparkles2 />
    </div>
  );
}

function Frame13() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Lora:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[24px] whitespace-nowrap">Questionnaire Copilot</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#64748b] text-[15px] w-[min-content]">Answer tedious customer security questionnaires in minutes. Oector learns your security posture and drafts accurate answers.</p>
    </div>
  );
}

function BentoCard1() {
  return (
    <div className="bg-white flex-[1_0_0] min-w-px relative rounded-[24px] self-stretch" data-name="Bento-Card-2">
      <div aria-hidden className="absolute border border-[rgba(15,23,42,0.1)] border-solid inset-0 pointer-events-none rounded-[24px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[32px] relative size-full">
        <SparkleIcon2 />
        <Frame13 />
      </div>
    </div>
  );
}

function Globe() {
  return (
    <div className="relative shrink-0 size-[32px]" data-name="globe">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="globe">
          <path d={svgPaths.p34c8c3f0} id="Vector" stroke="var(--stroke-0, #06B6D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame14() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Lora:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[24px] whitespace-nowrap">Real-time Trust Centers</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#64748b] text-[15px] w-[min-content]">Securely publish your SOC 2 reports, system health status, and pen tests directly to prospects with automatic NDA workflows.</p>
    </div>
  );
}

function BentoCard2() {
  return (
    <div className="bg-white flex-[1_0_0] min-w-px relative rounded-[24px] self-stretch" data-name="Bento-Card-3">
      <div aria-hidden className="absolute border border-[rgba(15,23,42,0.1)] border-solid inset-0 pointer-events-none rounded-[24px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[32px] relative size-full">
        <Globe />
        <Frame14 />
      </div>
    </div>
  );
}

function FeaturesBentoGrid() {
  return (
    <div className="content-stretch flex gap-[32px] h-[263px] items-start relative shrink-0 w-full" data-name="Features-Bento-Grid">
      <BentoCard />
      <BentoCard1 />
      <BentoCard2 />
    </div>
  );
}

function FeaturesSection() {
  return (
    <div className="absolute bg-[#f8fafc] content-stretch flex flex-col gap-[64px] items-center left-0 px-[80px] py-[120px] right-0 top-[1932px]" data-name="Features-Section">
      <FeaturesHeader />
      <FeaturesBentoGrid />
    </div>
  );
}

function MetricBox() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-center leading-[normal] relative shrink-0 w-[360px] whitespace-nowrap" data-name="Metric-Box-1">
      <p className="font-['Lora:Medium',sans-serif] font-medium relative shrink-0 text-[#0f172a] text-[64px]">10x</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[16px]">{`Faster SOC 2 & ISO 27001 Certification`}</p>
    </div>
  );
}

function MetricBox1() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-center leading-[normal] relative shrink-0 w-[360px] whitespace-nowrap" data-name="Metric-Box-2">
      <p className="font-['Lora:Medium',sans-serif] font-medium relative shrink-0 text-[#0f172a] text-[64px]">99%</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[16px]">Reduction in security questionnaire friction</p>
    </div>
  );
}

function MetricBox2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-center leading-[normal] relative shrink-0 w-[360px] whitespace-nowrap" data-name="Metric-Box-3">
      <p className="font-['Lora:Medium',sans-serif] font-medium relative shrink-0 text-[#0f172a] text-[64px]">$10B+</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[16px]">Enterprise deals unlocked and accelerated</p>
    </div>
  );
}

function MetricsSection() {
  return (
    <div className="absolute bg-white content-stretch flex h-[315px] items-center justify-between left-0 px-[80px] py-[100px] right-0 top-[2612px]" data-name="Metrics-Section">
      <div aria-hidden className="absolute border-[rgba(15,23,42,0.1)] border-b border-solid border-t inset-0 pointer-events-none" />
      <MetricBox />
      <div className="bg-[rgba(15,23,42,0.1)] h-[80px] relative shrink-0 w-px" data-name="Rectangle" />
      <MetricBox1 />
      <div className="bg-[rgba(15,23,42,0.1)] h-[80px] relative shrink-0 w-px" data-name="Rectangle" />
      <MetricBox2 />
    </div>
  );
}

function IntegrationsHeader() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-normal gap-[16px] items-center leading-[normal] relative shrink-0 text-center w-[800px]" data-name="Integrations-Header">
      <p className="font-['Lora:Regular',sans-serif] min-w-full relative shrink-0 text-[40px] text-white w-[min-content]">Connects With Your Tech Stack</p>
      <p className="font-['Geist:Regular',sans-serif] relative shrink-0 text-[#94a3b8] text-[18px] w-[600px]">No manual configuration. Connect your workspace in 30 seconds for automatic, continuous security posture assessment.</p>
    </div>
  );
}

function CircleX1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="circle-x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_600)" id="circle-x">
          <path d={svgPaths.p30a06080} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_600">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function IntegrationAws() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex gap-[12px] items-center px-[16px] py-[12px] relative rounded-[12px] shrink-0" data-name="integration-AWS">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <CircleX1 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">AWS</p>
    </div>
  );
}

function CircleX2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="circle-x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_600)" id="circle-x">
          <path d={svgPaths.p30a06080} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_600">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function IntegrationGoogleCloud() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex gap-[12px] items-center px-[16px] py-[12px] relative rounded-[12px] shrink-0" data-name="integration-Google Cloud">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <CircleX2 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Google Cloud</p>
    </div>
  );
}

function Github1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="github">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="github">
          <path d={svgPaths.p3a3a2b00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IntegrationGitHub() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex gap-[12px] items-center px-[16px] py-[12px] relative rounded-[12px] shrink-0" data-name="integration-GitHub">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Github1 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">GitHub</p>
    </div>
  );
}

function Slack1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="slack">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_567)" id="slack">
          <g id="Vector">
            <path d={svgPaths.p2a64af00} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p3b001900} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p36a69800} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p2f6f3d00} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p3aac4780} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p22082f40} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p3418a400} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p297bd100} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
          </g>
        </g>
        <defs>
          <clipPath id="clip0_1_567">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function IntegrationSlack() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex gap-[12px] items-center px-[16px] py-[12px] relative rounded-[12px] shrink-0" data-name="integration-Slack">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Slack1 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Slack</p>
    </div>
  );
}

function CircleX3() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="circle-x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_600)" id="circle-x">
          <path d={svgPaths.p30a06080} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_600">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function IntegrationOkta() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex gap-[12px] items-center px-[16px] py-[12px] relative rounded-[12px] shrink-0" data-name="integration-Okta">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <CircleX3 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Okta</p>
    </div>
  );
}

function CircleX4() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="circle-x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_600)" id="circle-x">
          <path d={svgPaths.p30a06080} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_600">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function IntegrationJira() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex gap-[12px] items-center px-[16px] py-[12px] relative rounded-[12px] shrink-0" data-name="integration-Jira">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <CircleX4 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Jira</p>
    </div>
  );
}

function CircleX5() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="circle-x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_600)" id="circle-x">
          <path d={svgPaths.p30a06080} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_600">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function IntegrationNotion() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex gap-[12px] items-center px-[16px] py-[12px] relative rounded-[12px] shrink-0" data-name="integration-Notion">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <CircleX5 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Notion</p>
    </div>
  );
}

function CircleX6() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="circle-x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_600)" id="circle-x">
          <path d={svgPaths.p30a06080} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_600">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function IntegrationVercel() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex gap-[12px] items-center px-[16px] py-[12px] relative rounded-[12px] shrink-0" data-name="integration-Vercel">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <CircleX6 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Vercel</p>
    </div>
  );
}

function CircleX7() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="circle-x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_600)" id="circle-x">
          <path d={svgPaths.p30a06080} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_600">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function IntegrationKubernetes() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex gap-[12px] items-center px-[16px] py-[12px] relative rounded-[12px] shrink-0" data-name="integration-Kubernetes">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <CircleX7 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Kubernetes</p>
    </div>
  );
}

function IntegrationsGrid() {
  return (
    <div className="content-start flex flex-wrap gap-[16px] items-start justify-center relative shrink-0 w-[900px]" data-name="Integrations-Grid">
      <IntegrationAws />
      <IntegrationGoogleCloud />
      <IntegrationGitHub />
      <IntegrationSlack />
      <IntegrationOkta />
      <IntegrationJira />
      <IntegrationNotion />
      <IntegrationVercel />
      <IntegrationKubernetes />
    </div>
  );
}

function IntegrationsSection() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[56px] items-center left-0 px-[80px] py-[120px] right-0 top-[2927px]" data-name="Integrations-Section">
      <IntegrationsHeader />
      <IntegrationsGrid />
    </div>
  );
}

function TestimonialsHeader() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-normal gap-[16px] items-center leading-[normal] relative shrink-0 text-center w-[800px]" data-name="Testimonials-Header">
      <p className="font-['Lora:Regular',sans-serif] min-w-full relative shrink-0 text-[#0f172a] text-[40px] w-[min-content]">Loved by Security Leaders</p>
      <p className="font-['Geist:Regular',sans-serif] relative shrink-0 text-[#64748b] text-[18px] w-[600px]">Hear how modern engineering teams use Oector to bypass compliance pain and close enterprise sales faster.</p>
    </div>
  );
}

function Frame15() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#0f172a] text-[15px]">Sarah Jenkins</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[13px]">CISO, Horizon SaaS</p>
    </div>
  );
}

function AuthorInfo() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Author-Info">
      <div className="relative shrink-0 size-[40px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 40 40">
          <circle cx="20" cy="20" fill="var(--fill-0, #F8FAFC)" id="Ellipse" r="20" />
        </svg>
      </div>
      <Frame15 />
    </div>
  );
}

function TestimonialCard() {
  return (
    <div className="bg-white flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="Testimonial-Card">
      <div aria-hidden className="absolute border border-[rgba(15,23,42,0.1)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[32px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full relative shrink-0 text-[#0f172a] text-[16px] w-[min-content]">{`"Before Oector, security questionnaires were eating up our entire Fridays. Now our trust center answers them before they even hit our inbox."`}</p>
        <AuthorInfo />
      </div>
    </div>
  );
}

function Frame16() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#0f172a] text-[15px]">David Chen</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[13px]">VP of Engineering, Flowstate</p>
    </div>
  );
}

function AuthorInfo1() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Author-Info">
      <div className="relative shrink-0 size-[40px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 40 40">
          <circle cx="20" cy="20" fill="var(--fill-0, #F8FAFC)" id="Ellipse" r="20" />
        </svg>
      </div>
      <Frame16 />
    </div>
  );
}

function TestimonialCard1() {
  return (
    <div className="bg-white flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="Testimonial-Card">
      <div aria-hidden className="absolute border border-[rgba(15,23,42,0.1)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[32px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full relative shrink-0 text-[#0f172a] text-[16px] w-[min-content]">{`"We cleared our SOC 2 Type II audit in record time. Our auditors commented on how organized our evidence was inside the Oector workspace."`}</p>
        <AuthorInfo1 />
      </div>
    </div>
  );
}

function TestimonialsGrid() {
  return (
    <div className="content-stretch flex gap-[32px] items-start relative shrink-0 w-full" data-name="Testimonials-Grid">
      <TestimonialCard />
      <TestimonialCard1 />
    </div>
  );
}

function TestimonialsSection() {
  return (
    <div className="absolute bg-[#f8fafc] content-stretch flex flex-col gap-[64px] items-center left-0 px-[80px] py-[120px] right-0 top-[3440px]" data-name="Testimonials-Section">
      <TestimonialsHeader />
      <TestimonialsGrid />
    </div>
  );
}

function CtaContent() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-normal gap-[24px] items-center leading-[normal] relative shrink-0 text-center w-[800px]" data-name="CTA-Content">
      <p className="font-['Lora:Regular',sans-serif] min-w-full relative shrink-0 text-[48px] text-white w-[min-content]">Transform Compliance from a Hurdle into a Superpower</p>
      <p className="font-['Geist:Regular',sans-serif] relative shrink-0 text-[#94a3b8] text-[18px] w-[600px]">Join security-conscious businesses who automate evidence collection and build perfect customer trust with Oector.</p>
    </div>
  );
}

function CtaPrimary1() {
  return (
    <div className="bg-white content-stretch flex items-start px-[32px] py-[16px] relative rounded-[99px] shrink-0" data-name="CTA-Primary">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#070b19] text-[16px] whitespace-nowrap">Start Free Trial</p>
    </div>
  );
}

function CtaSecondary1() {
  return (
    <div className="content-stretch flex items-start px-[32px] py-[16px] relative rounded-[99px] shrink-0" data-name="CTA-Secondary">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.15)] border-solid inset-0 pointer-events-none rounded-[99px]" />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Schedule Demo</p>
    </div>
  );
}

function CtaButtons() {
  return (
    <div className="content-stretch flex gap-[16px] items-start justify-center relative shrink-0" data-name="CTA-Buttons">
      <CtaPrimary1 />
      <CtaSecondary1 />
    </div>
  );
}

function FinalCtaSection() {
  return (
    <div className="absolute bg-[#070b19] content-stretch flex flex-col gap-[32px] items-center left-0 overflow-clip px-[80px] py-[140px] right-0 top-[4038px]" data-name="Final-CTA-Section">
      <div className="-translate-x-1/2 absolute h-[400px] left-1/2 top-[100px] w-[700px]" data-name="CTA-Glow">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 700 400">
          <ellipse cx="350" cy="200" fill="url(#paint0_radial_1_582)" fillOpacity="0.15" id="CTA-Glow" rx="350" ry="200" />
          <defs>
            <radialGradient cx="0" cy="0" gradientTransform="translate(350 200) rotate(90) scale(200 350)" gradientUnits="userSpaceOnUse" id="paint0_radial_1_582" r="1">
              <stop stopColor="#06B6D4" />
              <stop offset="1" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
      <CtaContent />
      <CtaButtons />
    </div>
  );
}

function Sparkles3() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="sparkles">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="sparkles">
          <path d={svgPaths.p1c00680} id="Vector" stroke="var(--stroke-0, #06B6D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function SparkleIcon3() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[24px]" data-name="sparkle-icon">
      <Sparkles3 />
    </div>
  );
}

function LogoFooter() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Logo-Footer">
      <SparkleIcon3 />
      <p className="[word-break:break-word] font-['Lora:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[22px] text-white whitespace-nowrap">Oector</p>
    </div>
  );
}

function BrandColumn() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[360px]" data-name="Brand-Column">
      <LogoFooter />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#94a3b8] text-[15px] w-[min-content]">Automated SOC 2, ISO 27001, and continuous customer trust acceleration in one integrated platform.</p>
    </div>
  );
}

function FooterCol() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-[140px]" data-name="Footer-Col">
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-white">Platform</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Trust Center</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Autopilot</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Integrations</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Pricing</p>
    </div>
  );
}

function FooterCol1() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-[140px]" data-name="Footer-Col">
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-white">Company</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">About Us</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Careers</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Blog</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Press Kit</p>
    </div>
  );
}

function FooterCol2() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-[140px]" data-name="Footer-Col">
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-white">Resources</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Security Docs</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Trust Status</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Guides</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Support</p>
    </div>
  );
}

function FooterNav() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[64px] items-start leading-[normal] relative shrink-0 text-[14px] whitespace-nowrap" data-name="Footer-Nav">
      <FooterCol />
      <FooterCol1 />
      <FooterCol2 />
    </div>
  );
}

function FooterTop() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Footer-Top">
      <BrandColumn />
      <FooterNav />
    </div>
  );
}

function FooterBottom() {
  return (
    <div className="content-stretch flex items-center justify-between pt-[32px] relative shrink-0 w-full" data-name="Footer-Bottom">
      <div aria-hidden className="absolute border-[rgba(255,255,255,0.1)] border-solid border-t inset-0 pointer-events-none" />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[14px] whitespace-nowrap">© 2026 Oector Inc. All rights reserved.</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[14px] whitespace-pre">{`Privacy Policy  ·  Terms of Service  ·  Security Policies`}</p>
    </div>
  );
}

function Footer() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[64px] items-start left-0 pb-[60px] pt-[100px] px-[80px] right-0 top-[4595px]" data-name="Footer">
      <div aria-hidden className="absolute border-[rgba(255,255,255,0.06)] border-solid border-t inset-0 pointer-events-none" />
      <FooterTop />
      <FooterBottom />
    </div>
  );
}

export default function OectorLandingPage() {
  return (
    <div className="bg-black relative size-full" data-name="oector-landing-page">
      <div className="absolute aspect-[1200/675] left-0 right-0 top-0" data-name="image 2">
        <img alt="" className="absolute inset-0 max-w-none object-cover opacity-67 pointer-events-none size-full" src={imgImage2} />
      </div>
      <Hero />
      <Navbar />
      <SocialProof />
      <CopilotSection />
      <FeaturesSection />
      <MetricsSection />
      <IntegrationsSection />
      <TestimonialsSection />
      <FinalCtaSection />
      <Footer />
    </div>
  );
}
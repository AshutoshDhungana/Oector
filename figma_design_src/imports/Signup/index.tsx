import svgPaths from "./svg-gtzxlkfv0u";

function LogoWhite() {
  return (
    <div className="h-[40px] relative shrink-0 w-[42.197px]" data-name="Logo_white">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 42.1965 40">
        <g id="Logo_white">
          <path clipRule="evenodd" d={svgPaths.p3fbb0c00} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector" />
          <path d={svgPaths.p11d3d800} fill="var(--fill-0, white)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function Logo() {
  return (
    <div className="absolute content-stretch flex gap-[12px] h-[40px] items-start left-[406px] top-[100px] w-[148px]" data-name="Logo">
      <LogoWhite />
      <div className="[word-break:break-word] flex flex-col font-['Helvetica_Now_Display:Medium',sans-serif] h-[40px] justify-center leading-[0] not-italic relative shrink-0 text-[32px] text-white w-[94px]">
        <p className="leading-[normal]">Eccillo</p>
      </div>
    </div>
  );
}

function LogoTopSpacer() {
  return <div className="absolute h-[72px] left-[28px] opacity-0 right-[28px] top-[140px]" data-name="logo-top-spacer" />;
}

function Hero() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-center relative shrink-0 text-center text-white w-full" data-name="hero">
      <p className="font-['Georgia_Pro:Light_Italic',sans-serif] italic leading-[1.2] relative shrink-0 text-[44px] w-full">Create your account</p>
      <p className="font-['Helvetica_Now_Display:Light',sans-serif] leading-[1.5] not-italic opacity-75 relative shrink-0 text-[16px] w-full">Sign up to start planning your events</p>
    </div>
  );
}

function User() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="user">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="user" opacity="0.9">
          <path d={svgPaths.p32e4b800} id="Vector" stroke="var(--stroke-0, #1A1A1A)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function NameField() {
  return (
    <div className="bg-white h-[56px] relative rounded-[200px] shrink-0 w-full" data-name="name-field">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.4)] border-solid inset-0 pointer-events-none rounded-[200px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center px-[20px] relative size-full">
          <User />
          <p className="[word-break:break-word] flex-[1_0_0] font-['Helvetica_Now_Display:Light',sans-serif] leading-[normal] min-w-px not-italic opacity-65 relative text-[#1a1a1a] text-[16px]">Full name</p>
        </div>
      </div>
    </div>
  );
}

function Mail() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="mail">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="mail" opacity="0.9">
          <path d={svgPaths.p25400d00} id="Vector" stroke="var(--stroke-0, #1A1A1A)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function EmailField() {
  return (
    <div className="bg-white h-[56px] relative rounded-[200px] shrink-0 w-full" data-name="email-field">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.4)] border-solid inset-0 pointer-events-none rounded-[200px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center px-[20px] relative size-full">
          <Mail />
          <p className="[word-break:break-word] flex-[1_0_0] font-['Helvetica_Now_Display:Light',sans-serif] leading-[normal] min-w-px not-italic opacity-65 relative text-[#1a1a1a] text-[16px]">Email address</p>
        </div>
      </div>
    </div>
  );
}

function Lock() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lock" opacity="0.9">
          <path d={svgPaths.p3ad10700} id="Vector" stroke="var(--stroke-0, #1A1A1A)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Eye() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="eye">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="eye" opacity="0.75">
          <path d={svgPaths.p197a0df0} id="Vector" stroke="var(--stroke-0, #1A1A1A)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function PasswordField() {
  return (
    <div className="bg-white h-[56px] relative rounded-[200px] shrink-0 w-full" data-name="password-field">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.4)] border-solid inset-0 pointer-events-none rounded-[200px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center px-[20px] relative size-full">
          <Lock />
          <p className="[word-break:break-word] flex-[1_0_0] font-['Helvetica_Now_Display:Regular',sans-serif] leading-[normal] min-w-px not-italic opacity-65 relative text-[#1a1a1a] text-[16px]">Password</p>
          <Eye />
        </div>
      </div>
    </div>
  );
}

function Lock1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lock" opacity="0.9">
          <path d={svgPaths.p3ad10700} id="Vector" stroke="var(--stroke-0, #1A1A1A)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Eye1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="eye">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="eye" opacity="0.75">
          <path d={svgPaths.p197a0df0} id="Vector" stroke="var(--stroke-0, #1A1A1A)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function ConfirmPasswordField() {
  return (
    <div className="bg-white h-[56px] relative rounded-[200px] shrink-0 w-full" data-name="confirm-password-field">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.4)] border-solid inset-0 pointer-events-none rounded-[200px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center px-[20px] relative size-full">
          <Lock1 />
          <p className="[word-break:break-word] flex-[1_0_0] font-['Helvetica_Now_Display:Regular',sans-serif] leading-[normal] min-w-px not-italic opacity-65 relative text-[#1a1a1a] text-[16px]">Confirm password</p>
          <Eye1 />
        </div>
      </div>
    </div>
  );
}

function Fields() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="fields">
      <NameField />
      <EmailField />
      <PasswordField />
      <ConfirmPasswordField />
    </div>
  );
}

function BtnCreateAccount() {
  return (
    <div className="bg-black content-stretch flex h-[56px] items-center justify-center relative rounded-[200px] shrink-0 w-full" data-name="btn-create-account">
      <p className="[word-break:break-word] font-['Helvetica_Now_Display:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">Create Account</p>
    </div>
  );
}

function LineLeft() {
  return <div className="bg-white flex-[1_0_0] h-px min-w-px opacity-25 relative" data-name="line-left" />;
}

function LineRight() {
  return <div className="bg-white flex-[1_0_0] h-px min-w-px opacity-25 relative" data-name="line-right" />;
}

function Divider() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="divider">
      <LineLeft />
      <p className="[word-break:break-word] font-['Helvetica_Now_Display:Regular',sans-serif] leading-[normal] not-italic opacity-60 relative shrink-0 text-[12px] text-white whitespace-nowrap">or</p>
      <LineRight />
    </div>
  );
}

function Logo1() {
  return (
    <div className="col-1 ml-0 mt-0 relative row-1 size-[23px]" data-name="Logo">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 23 23">
        <g id="Logo">
          <path clipRule="evenodd" d={svgPaths.p15d7be00} fill="var(--fill-0, #4285F4)" fillRule="evenodd" id="Vector" />
          <path clipRule="evenodd" d={svgPaths.p1f2f62f0} fill="var(--fill-0, #34A853)" fillRule="evenodd" id="Vector_2" />
          <path clipRule="evenodd" d={svgPaths.p2f8c9600} fill="var(--fill-0, #FBBC05)" fillRule="evenodd" id="Vector_3" />
          <path clipRule="evenodd" d={svgPaths.p14f01400} fill="var(--fill-0, #EA4335)" fillRule="evenodd" id="Vector_4" />
          <g id="Vector_5" />
        </g>
      </svg>
    </div>
  );
}

function ButtonContent() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-name="Button Content">
      <Logo1 />
      <div className="[word-break:break-word] col-1 flex flex-col font-['Inter:Medium',sans-serif] font-medium justify-center ml-[39px] mt-[1.5px] not-italic relative row-1 text-[#1d1c2b] text-[20px] whitespace-nowrap">
        <p className="leading-[20px]">Sign up with Google</p>
      </div>
    </div>
  );
}

function ButtonContent1() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-name="Button Content">
      <div className="col-1 h-[23px] ml-0 mt-0 relative row-1 w-[19.373px]" data-name="Logo">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.3734 23">
          <path d={svgPaths.p27f3500} fill="var(--fill-0, black)" id="Logo" />
        </svg>
      </div>
      <div className="[word-break:break-word] col-1 flex flex-col font-['SF_Pro_Display:Medium',sans-serif] justify-center ml-[35.15px] mt-[1.5px] not-italic relative row-1 text-[#1d1c2b] text-[20px] whitespace-nowrap">
        <p className="leading-[20px]">Sign up with Apple</p>
      </div>
    </div>
  );
}

function Social() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-center justify-center relative shrink-0 w-full" data-name="social">
      <div className="bg-white content-stretch drop-shadow-[0px_18px_15px_rgba(131,119,198,0.11)] flex flex-col h-[61px] items-start px-[52px] py-[19px] relative rounded-[50px] shrink-0 w-[324px]" data-name="Google Button">
        <div aria-hidden className="absolute border border-[#e0e0e9] border-solid inset-0 pointer-events-none rounded-[50px]" />
        <ButtonContent />
      </div>
      <div className="bg-white content-stretch drop-shadow-[0px_18px_15px_rgba(131,119,198,0.11)] flex flex-col items-start px-[64px] py-[19px] relative rounded-[50px] shrink-0" data-name="Apple Button">
        <div aria-hidden className="absolute border border-[#e0e0e9] border-solid inset-0 pointer-events-none rounded-[50px]" />
        <ButtonContent1 />
      </div>
    </div>
  );
}

function SignupContent() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[32px] items-center left-[220px] right-[220px] top-[212px]" data-name="signup-content">
      <Hero />
      <Fields />
      <BtnCreateAccount />
      <Divider />
      <Social />
      <p className="[word-break:break-word] font-['Helvetica_Now_Display:Light',sans-serif] leading-[0] not-italic opacity-75 relative shrink-0 text-[14px] text-center text-white w-full">
        <span className="font-['Helvetica_Now_Display:Regular',sans-serif] leading-[1.5]">{`Already have an account? `}</span>
        <span className="font-['Helvetica_Now_Display:Medium',sans-serif] leading-[1.5]">Sign in</span>
      </p>
    </div>
  );
}

function LoginFrame() {
  return (
    <div className="bg-[rgba(0,0,0,0.8)] h-[1080px] overflow-clip relative shrink-0 w-[960px]" data-name="Login_frame">
      <div className="absolute bg-[rgba(26,26,26,0.8)] border-[0.2px] border-solid border-white h-[1004px] left-[34px] rounded-[20px] top-[29px] w-[903px]" />
      <Logo />
      <LogoTopSpacer />
      <SignupContent />
    </div>
  );
}

function Frame1() {
  return (
    <div className="[word-break:break-word] h-[1080px] not-italic overflow-clip relative shrink-0 text-white w-[960px]">
      <div className="absolute font-['Georgia_Pro:Light',sans-serif] leading-[0] left-[88px] text-[84px] top-[136px] w-[662px]">
        <p className="leading-[normal] mb-0">Every Event.</p>
        <p>
          <span className="leading-[normal]">
            Every Connection.
            <br aria-hidden />
          </span>
          <span className="[word-break:break-word] font-['Georgia_Pro:Light_Italic',sans-serif] italic leading-[normal]">All in one place.</span>
        </p>
      </div>
      <p className="absolute font-['Helvetica_Now_Display:Light',sans-serif] leading-[normal] left-[88px] text-[24px] top-[437px] w-[481px]">Plan, organize, promote, and grow your events seamlessly - from start to unforgettable</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="absolute bg-black content-stretch flex items-center left-0 overflow-clip top-0 w-[1920px]">
      <LoginFrame />
      <Frame1 />
    </div>
  );
}

export default function Signup() {
  return (
    <div className="bg-black relative size-full" data-name="Signup">
      <Frame />
    </div>
  );
}
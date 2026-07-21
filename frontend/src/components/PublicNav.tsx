import { Link } from "react-router-dom";

export default function PublicNav({ overlay = false }: { overlay?: boolean }) {
  return <header className={`${overlay ? "absolute inset-x-0 top-0 z-[60]" : "relative z-20"} border-b border-white/10 bg-black/75 text-white backdrop-blur-md`}>
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
      <Link to="/" className="font-['Lora',serif] text-xl font-bold tracking-tight">Oector</Link>
      <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex" aria-label="Primary navigation"><Link to="/" className="hover:text-white">Platform</Link><a href="/trust/pitch-atlas" target="_blank" rel="noreferrer" className="hover:text-white">Trust Center</a><Link to="/login" className="hover:text-white">Sign in</Link></nav>
      <Link to="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">Get started</Link>
    </div>
  </header>;
}

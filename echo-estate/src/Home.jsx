import { ArrowRight, BookOpen, Heart, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from './services/auth.jsx';
import Navbar from './components/Navbar';

const features = [
  {
    icon: Heart,
    title: 'Preserve',
    text: 'Gather stories, photographs, and the small details that define a life.',
  },
  {
    icon: ShieldCheck,
    title: 'Protect',
    text: 'Set clear permissions for every memory. You decide who can see what.',
  },
  {
    icon: BookOpen,
    title: 'Remember',
    text: 'Give loved ones a thoughtful, AI-powered way to revisit the legacy.',
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const ctaPath = isAuthenticated ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen bg-parchment text-ink overflow-x-hidden">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left — text */}
          <div className="animate-fade-up">
            <p className="eyebrow">Your digital legacy</p>
            <h1 className="mt-4 text-5xl sm:text-6xl font-sans font-semibold text-ink leading-[1.08] tracking-tight">
              Some moments<br />
              deserve more than<br />
              <span className="text-clay">a memory.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted max-w-md">
              Preserve the people, stories and moments that matter to you — in a private, beautiful digital space.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={ctaPath} className="btn-primary">
                Create a Legacy <ArrowRight size={16} />
              </Link>
              <Link to={isAuthenticated ? '/memories' : ctaPath} className="btn-secondary">
                Explore Memories
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex items-center gap-4 flex-wrap">
              {['Private by design', 'AI-powered', 'Your data, your control'].map((b) => (
                <span
                  key={b}
                  className="text-xs font-semibold text-muted border border-ink/12 rounded-full px-3 py-1 bg-white/60"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Right — hero photo area with floating notes */}
          <div className="relative animate-fade-up delay-200">
            {/* Main photo frame */}
            <div className="hero-photo w-full aspect-[4/5] max-h-[520px]">
              <div className="w-full h-full flex items-center justify-center bg-cream">
                <div className="text-center text-muted px-8">
                  <Heart size={40} className="mx-auto text-clay/30 mb-3" />
                  <p className="text-sm font-medium">Your memories begin here.</p>
                  <p className="text-xs mt-1 opacity-60">Your legacy photo will appear here</p>
                </div>
              </div>
            </div>

            {/* Floating memory note 1 */}
            <div className="memory-note animate-float-a" style={{ top: '14%', left: '-12%' }}>
              <span className="note-label">First day at college</span>
              <span className="note-date">Oct 05, 2026</span>
            </div>

            {/* Floating memory note 2 */}
            <div className="memory-note animate-float-b" style={{ bottom: '22%', right: '-10%' }}>
              <span className="note-label">Family trip</span>
              <span className="note-date">Jun 14, 2025</span>
            </div>

            {/* Small pill */}
            <div
              className="memory-note animate-float-a delay-300"
              style={{ bottom: '8%', left: '-8%' }}
            >
              <span className="note-label">Favorite song</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="bg-white py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow text-center">How it works</p>
          <h2 className="mt-4 section-heading text-center">
            Memories, beautifully kept.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }, i) => (
              <article
                key={title}
                className="card p-8 animate-fade-up"
                style={{ animationDelay: `${i * 100 + 100}ms` }}
              >
                <div className="w-11 h-11 rounded-2xl bg-cream flex items-center justify-center">
                  <Icon size={22} className="text-clay" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── EDITORIAL SECTION ── */}
      <section className="py-20 px-4 sm:px-6 bg-parchment">
        <div className="mx-auto max-w-5xl grid md:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <p className="eyebrow">Privacy first</p>
            <h2 className="mt-4 section-heading leading-tight">
              Your digital legacy, always under your control.
            </h2>
            <p className="mt-4 body-text">
              Echo Estate is designed around explicit consent and controlled access. Every memory carries the permissions you choose. You decide the boundaries — we help honor them.
            </p>
            <Link to={ctaPath} className="btn-primary mt-8 inline-flex">
              Start preserving <ArrowRight size={16} />
            </Link>
          </div>
          {/* Right — decorative card */}
          <div className="card p-8 bg-white border border-ink/6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-clay">Private by design</span>
              <ShieldCheck size={18} className="text-olive" />
            </div>
            <p className="text-xl font-semibold text-ink leading-snug">
              &ldquo;A safe place for the stories that make a life.&rdquo;
            </p>
            <div className="mt-6 h-px w-full bg-gradient-to-r from-clay/40 to-transparent" />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Every memory is kept with the permissions and care you choose.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Begin thoughtfully</p>
          <h2 className="mt-4 section-heading">
            A living record for the people and moments you love.
          </h2>
          <Link to={ctaPath} className="btn-primary mt-8 inline-flex">
            Create Your Legacy <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-ink/8 px-4 py-8 text-center text-xs text-muted bg-parchment">
        <span className="font-semibold text-ink">ECHO ESTATE</span>
        <span className="mx-2 text-clay">·</span>
        Preserve memories. Protect identity. Continue the story.
      </footer>
    </div>
  );
}

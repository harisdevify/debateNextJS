import {
  ArrowRight,
  MessageCircle,
  ShieldCheck,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: Video,
    title: 'Live Video Debates',
    desc: 'Real-time peer-to-peer video sessions powered by WebRTC. Crystal clear, zero latency, fully secure.',
    stat: 'WebRTC',
  },
  {
    icon: MessageCircle,
    title: 'Live Text Chat',
    desc: 'Instant messaging with smart profanity filtering. Stay on topic, stay respectful.',
    stat: 'Real-time',
  },
  {
    icon: ShieldCheck,
    title: 'Moderated Sessions',
    desc: 'Dedicated moderators ensure every debate stays compliant with Islamic values and platform rules.',
    stat: 'Monitored',
  },
];

const stats = [
  { icon: Users, value: '2,400+', label: 'Active Debaters' },
  { icon: Zap, value: '180ms', label: 'Avg Latency' },
  { icon: ShieldCheck, value: '100%', label: 'Moderated' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden max-container">
      {/* ── HERO ── */}
      <section className="relative flex items-center justify-center text-center px-5 min-h-[calc(100vh-56px)]">
        {/* Background layers */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* dot grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          {/* center glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(0,191,166,0.18) 0%, transparent 65%)',
            }}
          />
          {/* top-right accent */}
          <div
            className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(0,191,166,0.08) 0%, transparent 70%)',
            }}
          />
          {/* bottom-left accent */}
          <div
            className="absolute -bottom-20 -left-20 w-[300px] h-[300px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(0,191,166,0.06) 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative z-10 max-w-[860px] mx-auto flex flex-col items-center gap-6 py-24 stagger">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(0,191,166,0.3)] bg-[rgba(0,191,166,0.08)] text-primary text-sm font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Islamic Debate Platform — Live Now
          </div>

          {/* Heading */}
          <h1 className="text-[clamp(2.4rem,5.5vw,4rem)] font-black leading-[1.15] text-white tracking-tight">
            A Safe Space for{' '}
            <span
              className="relative inline-block text-primary"
              style={{ textShadow: '0 0 40px rgba(0,191,166,0.4)' }}
            >
              Islamic Discussions
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-[1.1rem] text-white/50 max-w-[560px] leading-relaxed">
            Engage in respectful, guided debates through live video and text —
            grounded in Islamic values, powered by modern technology.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            <Link
              href="/video"
              className="pressable group flex items-center gap-2 px-7 py-3.5 text-[1rem] font-bold rounded-xl
                         bg-primary text-[#0a0a0a]
                         shadow-[0_0_0_0_rgba(0,191,166,0.5)]
                         transition-all duration-300
                         hover:shadow-[0_0_30px_rgba(0,191,166,0.45)]
                         hover:bg-[#00d4b8] hover:-translate-y-0.5"
            >
              Join a Debate
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 px-7 py-3.5 text-[1rem] font-semibold rounded-xl
                         bg-white/5 text-white border border-white/10
                         transition-all duration-300
                         hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5"
            >
              Learn More
            </a>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap justify-center gap-8 mt-10 pt-10 border-t border-white/[0.07] w-full stagger">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-primary">
                  <Icon size={16} />
                  <span className="text-2xl font-black text-white">
                    {value}
                  </span>
                </div>
                <span className="text-white/40 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative px-6 py-28">
        {/* subtle bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgba(0,191,166,0.03), transparent)',
          }}
        />

        <div className="relative z-10 max-w-[1100px] mx-auto">
          {/* Section label */}
          <div className="text-center mb-16">
            <span className="text-primary text-sm font-semibold uppercase tracking-[0.15em]">
              Why Choose Us
            </span>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black text-white mt-3 leading-tight">
              Everything you need for a great debate
            </h2>
            <p className="text-white/40 mt-3 max-w-[480px] mx-auto text-[0.95rem]">
              Built from the ground up for respectful, structured Islamic
              discourse.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
            {features.map(({ icon: Icon, title, desc, stat }) => (
              <div
                key={title}
                className="group relative flex flex-col gap-5 p-7 rounded-2xl
                           bg-[rgba(10,24,22,0.8)] border border-white/[0.07]
                           transition-all duration-500
                           hover:border-[rgba(0,191,166,0.35)]
                           hover:bg-[rgba(10,24,22,0.95)]
                           hover:-translate-y-2
                           hover:shadow-[0_20px_50px_rgba(0,191,166,0.1)]"
              >
                {/* top-right stat badge */}
                <span className="absolute top-5 right-5 text-[0.7rem] font-bold uppercase tracking-widest text-primary/50 group-hover:text-primary transition-colors duration-300">
                  {stat}
                </span>

                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center
                                bg-[rgba(0,191,166,0.1)] border border-[rgba(0,191,166,0.15)]
                                transition-all duration-300
                                group-hover:bg-[rgba(0,191,166,0.2)] group-hover:border-[rgba(0,191,166,0.35)]"
                >
                  <Icon size={22} className="stroke-primary" />
                </div>

                {/* Text */}
                <div>
                  <h3 className="text-white font-bold text-[1.1rem] mb-2">
                    {title}
                  </h3>
                  <p className="text-white/45 text-[0.9rem] leading-relaxed">
                    {desc}
                  </p>
                </div>

                {/* bottom accent line */}
                <div className="absolute bottom-0 left-7 right-7 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <p className="text-white/30 text-sm mb-5">
              Ready to have a respectful discussion?
            </p>
            <Link
              href="/rules"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                         border border-[rgba(0,191,166,0.25)] text-primary
                         transition-all duration-300
                         hover:bg-[rgba(0,191,166,0.08)] hover:border-[rgba(0,191,166,0.5)]"
            >
              Read the Rules First
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

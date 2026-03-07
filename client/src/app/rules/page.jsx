'use client';
import {
  ArrowRight,
  Ban,
  BookOpen,
  Gavel,
  Landmark,
  ShieldCheck,
  UserCheck,
  Video,
  VolumeX,
} from 'lucide-react';
import Link from 'next/link';

const rules = [
  {
    icon: Landmark,
    title: 'Islamic Values',
    text: 'Respect Islamic values at all times. All discussions must align with authentic teachings.',
  },
  {
    icon: Ban,
    title: 'No Hate Speech',
    text: 'Absolutely no hate speech, personal attacks, or disrespectful language toward any person.',
  },
  {
    icon: BookOpen,
    title: 'Authentic Sources',
    text: 'Base your arguments on verified Islamic sources — Quran, Hadith, and scholarly consensus.',
  },
  {
    icon: Video,
    title: 'Respectful Conduct',
    text: 'Keep video and audio appropriate at all times. No inappropriate gestures or backgrounds.',
  },
  {
    icon: VolumeX,
    title: 'Calm Tone',
    text: 'Avoid shouting, aggressive tone, or interrupting your opponent mid-argument.',
  },
  {
    icon: UserCheck,
    title: 'Moderator Authority',
    text: 'Follow all moderator instructions immediately and without question.',
  },
  {
    icon: Gavel,
    title: 'Instant Ban Policy',
    text: 'Any violation of these rules results in an immediate and permanent ban from the platform.',
  },
];

export default function RulesPage() {
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <section className="relative flex-1 px-5 py-20">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]"
            style={{
              background:
                'radial-gradient(ellipse, rgba(0,191,166,0.12) 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative z-10 max-w-[720px] mx-auto">
          {/* Header */}
          <div className="text-center mb-14">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full
                            border border-[rgba(0,191,166,0.3)] bg-[rgba(0,191,166,0.08)]
                            text-primary text-sm font-medium"
            >
              <ShieldCheck size={14} />
              Before You Join
            </div>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-black text-white leading-tight mb-4">
              Code of Conduct
            </h1>
            <p className="text-white/45 text-[1rem] max-w-[480px] mx-auto leading-relaxed">
              Every debater must read and agree to these rules. They exist to
              protect the quality and integrity of Islamic discourse on this
              platform.
            </p>
          </div>

          {/* Rules List */}
          <ol className="flex flex-col gap-3">
            {rules.map(({ icon: Icon, title, text }, index) => (
              <li
                key={title}
                className="group flex items-start gap-4 px-5 py-4 rounded-2xl
                           bg-[rgba(10,24,22,0.7)] border border-white/[0.07]
                           transition-all duration-300
                           hover:border-[rgba(0,191,166,0.35)]
                           hover:bg-[rgba(10,24,22,0.95)]
                           hover:shadow-[0_8px_30px_rgba(0,191,166,0.08)]
                           hover:-translate-y-0.5"
              >
                {/* Number */}
                <span
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                                 text-xs font-bold bg-[rgba(0,191,166,0.1)] text-primary/60
                                 border border-[rgba(0,191,166,0.15)]
                                 group-hover:bg-[rgba(0,191,166,0.2)] group-hover:text-primary
                                 transition-all duration-300 mt-0.5"
                >
                  {index + 1}
                </span>

                {/* Icon */}
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                                bg-[rgba(0,191,166,0.08)] border border-[rgba(0,191,166,0.12)]
                                transition-all duration-300
                                group-hover:bg-[rgba(0,191,166,0.18)] group-hover:border-[rgba(0,191,166,0.3)]"
                >
                  <Icon size={18} className="stroke-primary" />
                </div>

                {/* Text */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-white font-semibold text-[0.95rem]">
                    {title}
                  </span>
                  <span className="text-white/45 text-[0.85rem] leading-relaxed">
                    {text}
                  </span>
                </div>
              </li>
            ))}
          </ol>

          {/* Agreement box */}
          <div
            className="mt-10 p-6 rounded-2xl border border-[rgba(0,191,166,0.2)]
                          bg-[rgba(0,191,166,0.04)] text-center"
          >
            <p className="text-white/50 text-sm mb-5 leading-relaxed">
              By clicking below, you confirm that you have read, understood, and
              agree to abide by the Code of Conduct during all debates.
            </p>
            <Link
              href="/video"
              className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl
                         bg-primary text-[#0a0a0a] font-bold text-[1rem]
                         shadow-[0_0_0_0_rgba(0,191,166,0.4)]
                         transition-all duration-300
                         hover:shadow-[0_0_28px_rgba(0,191,166,0.4)]
                         hover:bg-[#00d4b8] hover:-translate-y-0.5"
            >
              I Agree &amp; Join Debate
              <ArrowRight
                size={17}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

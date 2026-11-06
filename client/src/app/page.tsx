import {
  ArrowRight, AudioLines, Check, Clock3, Headphones, Languages,
  MessageSquareText, ShieldCheck, SlidersHorizontal, UsersRound, Video
} from 'lucide-react';
import Link from 'next/link';
import { DebateCTA } from '@/components/debate/DebateCTA';

const steps = [
  { icon: SlidersHorizontal, title: 'Choose your format', text: 'Pick a topic, language, and friendly or formal mode.' },
  { icon: UsersRound, title: 'Connect one to one', text: 'Match with someone who chose compatible preferences.' },
  { icon: ShieldCheck, title: 'Discuss with respect', text: 'Stay in control with reporting and blocking tools.' },
];

function RoomPreview() {
  return (
    <div aria-label="Illustration of the debate room interface" className="relative mx-auto w-full max-w-[550px] lg:mx-0">
      <div className="pointer-events-none absolute -inset-5 rounded-[32px] border border-primary/10 sm:-inset-9" />
      <div className="relative overflow-hidden rounded-[25px] border border-white/15 bg-[#101917] shadow-[0_32px_100px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="size-2 rounded-full bg-primary" /> Debate room
            <span className="ml-1 text-[10px] font-medium uppercase tracking-widest text-white/45">Preview</span>
          </div>
          <span className="rounded-md bg-white/5 px-2.5 py-1 text-[11px] text-white/55">Formal · English</span>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-4">
          <div className="flex aspect-[4/5] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#172520] sm:aspect-square">
            <div className="grid size-14 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary"><AudioLines size={26} /></div>
            <span className="mt-4 text-xs font-semibold text-white/85">Your partner</span>
            <span className="mt-1 text-[10px] text-white/45">Connected</span>
          </div>
          <div className="flex aspect-[4/5] flex-col items-center justify-center rounded-2xl border border-primary/25 bg-[#122320] sm:aspect-square">
            <div className="grid size-14 place-items-center rounded-full border border-white/10 bg-white/5 text-white/80"><Video size={25} /></div>
            <span className="mt-4 text-xs font-semibold text-white/85">You</span>
            <span className="mt-1 text-[10px] text-white/45">Camera preview</span>
          </div>
        </div>
        <div className="mx-4 mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div><p className="text-[10px] uppercase tracking-widest text-primary">Speaking turn</p><p className="mt-0.5 text-xs font-medium text-white">A structured conversation</p></div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white/70"><Clock3 size={14} /> Timed</span>
        </div>
        <div className="flex items-center justify-center gap-3 border-t border-white/10 bg-[#0a1411] p-4">
          <span className="grid size-10 place-items-center rounded-full bg-white/10 text-white/80"><Headphones size={17} /></span>
          <span className="grid size-10 place-items-center rounded-full bg-white/10 text-white/80"><MessageSquareText size={17} /></span>
          <span className="flex h-10 items-center gap-2 rounded-full bg-primary/15 px-4 text-xs font-semibold text-primary"><Check size={14} /> You're in control</span>
        </div>
      </div>
      <p className="mt-5 text-center text-[11px] text-white/40">Illustrative room preview · Not a live session</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-w-0 overflow-hidden bg-background">
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_25%,rgba(0,217,189,0.07),transparent_60%)]" />
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-20 lg:min-h-[680px] lg:grid-cols-[1.04fr_0.96fr] lg:gap-20 lg:py-24">
          <div className="relative z-10 max-w-2xl">
            <div className="mb-8 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-primary"><span className="h-px w-8 bg-primary" /> A better place to disagree</div>
            <h1 className="text-[clamp(3rem,6vw,5.8rem)] font-semibold leading-[1.02] tracking-[-0.055em] text-white">Good debates<br />begin with <span className="text-primary">respect.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
              Thoughtful Islamic discussions, real people, and room for different perspectives.
              Choose what matters to you, then join a one-to-one video conversation.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <DebateCTA className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-background transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" />
              <Link href="/rules" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-sm font-semibold text-white/85 transition-colors hover:border-white/40 hover:bg-white/5">Read guidelines <ArrowRight size={16} /></Link>
            </div>
            <div className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-white/12 pt-6">
              <div><p className="text-lg font-semibold text-white">1:1</p><p className="mt-1 text-xs text-white/50">Private matching</p></div>
              <div><p className="text-lg font-semibold text-white">2 modes</p><p className="mt-1 text-xs text-white/50">Friendly or formal</p></div>
              <div><p className="text-lg font-semibold text-white">2 languages</p><p className="mt-1 text-xs text-white/50">Urdu and English</p></div>
            </div>
          </div>
          <RoomPreview />
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">How it works</p>
            <h2 className="mt-5 max-w-md text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">Less noise.<br />More meaningful conversation.</h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/60">Focus on the person and the discussion, not on complicated controls.</p>
            <Link href="/rules" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Community guidelines <ArrowRight size={15} /></Link>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="grid gap-3 py-7 sm:grid-cols-[58px_1fr] sm:gap-5">
                <div className="flex items-center gap-3"><span className="text-[11px] font-mono text-white/30">0{index + 1}</span><Icon size={21} className="text-primary" aria-hidden="true" /></div>
                <div><h3 className="text-lg font-semibold text-white">{title}</h3><p className="mt-2 max-w-lg text-sm leading-7 text-white/60">{text}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="border-t border-white/10 bg-[#0c1512]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div><div className="flex items-center gap-2 text-primary"><Languages size={19} /><span className="text-xs font-semibold uppercase tracking-[0.17em]">Choose your conversation</span></div><h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Ready to be heard?</h2></div>
          <DebateCTA className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-background transition-colors hover:bg-primary-hover" />
        </div>
      </section>
    </div>
  );
}

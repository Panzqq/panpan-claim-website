'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  ChevronRight,
  CloudUpload,
  Copy,
  FileVideo,
  Loader2,
  LockKeyhole,
  MessageCircle,
  PlayCircle,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Video,
  Wifi,
  Zap
} from 'lucide-react';

const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || 100);

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function StatCard({ label, value, icon, note }) {
  return (
    <div className="neo-card group rounded-3xl p-5 transition duration-300 hover:-translate-y-1">
      <div className="mb-3 flex items-center justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border-[3px] border-ink bg-neon shadow-brutalSm transition group-hover:rotate-3">
          {icon}
        </div>
        <span className="rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-[10px] font-black uppercase shadow-brutalTiny">Live</span>
      </div>
      <p className="font-mono text-[11px] font-black uppercase tracking-[.18em] text-gray-500">{label}</p>
      <p className="mt-1 font-display text-4xl font-black leading-none text-ink">{value}</p>
      {note && <p className="mt-2 font-mono text-xs font-bold text-gray-500">{note}</p>}
    </div>
  );
}

function FeatureCard({ icon, title, text, color = 'bg-white' }) {
  return (
    <div className={cx('rounded-3xl border-[3px] border-ink p-5 shadow-brutalSm transition duration-300 hover:-translate-y-1 hover:shadow-brutal', color)}>
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border-[3px] border-ink bg-white shadow-brutalTiny">
        {icon}
      </div>
      <h3 className="font-display text-lg font-black text-ink">{title}</h3>
      <p className="mt-2 font-mono text-sm leading-relaxed text-gray-700">{text}</p>
    </div>
  );
}

function StepLine({ active, done, number, title, text }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cx(
          'grid h-10 w-10 place-items-center rounded-full border-[3px] border-ink font-display text-sm font-black shadow-brutalTiny transition',
          done ? 'bg-neon' : active ? 'bg-skyx' : 'bg-white'
        )}>
          {done ? <Check size={18} strokeWidth={4} /> : number}
        </div>
        {number !== '03' && <div className="h-10 w-[3px] bg-ink" />}
      </div>
      <div className="pb-4">
        <p className="font-display text-base font-black text-ink">{title}</p>
        <p className="font-mono text-xs leading-relaxed text-gray-600">{text}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [claim, setClaim] = useState(null);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ total: '-', claimed: '-', failed: '-', today: '-' });

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  async function loadStats() {
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setStats(data);
    } catch {}
  }

  useEffect(() => {
    loadStats();
    const timer = setInterval(loadStats, 5000);
    return () => clearInterval(timer);
  }, []);

  function resetState() {
    setClaim(null);
    setError('');
    setProgress(0);
    setCopied(false);
  }

  function onSelectFile(event) {
    const selected = event.target.files?.[0];
    resetState();

    if (!selected) return;
    if (!selected.type.startsWith('video/')) {
      setFile(null);
      setError('File harus berupa video. Gunakan format seperti MP4, MOV, WEBM, atau 3GP.');
      return;
    }
    if (selected.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      setError(`Ukuran video terlalu besar. Maksimal ${MAX_MB} MB.`);
      return;
    }
    setFile(selected);
  }

  async function uploadFile() {
    if (!file) {
      inputRef.current?.click();
      return;
    }
    if (!supabase) {
      setError('ENV Supabase frontend belum diisi. Cek NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }

    setError('');
    setClaim(null);
    setCopied(false);
    setPhase('preparing');
    setProgress(8);

    let fakeTimer;
    try {
      const create = await fetch('/api/create-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, size: file.size })
      });
      const uploadData = await create.json();
      if (!uploadData.success) throw new Error(uploadData.error || 'Gagal membuat upload session.');

      setPhase('uploading');
      setProgress(20);
      fakeTimer = setInterval(() => {
        setProgress((n) => (n < 90 ? n + Math.floor(Math.random() * 7) + 2 : n));
      }, 380);

      const { error: uploadError } = await supabase.storage
        .from(process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'claim-videos')
        .uploadToSignedUrl(uploadData.storagePath, uploadData.uploadToken, file, {
          contentType: file.type,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;
      clearInterval(fakeTimer);
      setProgress(96);
      setPhase('finishing');

      const finish = await fetch('/api/finish-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: uploadData.token, storagePath: uploadData.storagePath })
      });
      const finishData = await finish.json();
      if (!finishData.success) throw new Error(finishData.error || 'Upload selesai, tapi gagal menyimpan data claim.');

      setProgress(100);
      setPhase('redirecting');
      setClaim(uploadData);
      loadStats();

      if (uploadData.redirectUrl) {
        window.location.href = uploadData.redirectUrl;
        return;
      }

      setPhase('done');
    } catch (err) {
      clearInterval(fakeTimer);
      setPhase('idle');
      setError(err.message || 'Upload gagal. Coba ulangi lagi.');
    }
  }

  async function copyClaim() {
    if (!claim?.claimMessage) return;
    await navigator.clipboard.writeText(claim.claimMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const isBusy = ['preparing', 'uploading', 'finishing', 'redirecting'].includes(phase);
  const sizeText = file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : `Maksimal ${MAX_MB} MB`;
  const phaseText = {
    idle: 'Siap upload',
    preparing: 'Menyiapkan kode claim',
    uploading: 'Mengupload video',
    finishing: 'Menyimpan data claim',
    redirecting: 'Mengarahkan ke WhatsApp',
    done: 'Upload berhasil'
  }[phase];

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-ink md:px-6 md:py-8">
      <div className="bg-orb bg-orb-one" />
      <div className="bg-orb bg-orb-two" />
      <div className="bg-orb bg-orb-three" />

      <div className="relative mx-auto max-w-7xl">
        <nav className="neo-card mb-6 flex items-center justify-between rounded-[28px] px-4 py-3 md:px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border-[3px] border-ink bg-neon shadow-brutalSm">
              <Video size={24} strokeWidth={3} />
            </div>
            <div>
              <p className="font-display text-xl font-black leading-5 md:text-2xl">PanPan SW HD</p>
              <p className="font-mono text-[11px] font-bold text-gray-500">Private WhatsApp Bot Gateway</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border-[3px] border-ink bg-white px-4 py-2 font-mono text-xs font-black shadow-brutalTiny sm:flex">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 pulse-dot" />
            BOT ONLINE
          </div>
        </nav>

        <section className="grid items-stretch gap-6 lg:grid-cols-[1.08fr_.92fr]">
          <div className="neo-card rounded-[34px] p-5 md:p-9">
            <div className="mb-6 flex flex-wrap gap-2">
              <span className="chip"><Sparkles size={14} /> Smooth Neobrutalism</span>
              <span className="chip"><ShieldCheck size={14} /> Aman untuk Bot Sendiri</span>
              <span className="chip"><Zap size={14} /> Auto Redirect WA</span>
            </div>

            <h1 className="max-w-4xl font-display text-4xl font-black leading-[1.02] tracking-tight md:text-6xl xl:text-7xl">
              Upload video,
              <span className="relative mx-2 inline-block rotate-[-1deg] rounded-2xl border-[4px] border-ink bg-neon px-3 shadow-brutalSm">
                claim cepat
              </span>
              lewat bot WA.
            </h1>

            <p className="mt-6 max-w-2xl font-mono text-sm font-semibold leading-relaxed text-gray-700 md:text-base">
              Website ini dibuat sebagai jembatan upload video ke bot WhatsApp kamu. Setelah upload selesai, user langsung diarahkan ke nomor bot dengan pesan <b>.claim KODE</b> tanpa perlu menunggu countdown.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <FeatureCard
                color="bg-white"
                icon={<UploadCloud size={23} strokeWidth={3} />}
                title="Upload Ringkas"
                text="User cukup pilih video, sistem langsung buat token claim."
              />
              <FeatureCard
                color="bg-skyx"
                icon={<Server size={23} strokeWidth={3} />}
                title="Storage Terhubung"
                text="Video tersimpan ke Supabase dan siap dipanggil bot."
              />
              <FeatureCard
                color="bg-pinky"
                icon={<Bot size={23} strokeWidth={3} />}
                title="Bot Claim"
                text="Bot mengambil video berdasarkan kode claim yang dibuat otomatis."
              />
            </div>
          </div>

          <div className="neo-card rounded-[34px] p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] font-black uppercase tracking-[.2em] text-gray-500">Upload Panel</p>
                <h2 className="font-display text-3xl font-black">Kirim ke Bot</h2>
              </div>
              <div className="grid h-14 w-14 place-items-center rounded-2xl border-[3px] border-ink bg-neon shadow-brutalSm">
                <MessageCircle size={27} strokeWidth={3} />
              </div>
            </div>

            <div className="mb-5 rounded-3xl border-[3px] border-ink bg-white p-4 shadow-brutalSm">
              <StepLine active={phase === 'preparing'} done={!['idle', 'preparing'].includes(phase)} number="01" title="Buat kode" text="Website menyiapkan token claim unik." />
              <StepLine active={phase === 'uploading'} done={['finishing', 'redirecting', 'done'].includes(phase)} number="02" title="Upload video" text="Video dikirim ke storage yang terhubung bot." />
              <StepLine active={['finishing', 'redirecting'].includes(phase)} done={['redirecting', 'done'].includes(phase)} number="03" title="Redirect WA" text="Setelah selesai, langsung masuk ke chat bot." />
            </div>

            <button
              onClick={() => inputRef.current?.click()}
              className="group relative mb-4 w-full overflow-hidden rounded-[28px] border-[3px] border-dashed border-ink bg-paper p-7 text-center shadow-innerNeo transition duration-300 hover:-translate-y-1 hover:bg-orange-50"
            >
              <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={onSelectFile} />
              <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100 upload-glow" />
              <CloudUpload className="relative mx-auto mb-3" size={52} strokeWidth={2.8} />
              <p className="relative break-words font-display text-xl font-black">{file ? file.name : 'Pilih Video dari Galeri'}</p>
              <p className="relative mt-1 font-mono text-xs font-bold text-gray-500">{sizeText}</p>
            </button>

            {error && (
              <div className="mb-4 flex gap-3 rounded-2xl border-[3px] border-ink bg-red-100 p-4 font-mono text-sm font-bold text-red-700 shadow-brutalSm">
                <AlertTriangle size={20} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {phase !== 'idle' && (
              <div className="mb-4 rounded-2xl border-[3px] border-ink bg-white p-4 shadow-brutalSm">
                <div className="mb-3 flex items-center justify-between gap-3 font-mono text-xs font-black uppercase text-gray-600">
                  <span>{phaseText}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-5 overflow-hidden rounded-full border-[3px] border-ink bg-gray-100">
                  <div className="loader-bar h-full bg-gradient-to-r from-neon via-skyx to-pinky transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {claim && (
              <div className="mb-4 rounded-2xl border-[3px] border-ink bg-neon p-4 shadow-brutalSm">
                <div className="mb-2 flex items-center gap-2 font-display text-xl font-black"><Check /> Upload Berhasil</div>
                <p className="mb-3 font-mono text-sm font-bold">Kode claim sudah dibuat:</p>
                <button onClick={copyClaim} className="flex w-full items-center justify-between rounded-xl border-[3px] border-ink bg-white px-4 py-3 font-mono text-base font-black shadow-brutalTiny">
                  {claim.claimMessage}
                  <Copy size={19} />
                </button>
                <p className="mt-3 font-mono text-xs font-black">{copied ? 'Kode berhasil disalin.' : 'Sedang mengarahkan ke WhatsApp...'}</p>
              </div>
            )}

            <button
              onClick={uploadFile}
              disabled={isBusy}
              className="brutal-btn flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-4 font-display text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isBusy ? <Loader2 className="animate-spin" /> : <Send />}
              {phase === 'idle' ? 'Upload & Claim Sekarang' : phase === 'redirecting' ? 'Membuka WhatsApp...' : phase === 'done' ? 'Upload Lagi' : 'Tunggu Sebentar'}
              {!isBusy && <ArrowRight />}
            </button>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-ink bg-white/80 p-3 font-mono text-xs font-bold text-gray-600">
              <LockKeyhole size={18} className="shrink-0" />
              <p>File hanya digunakan untuk proses claim bot. Pastikan nomor bot sudah benar di ENV Vercel.</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Total Upload" value={stats.total} note="Semua data" icon={<FileVideo size={18} strokeWidth={3} />} />
          <StatCard label="Claimed" value={stats.claimed} note="Berhasil dikirim" icon={<Check size={18} strokeWidth={4} />} />
          <StatCard label="Failed" value={stats.failed} note="Perlu dicek" icon={<ShieldCheck size={18} strokeWidth={3} />} />
          <StatCard label="Today" value={stats.today} note="Upload hari ini" icon={<Sparkles size={18} strokeWidth={3} />} />
        </section>

        <section className="neo-card mt-6 rounded-[34px] p-6 md:p-7">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[11px] font-black uppercase tracking-[.2em] text-gray-500">Workflow</p>
              <h2 className="font-display text-3xl font-black">Cara kerja sistem</h2>
            </div>
            <span className="chip w-fit"><Wifi size={14} /> Website + Bot WA</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flow-card"><span>01</span><p>Website upload video ke Supabase Storage.</p></div>
            <div className="flow-card"><span>02</span><p>Token claim disimpan ke database.</p></div>
            <div className="flow-card"><span>03</span><p>User langsung diarahkan ke WhatsApp untuk mengirim <b>.claim KODE</b>.</p></div>
          </div>
        </section>

        <footer className="py-8 text-center font-mono text-xs font-black text-gray-600">
          <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-ink bg-white px-5 py-3 shadow-brutalTiny">
            <PlayCircle size={16} /> Powered by PanPan SW HD <ChevronRight size={15} /> Bot Claim System
          </div>
        </footer>
      </div>
    </main>
  );
}

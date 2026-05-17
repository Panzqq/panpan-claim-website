'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowRight, BadgeCheck, Bot, Check, CloudUpload, Copy, FileVideo, Loader2, MessageCircle, ShieldCheck, Sparkles, UploadCloud, Wifi } from 'lucide-react';

const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || 100);

function StatCard({ label, value, icon }) {
  return (
    <div className="brutal-card rounded-2xl p-4 pop-in">
      <div className="mb-2 flex items-center gap-2 font-mono text-xs font-black uppercase text-gray-500">
        {icon}
        {label}
      </div>
      <div className="font-display text-3xl font-black">{value}</div>
    </div>
  );
}

function StepCard({ number, title, text, icon }) {
  return (
    <div className="brutal-card rounded-2xl p-5 transition duration-200 hover:-translate-y-1">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border-3 border-ink bg-neon shadow-brutalSm">
          {icon}
        </div>
        <span className="font-display text-4xl font-black text-gray-200">{number}</span>
      </div>
      <h3 className="mb-2 font-display text-lg font-black">{title}</h3>
      <p className="font-mono text-sm leading-relaxed text-gray-600">{text}</p>
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
  const [countdown, setCountdown] = useState(0);
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

  useEffect(() => {
    if (!claim?.redirectUrl || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(timer);
          window.location.href = claim.redirectUrl;
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [claim, countdown]);

  function onSelectFile(event) {
    const selected = event.target.files?.[0];
    setError('');
    setClaim(null);
    setProgress(0);

    if (!selected) return;
    if (!selected.type.startsWith('video/')) {
      setError('File harus berupa video.');
      return;
    }
    if (selected.size > MAX_MB * 1024 * 1024) {
      setError(`Ukuran maksimal ${MAX_MB} MB.`);
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
    setPhase('preparing');
    setProgress(10);

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
        setProgress((n) => (n < 88 ? n + Math.floor(Math.random() * 8) + 2 : n));
      }, 450);

      const { error: uploadError } = await supabase.storage
        .from(process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'claim-videos')
        .uploadToSignedUrl(uploadData.storagePath, uploadData.uploadToken, file, {
          contentType: file.type,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;
      clearInterval(fakeTimer);
      setProgress(95);
      setPhase('finishing');

      const finish = await fetch('/api/finish-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: uploadData.token, storagePath: uploadData.storagePath })
      });
      const finishData = await finish.json();
      if (!finishData.success) throw new Error(finishData.error || 'Upload selesai, tapi gagal menyimpan data claim.');

      setProgress(100);
      setPhase('done');
      setClaim(uploadData);
      setCountdown(uploadData.redirectUrl ? 5 : 0);
      loadStats();
    } catch (err) {
      clearInterval(fakeTimer);
      setPhase('idle');
      setError(err.message || 'Upload gagal.');
    }
  }

  async function copyClaim() {
    if (!claim?.claimMessage) return;
    await navigator.clipboard.writeText(claim.claimMessage);
  }

  const sizeText = file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Max 100 MB';

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <div className="pointer-events-none fixed left-8 top-20 hidden h-24 w-24 rounded-full border-3 border-ink bg-pinky shadow-brutalSm md:block floaty" />
      <div className="pointer-events-none fixed bottom-16 right-10 hidden h-20 w-20 rounded-2xl border-3 border-ink bg-skyx shadow-brutalSm md:block floaty-delay" />

      <nav className="brutal-card mb-6 flex items-center justify-between rounded-3xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border-3 border-ink bg-neon shadow-brutalSm">
            <FileVideo size={22} strokeWidth={3} />
          </div>
          <div>
            <p className="font-display text-lg font-black leading-5">PanPan SW HD</p>
            <p className="font-mono text-[11px] font-bold text-gray-500">Upload → Claim Bot WA</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border-2 border-ink bg-white px-3 py-2 font-mono text-xs font-black shadow-brutalSm">
          <Wifi size={14} /> ONLINE
        </div>
      </nav>

      <section className="grid items-center gap-6 md:grid-cols-[1.1fr_.9fr]">
        <div className="brutal-card rounded-3xl p-6 md:p-9 pop-in">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-white px-4 py-2 font-mono text-xs font-black shadow-brutalSm">
            <Sparkles size={15} /> Neobrutalism Smooth UI
          </div>
          <h1 className="mb-4 font-display text-4xl font-black leading-[1.02] md:text-6xl">
            Upload video, lalu <span className="rounded-xl border-3 border-ink bg-neon px-2 shadow-brutalSm">claim</span> di WhatsApp.
          </h1>
          <p className="mb-6 max-w-xl font-mono text-sm leading-relaxed text-gray-700 md:text-base">
            Website ini nyambung ke bot WhatsApp kamu. Setelah video diupload, sistem membuat kode claim dan mengarahkan user ke bot dengan format <b>.claim KODE</b>.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <StepCard number="01" title="Upload" text="Pilih video dari galeri." icon={<UploadCloud size={22} strokeWidth={3} />} />
            <StepCard number="02" title="Kode" text="Token claim dibuat otomatis." icon={<BadgeCheck size={22} strokeWidth={3} />} />
            <StepCard number="03" title="Bot" text="Video dikirim oleh bot WA." icon={<Bot size={22} strokeWidth={3} />} />
          </div>
        </div>

        <div className="brutal-card rounded-3xl p-5 md:p-6 pop-in" style={{ animationDelay: '.1s' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-black">Upload Panel</h2>
            <ShieldCheck size={28} strokeWidth={3} />
          </div>

          <button
            onClick={() => inputRef.current?.click()}
            className="mb-4 w-full rounded-3xl border-3 border-dashed border-ink bg-white p-8 text-center transition hover:bg-orange-50"
          >
            <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={onSelectFile} />
            <CloudUpload className="mx-auto mb-3" size={48} strokeWidth={2.8} />
            <p className="font-display text-xl font-black">{file ? file.name : 'Pilih Video'}</p>
            <p className="mt-1 font-mono text-xs font-bold text-gray-500">{sizeText}</p>
          </button>

          {error && (
            <div className="mb-4 rounded-2xl border-3 border-ink bg-red-100 p-3 font-mono text-sm font-bold text-red-700 shadow-brutalSm">
              {error}
            </div>
          )}

          {phase !== 'idle' && (
            <div className="mb-4 rounded-2xl border-3 border-ink bg-white p-4 shadow-brutalSm">
              <div className="mb-2 flex justify-between font-mono text-xs font-black uppercase text-gray-600">
                <span>{phase === 'done' ? 'Selesai' : 'Memproses'}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full border-2 border-ink bg-gray-100">
                <div
                  className="loader-bar h-full bg-gradient-to-r from-neon via-skyx to-pinky transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {claim && (
            <div className="mb-4 rounded-2xl border-3 border-ink bg-neon p-4 shadow-brutalSm">
              <div className="mb-2 flex items-center gap-2 font-display text-xl font-black"><Check /> Upload Berhasil</div>
              <p className="mb-3 font-mono text-sm">Kode claim kamu:</p>
              <button onClick={copyClaim} className="flex w-full items-center justify-between rounded-xl border-3 border-ink bg-white px-4 py-3 font-mono text-lg font-black shadow-brutalSm">
                {claim.claimMessage}
                <Copy size={20} />
              </button>
              {claim.redirectUrl && <p className="mt-3 font-mono text-xs font-bold">Auto redirect ke WhatsApp dalam {countdown} detik...</p>}
            </div>
          )}

          <button
            onClick={uploadFile}
            disabled={['preparing', 'uploading', 'finishing'].includes(phase)}
            className="brutal-btn flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-4 font-display text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {['preparing', 'uploading', 'finishing'].includes(phase) ? <Loader2 className="animate-spin" /> : <MessageCircle />}
            {phase === 'idle' ? 'Upload & Buat Claim' : phase === 'done' ? 'Upload Lagi' : 'Tunggu Sebentar'}
            {!['preparing', 'uploading', 'finishing'].includes(phase) && <ArrowRight />}
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Total Upload" value={stats.total} icon={<FileVideo size={15} />} />
        <StatCard label="Claimed" value={stats.claimed} icon={<Check size={15} />} />
        <StatCard label="Failed" value={stats.failed} icon={<ShieldCheck size={15} />} />
        <StatCard label="Today" value={stats.today} icon={<Sparkles size={15} />} />
      </section>

      <section className="brutal-card mt-6 rounded-3xl p-6">
        <h2 className="mb-3 font-display text-2xl font-black">Cara kerja bot</h2>
        <div className="grid gap-3 font-mono text-sm text-gray-700 md:grid-cols-3">
          <p className="rounded-2xl border-2 border-ink bg-white p-4 shadow-brutalSm">1. Website upload video ke Supabase Storage.</p>
          <p className="rounded-2xl border-2 border-ink bg-white p-4 shadow-brutalSm">2. Website menyimpan token claim ke database.</p>
          <p className="rounded-2xl border-2 border-ink bg-white p-4 shadow-brutalSm">3. Bot menjalankan <b>.claim KODE</b>, download video, lalu kirim ke user.</p>
        </div>
      </section>
    </main>
  );
}

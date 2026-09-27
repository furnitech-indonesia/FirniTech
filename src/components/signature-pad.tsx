"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Kolom tanda tangan di layar HP kurir.
 *
 * Bukan sekadar canvas: hasilnya di sini disimpan
 * sebagai bukti, jadi kualitas gambarnya ikut menentukan apakah bukti itu
 * berguna. Canvas di-backing store `devicePixelRatio`, lalu diekspor PNG pada
 * ukuran fisik itu — bukan ukuran CSS-nya. Kalau tidak, gambar yang tersimpan di layar 3x akan buram saat dibuka.
 * dengan `touch-action: none`, gesture menggambar tidak memicu scroll
 * halaman — tanpa itu kurir yang menandatangani dengan jari justru sedang
 * menggeser daftar pengiriman, dan yang "tertulis" adalah daftar itu.
 * yang ia tuliskan” adalah daftar, bukan tanda tangan.
 *
 * Yang dikembalikan adalah data URL, bukan `File`. Alasannya bukan
 
 *kesederhanaan: data URL masuk ke `FormData` sebagai string biasa sehingga
 * tidak perlu `File` yang harus dibuat dari `Blob`, dan
 * `decodeSignatureDataUrl` di server sudah memeriksa prefix MIME serta
 * ukurannya sebelum jadi berkas. Yang tidak diperiksa di server adalah
 * "apakah ini benar-benar gambar" — dan itu memang tidak bisa diperiksa tanpa
 * memuat byte-nya, sedangkan PNG dari canvas dijamin browser sendiri.
 */
export function SignaturePad({
  name,
  label = "Tanda tangan yang menerima",
  hint = "Minta yang menerima menandatangani di layar ini dengan jarinya.",
}: {
  name: string;
  label?: string;
  hint?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [dataUrl, setDataUrl] = useState("");
  const [hasInk, setHasInk] = useState(false);

  const prepare = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    // Dikalikan rasio supaya backing store sama dengan piksel fisiknya.
    // Dicek tiap kali prepare() dipanggil supaya tidak hilang saat layar
    // dirotasi atau zoom browser berubah di tengah sesi.
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return null;

    if (canvas.width !== Math.round(width * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, width, height };
  }, []);

  const positionOf = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  const handleDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const ready = prepare();
      if (!ready) return;
    // `setPointerCapture`: tanpa ini, begitu jari keluar dari canvas, browser
    // berhenti mengirim event dan garisnya terpotong di tepi. Persis yang
    // terjadi saat orang menandatangani dengan tangan yang lebih besar
    // dari kolomnya.
      // canvas, browser berhenti mengirim event dan garisnya terpotong di
      // tepi. Exactly yang terjadi saat orang menandatangani dengan tangan
      // yang lebih besar dari kolomnya.
      event.currentTarget.setPointerCapture(event.pointerId);
      drawingRef.current = true;

      const { ctx } = ready;
      const { x, y } = positionOf(event);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.01, y + 0.01);
      ctx.stroke();
    },
    [positionOf, prepare],
  );

  const handleMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const ready = prepare();
      if (!ready) return;
      const { ctx } = ready;
      const { x, y } = positionOf(event);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [positionOf, prepare],
  );

  const commit = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer sudah dilepas otomatis oleh browser.
      // Tidak apa-apa, dan tidak boleh menggagalkan penyimpanan bukti.
    }

    const canvas = event.currentTarget;
    // `toDataURL` throw kalau canvas punya dimensi 0 — yang terjadi kalau
    // form-nya di luar viewport dan belum pernah di-layout. Perlakukan
    // sebagai "belum ada tanda tangan" agar pesannya terbaca.
    try {
      setDataUrl(canvas.toDataURL("image/png"));
      setHasInk(true);
    } catch {
      setDataUrl("");
    }
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ready = prepare();
    if (canvas && ready) {
      ready.ctx.clearRect(0, 0, ready.width, ready.height);
    }
    setDataUrl("");
    setHasInk(false);
  }, [prepare]);

  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={`${name}-pad`}
        className="text-sm font-medium text-secondary"
      >
        {label} <span className="text-destructive">*</span>
      </label>

      <canvas
        id={`${name}-pad`}
        ref={canvasRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={commit}
        onPointerCancel={commit}
        className="min-h-32 w-full touch-none rounded-xl border-2 border-dashed border-border bg-input"
        aria-label="Area menggambar tanda tangan"
      />

      <input type="hidden" name={name} value={dataUrl} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {hasInk
            ? "Tanda tangan tersimpan. Minta yang menerima menulis namanya di bawah."
            : hint}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={!hasInk}
        >
          Hapus
        </Button>
      </div>
    </div>
  );
}

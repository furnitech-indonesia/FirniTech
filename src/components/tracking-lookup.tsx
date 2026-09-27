"use client";

import { useState } from "react";

import { ZodForm } from "@/components/zod-form";
import { TextField } from "@/components/rhf-fields";
import { trackingLookupSchema } from "@/lib/schemas/tracking";
import { lookupOrder, type TrackingState } from "@/lib/actions/tracking";
import { OrderTrackingView } from "@/components/order-tracking-view";

/**
 * Halaman lacak pesanan (Sprint 5 bagian 4).
 *
 * Formulir kecil, lalu hasilnya tampil di bawahnya. Bukan halaman terpisah
 * yang harus dibuka lagi, supaya pembeli yang salah ketik kodenya tidak
 * kehilangan semua yang sudah diketik.
 */
export function TrackingLookup() {
  const [state, setState] = useState<TrackingState>({});

  return (
    <div className="grid gap-8">
      <ZodForm
        schema={trackingLookupSchema}
        action={lookupOrder as (
          s: TrackingState,
          f: FormData,
        ) => Promise<TrackingState>}
        defaultValues={{ orderCode: "", phone: "" }}
        submitLabel="Lihat pesanan"
        onSuccess={(result) => {
          /*
           * `ZodForm` memberi `onSuccess` tipe `FormState` yang sama untuk
           * semua form, jadi field khusus seperti `order` tidak ada di
           * tipenya. Cast di sini aman karena `lookupOrder` memang sudah
           * mengembalikan `TrackingState` — dan dicek sungguhan dengan `if`,
           * bukan diasumsikan.
           */
          const found = (result as TrackingState).order;
          if (found) setState({ order: found });
        }}
      >
        {(ctx) => (
          <>
            <TextField
              ctx={ctx}
              label="Kode pesanan"
              name="orderCode"
              required
              placeholder="ORD-XXXXXX"
              hint="Kode yang dikirim saat pemesanan, contoh ORD-4F2K9A."
              autoCapitalize="characters"
            />
            <TextField
              ctx={ctx}
              label="Nomor WhatsApp"
              name="phone"
              type="tel"
              inputMode="tel"
              required
              hint="Nomor yang dipakai saat memesan. Keduanya harus cocok."
            />
          </>
        )}
      </ZodForm>

      {/*
        Error ditampilkan di dalam ZodForm lewat state-nya sendiri, jadi
        blok ini hanya untuk hasil yang BERHASIL. `ZodForm` memanggil
        `onSuccess` hanya kalau `error` kosong — itu yang membuat kode yang salah
        tidak pernah menampilkan hasil.
      */}
      {state.order ? <OrderTrackingView order={state.order} /> : null}
    </div>
  );
}

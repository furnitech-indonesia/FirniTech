"use client";

import { useActionState, useState } from "react";

import { Alert, SubmitButton } from "@/components/ui";
import { PaymentBreakdown } from "@/components/payment-breakdown";
import { createCustomOrder, type OrderFormState } from "@/lib/actions/orders";
import { PLATFORM_FEE_RATE } from "@/lib/plans";

/**
 * Custom Order Builder (ROADMAP Sprint 3).
 *
 * Form ini interaktif karena menampilkan pratinjau sisa tagihan. Nilai yang
 * dikirim ke server tetap apa yang ada di form; server menghitung ulang sendiri
 * dan mengabaikan angka pratinjau.
 */
export function CustomOrderForm() {
  const [state, formAction, pending] = useActionState<OrderFormState, FormData>(
    createCustomOrder,
    {},
  );

  const [itemPrice, setItemPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [shippingFee, setShippingFee] = useState(0);
  const [dpAmount, setDpAmount] = useState(0);

  return (
    <form action={formAction} className="grid gap-4">
      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-slate-900">
          Data pelanggan
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Nama pelanggan" name="customerName" required />
          <TextInput label="No. HP / WhatsApp" name="customerPhone" required />
        </div>
        <TextInput label="Alamat lengkap" name="customerAddress" required />
        <TextInput
          label="Kota / Kabupaten tujuan"
          name="destinationCity"
          required
          hint="Dipakai untuk mencari tarif ongkir di shipping_rates."
        />
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-slate-900">
          Spesifikasi pesanan kustom
        </legend>
        <TextInput
          label="Nama mebel"
          name="itemName"
          required
          placeholder="Meja makan jati custom 200 cm"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Panjang (cm)" name="lengthCm" type="number" />
          <TextInput label="Lebar (cm)" name="widthCm" type="number" />
          <TextInput label="Tinggi (cm)" name="heightCm" type="number" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Jenis kayu" name="woodType" placeholder="Kayu Jati" />
          <TextInput
            label="Finishing"
            name="finishingType"
            placeholder="Natural Matte"
          />
        </div>
        <TextInput label="Catatan spesifikasi" name="specNotes" />

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            label="Harga satuan (Rp)"
            name="price"
            required
            min={0}
            onChange={setItemPrice}
          />
          <NumberInput
            label="Jumlah"
            name="quantity"
            required
            min={1}
            value={quantity}
            onChange={setQuantity}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-slate-900">
          Biaya &amp; DP
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            label="Ongkir kargo (Rp)"
            name="shippingFee"
            min={0}
            onChange={setShippingFee}
          />
          <NumberInput
            label="DP yang diterima (Rp)"
            name="dpAmount"
            min={0}
            onChange={setDpAmount}
          />
        </div>

        <PaymentBreakdown
          itemPrice={itemPrice}
          quantity={quantity}
          shippingFee={shippingFee}
          dpAmount={dpAmount}
          platformFeeRate={PLATFORM_FEE_RATE}
        />

        <TextInput label="Catatan internal" name="notes" />
      </fieldset>

      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.message ? <Alert tone="success">{state.message}</Alert> : null}

      <SubmitButton pending={pending}>Simpan pesanan kustom</SubmitButton>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  type?: string;
  min?: number;
  value?: number;
  onChange?: (value: number) => void;
};

function TextInput({
  label,
  name,
  required,
  placeholder,
  hint,
  type = "text",
}: FieldProps) {
  return (
    <div className="grid gap-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-900 outline-none focus:border-amber-600 focus:bg-white"
      />
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function NumberInput({
  label,
  name,
  required,
  placeholder,
  min = 0,
  value,
  onChange,
}: FieldProps) {
  return (
    <div className="grid gap-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        min={min}
        step="1"
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange?.(Number.isFinite(next) ? next : 0);
        }}
        className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-900 outline-none focus:border-amber-600 focus:bg-white"
      />
    </div>
  );
}

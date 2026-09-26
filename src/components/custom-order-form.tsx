"use client";

import { ZodForm } from "@/components/zod-form";
import { FormSection, TextAreaField, TextField } from "@/components/rhf-fields";
import { PaymentBreakdown } from "@/components/payment-breakdown";
import { customOrderSchema } from "@/lib/schemas/order";
import { createCustomOrder } from "@/lib/actions/orders";
import { PLATFORM_FEE_RATE } from "@/lib/plans";

/**
 * Custom Order Builder (ROADMAP Sprint 3).
 *
 * Ringkasan biaya di bawah reacting dari nilai form. Angka itu HANYA untuk
 * tampilan — server menghitung ulang sendiri (lihat createCustomOrder), jadi
 * angka yang tampil tidak pernah dipercaya begitu saja.
 */
export function CustomOrderForm() {
  return (
    <ZodForm
      schema={customOrderSchema}
      action={createCustomOrder}
      submitLabel="Simpan pesanan kustom"
      defaultValues={{
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        destinationCity: "",
        itemName: "",
        price: "",
        quantity: "1",
        shippingFee: "",
        dpAmount: "",
        lengthCm: "",
        widthCm: "",
        heightCm: "",
        woodType: "",
        finishingType: "",
        specNotes: "",
        notes: "",
      }}
    >
      {(ctx) => {
        const toNumber = (name: string, fallback: number) => {
          const raw = ctx.watch(name);
          if (typeof raw !== "string" || !/[0-9]/.test(raw)) return fallback;
          return Number(raw.replace(/[^0-9.]/g, ""));
        };

        return (
          <>
            <FormSection title="Data pelanggan">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  ctx={ctx}
                  label="Nama pelanggan"
                  name="customerName"
                  required
                />
                <TextField
                  ctx={ctx}
                  label="No. HP / WhatsApp"
                  name="customerPhone"
                  type="tel"
                  required
                />
              </div>
              <TextField
                ctx={ctx}
                label="Alamat lengkap"
                name="customerAddress"
                required
              />
              <TextField
                ctx={ctx}
                label="Kota / Kabupaten tujuan"
                name="destinationCity"
                required
                hint="Dipakai untuk mencari tarif ongkir di shipping_rates."
              />
            </FormSection>

            <FormSection title="Spesifikasi pesanan kustom">
              <TextField
                ctx={ctx}
                label="Nama mebel"
                name="itemName"
                required
                placeholder="Meja makan jati custom 200 cm"
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  ctx={ctx}
                  label="Panjang (cm)"
                  name="lengthCm"
                  type="number"
                  min="1"
                />
                <TextField
                  ctx={ctx}
                  label="Lebar (cm)"
                  name="widthCm"
                  type="number"
                  min="1"
                />
                <TextField
                  ctx={ctx}
                  label="Tinggi (cm)"
                  name="heightCm"
                  type="number"
                  min="1"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField ctx={ctx} label="Jenis kayu" name="woodType" />
                <TextField ctx={ctx} label="Finishing" name="finishingType" />
              </div>
              <TextAreaField
                ctx={ctx}
                label="Catatan spesifikasi"
                name="specNotes"
                rows={2}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  ctx={ctx}
                  label="Harga satuan (Rp)"
                  name="price"
                  required
                  placeholder="9500000"
                  hint="Rupiah penuh, tanpa pemisah ribuan."
                />
                <TextField
                  ctx={ctx}
                  label="Jumlah"
                  name="quantity"
                  type="number"
                  min="1"
                  required
                />
              </div>
            </FormSection>

            <FormSection title="Biaya & DP">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  ctx={ctx}
                  label="Ongkir kargo (Rp)"
                  name="shippingFee"
                  placeholder="450000"
                />
                <TextField
                  ctx={ctx}
                  label="DP yang diterima (Rp)"
                  name="dpAmount"
                  placeholder="4000000"
                />
              </div>

              <PaymentBreakdown
                itemPrice={toNumber("price", 0)}
                quantity={toNumber("quantity", 1)}
                shippingFee={toNumber("shippingFee", 0)}
                dpAmount={toNumber("dpAmount", 0)}
                platformFeeRate={PLATFORM_FEE_RATE}
              />

              <TextField ctx={ctx} label="Catatan internal" name="notes" />
            </FormSection>
          </>
        );
      }}
    </ZodForm>
  );
}

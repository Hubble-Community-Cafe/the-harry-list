import { useFormContext } from 'react-hook-form';
import { CreditCard } from 'lucide-react';
import { MAX_LENGTH } from '../../lib/fieldLimits';
import type { FormOptions, ReservationFormData } from '../../types/reservation';

interface PaymentStepProps {
  formOptions: FormOptions | null;
  optionsLoading: boolean;
}

/** Step 3 of the reservation form: who pays, and the invoice details. */
export function PaymentStep({ formOptions, optionsLoading }: PaymentStepProps) {
  const { register, watch, formState: { errors } } = useFormContext<ReservationFormData>();
  const watchPaymentOption = watch('paymentOption');
  const watchInvoiceType = watch('invoiceType');

  return (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-meteor-500/20">
              <CreditCard className="w-5 h-5 text-meteor-400" />
            </div>
            <div>
              <h2 className="text-xl font-title font-semibold text-white tracking-tight">Payment Information</h2>
              <p className="text-sm text-dark-400 font-light">How will you be paying?</p>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Payment Method *</label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { value: 'INDIVIDUAL', label: 'People pay individually', desc: 'Each guest pays for themselves' },
                { value: 'ONE_PERSON', label: 'One person pays at the end', desc: 'A single person settles the bill' },
                { value: 'INVOICE', label: 'Invoice (>50 euros only)', desc: 'Receive an invoice after the event' },
              ].map((option) => {
                const selected = watchPaymentOption === option.value;
                return (
                  <label
                    key={option.value}
                    className={`
                      flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-[background-color,border-color,box-shadow,opacity] duration-200
                      ${selected
                        ? 'border-meteor-500 bg-meteor-500/10'
                        : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      {...register('paymentOption')}
                      value={option.value}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      selected ? 'border-meteor-500 bg-meteor-500' : 'border-dark-600 bg-dark-800'
                    }`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${selected ? 'text-meteor-300' : 'text-white'}`}>{option.label}</span>
                      <p className="text-xs text-dark-400 mt-0.5">{option.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.paymentOption && <p className="error-text">{errors.paymentOption.message}</p>}
          </div>

          {/* Invoice sub-type */}
          {watchPaymentOption === 'INVOICE' && (
            <div className="space-y-4 pl-4 border-l-2 border-meteor-500/30">
              <div className="form-group">
                <label htmlFor="invoiceType" className="label">Invoice Type *</label>
                <select {...register('invoiceType')} id="invoiceType" className="select-field" disabled={optionsLoading}>
                  <option value="">Select invoice type...</option>
                  {(formOptions?.invoiceTypes ?? [
                    { value: 'TUE', displayName: 'TU/e' },
                    { value: 'FONTYS', displayName: 'Fontys' },
                    { value: 'EXTERNAL', displayName: 'External' },
                  ]).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.displayName}</option>
                  ))}
                </select>
                {errors.invoiceType && <p className="error-text">{errors.invoiceType.message}</p>}
              </div>

              {/* TUE/FONTYS: Kostenplaats */}
              {(watchInvoiceType === 'TUE' || watchInvoiceType === 'FONTYS') && (
                <div className="form-group">
                  <label htmlFor="costCenter" className="label">Kostenplaats *</label>
                  <input
                    type="text"
                    {...register('costCenter')} maxLength={MAX_LENGTH.costCenter} id="costCenter"
                    className="input-field"
                    placeholder="e.g., CC-12345"
                  />
                  {errors.costCenter && <p className="error-text">{errors.costCenter.message}</p>}
                </div>
              )}

              {/* EXTERNAL: Company name, address, remarks */}
              {watchInvoiceType === 'EXTERNAL' && (
                <div className="space-y-4">
                  <div className="form-group">
                    <label htmlFor="invoiceName" className="label">Company Name *</label>
                    <input
                      type="text"
                      {...register('invoiceName')} maxLength={MAX_LENGTH.invoiceName} id="invoiceName"
                      className="input-field"
                      placeholder="Company or organization name"
                    />
                    {errors.invoiceName && <p className="error-text">{errors.invoiceName.message}</p>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="invoiceAddress" className="label">Invoice Address *</label>
                    <textarea
                      {...register('invoiceAddress')} maxLength={MAX_LENGTH.invoiceAddress} id="invoiceAddress"
                      className="input-field min-h-[80px] resize-none"
                      placeholder="Full billing address..."
                    />
                    {errors.invoiceAddress && <p className="error-text">{errors.invoiceAddress.message}</p>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="invoiceRemarks" className="label">Invoice Remarks</label>
                    <textarea
                      {...register('invoiceRemarks')} maxLength={MAX_LENGTH.invoiceRemarks} id="invoiceRemarks"
                      className="input-field min-h-[60px] resize-none"
                      placeholder="Any additional remarks for the invoice..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
  );
}

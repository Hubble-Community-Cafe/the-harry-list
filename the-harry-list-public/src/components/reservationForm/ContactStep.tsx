import { useFormContext } from 'react-hook-form';
import { fieldA11y } from './fieldA11y';
import { FieldError } from './FieldError';
import { User, Mail, Phone, Building2 } from 'lucide-react';
import { MAX_LENGTH } from '../../lib/fieldLimits';
import type { ReservationFormData } from '../../types/reservation';

/** Step 1 of the reservation form: how to reach the guest. */
export function ContactStep() {
  const { register, formState: { errors } } = useFormContext<ReservationFormData>();

  return (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-hubble-500/20">
              <User className="w-5 h-5 text-hubble-400" />
            </div>
            <div>
              <h2 tabIndex={-1} className="text-xl font-title font-semibold text-white tracking-tight outline-none">Contact Information</h2>
              <p className="text-sm text-dark-400 font-light">Tell us how to reach you</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label htmlFor="contactName" className="label">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 z-10 pointer-events-none" />
                <input
                  type="text"
                  {...register('contactName')} maxLength={MAX_LENGTH.contactName} id="contactName" autoComplete="name"
                  data-testid="contact-name"
                  className="input-field pl-10"
                  placeholder="John Doe"
                  {...fieldA11y(errors, 'contactName')}
                />
              </div>
              <FieldError errors={errors} name="contactName" />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="label">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 z-10 pointer-events-none" />
                <input
                  type="email"
                  {...register('email')} maxLength={MAX_LENGTH.email} id="email" autoComplete="email"
                  data-testid="contact-email"
                  className="input-field pl-10"
                  placeholder="john@example.com"
                  {...fieldA11y(errors, 'email')}
                />
              </div>
              <FieldError errors={errors} name="email" />
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber" className="label">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 z-10 pointer-events-none" />
                <input
                  type="tel"
                  {...register('phoneNumber')} maxLength={MAX_LENGTH.phoneNumber} id="phoneNumber" autoComplete="tel"
                  className="input-field pl-10"
                  placeholder="+31 6 12345678"
                  {...fieldA11y(errors, 'phoneNumber')}
                />
              </div>
              <FieldError errors={errors} name="phoneNumber" />
            </div>

            <div className="form-group">
              <label htmlFor="organizationName" className="label">Organization / Association</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 z-10 pointer-events-none" />
                <input
                  type="text"
                  {...register('organizationName')} maxLength={MAX_LENGTH.organizationName} id="organizationName" autoComplete="organization"
                  className="input-field pl-10"
                  placeholder="Your organization name"
                />
              </div>
            </div>
          </div>
        </div>
  );
}

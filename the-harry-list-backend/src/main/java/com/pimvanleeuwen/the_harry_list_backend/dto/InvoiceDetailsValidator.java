package com.pimvanleeuwen.the_harry_list_backend.dto;

import com.pimvanleeuwen.the_harry_list_backend.model.InvoiceType;
import com.pimvanleeuwen.the_harry_list_backend.model.PaymentOption;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/** Checks {@link ValidInvoiceDetails}; the messages match the public form's. */
public class InvoiceDetailsValidator implements ConstraintValidator<ValidInvoiceDetails, PublicReservationRequest> {

    @Override
    public boolean isValid(PublicReservationRequest request, ConstraintValidatorContext context) {
        if (request == null || request.getPaymentOption() != PaymentOption.INVOICE) {
            return true;
        }
        context.disableDefaultConstraintViolation();
        InvoiceType type = request.getInvoiceType();
        if (type == null) {
            return reject(context, "invoiceType", "Please select an invoice type");
        }
        boolean valid = true;
        if ((type == InvoiceType.TUE || type == InvoiceType.FONTYS) && isBlank(request.getCostCenter())) {
            valid = reject(context, "costCenter", "Kostenplaats is required");
        }
        if (type == InvoiceType.EXTERNAL) {
            if (isBlank(request.getInvoiceName())) {
                valid = reject(context, "invoiceName", "Company name is required");
            }
            if (isBlank(request.getInvoiceAddress())) {
                valid = reject(context, "invoiceAddress", "Address is required");
            }
        }
        return valid;
    }

    private static boolean reject(ConstraintValidatorContext context, String field, String message) {
        context.buildConstraintViolationWithTemplate(message).addPropertyNode(field).addConstraintViolation();
        return false;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}

package com.pimvanleeuwen.the_harry_list_backend.dto;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Invoice payment needs the details to send the invoice: an invoice type, a cost centre for TU/e and
 * Fontys, and a company name and address for external parties. The same rules as the public form, so
 * a direct API call cannot skip them. Each missing detail is reported on its own field.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = InvoiceDetailsValidator.class)
public @interface ValidInvoiceDetails {
    String message() default "Invoice details are incomplete";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}

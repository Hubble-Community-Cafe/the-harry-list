package com.pimvanleeuwen.the_harry_list_backend.dto;

import com.pimvanleeuwen.the_harry_list_backend.model.InvoiceType;
import com.pimvanleeuwen.the_harry_list_backend.model.PaymentOption;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Every missing invoice detail is reported on its own field, with the public form's message. */
class InvoiceDetailsValidatorTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private Map<String, String> invoiceErrors(PaymentOption payment, InvoiceType type, String costCenter,
                                              String name, String address) {
        PublicReservationRequest request = PublicReservationRequest.builder()
                .paymentOption(payment).invoiceType(type).costCenter(costCenter)
                .invoiceName(name).invoiceAddress(address).build();
        return validator.validate(request).stream()
                .filter(v -> v.getPropertyPath().toString().matches("invoice.*|costCenter"))
                .collect(Collectors.toMap(v -> v.getPropertyPath().toString(), ConstraintViolation::getMessage));
    }

    @Test
    void nonInvoicePaymentNeedsNoInvoiceDetails() {
        assertTrue(invoiceErrors(PaymentOption.INDIVIDUAL, null, null, null, null).isEmpty());
        assertTrue(invoiceErrors(PaymentOption.ONE_PERSON, null, null, null, null).isEmpty());
    }

    @Test
    void invoiceNeedsAType() {
        assertEquals(Map.of("invoiceType", "Please select an invoice type"),
                invoiceErrors(PaymentOption.INVOICE, null, null, null, null));
    }

    @Test
    void tueAndFontysNeedACostCenter() {
        assertEquals(Map.of("costCenter", "Kostenplaats is required"),
                invoiceErrors(PaymentOption.INVOICE, InvoiceType.TUE, " ", null, null));
        assertEquals(Map.of("costCenter", "Kostenplaats is required"),
                invoiceErrors(PaymentOption.INVOICE, InvoiceType.FONTYS, null, null, null));
        assertTrue(invoiceErrors(PaymentOption.INVOICE, InvoiceType.TUE, "12345", null, null).isEmpty());
    }

    @Test
    void externalNeedsCompanyNameAndAddress_reportedSeparately() {
        assertEquals(Map.of("invoiceName", "Company name is required", "invoiceAddress", "Address is required"),
                invoiceErrors(PaymentOption.INVOICE, InvoiceType.EXTERNAL, null, null, null));
        assertTrue(invoiceErrors(PaymentOption.INVOICE, InvoiceType.EXTERNAL, null, "Acme B.V.", "Street 1").isEmpty());
    }
}

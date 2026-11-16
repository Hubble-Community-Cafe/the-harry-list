package com.pimvanleeuwen.the_harry_list_backend.exception;

/**
 * The requested record does not exist. Answered as a 404 problem response by
 * {@link com.pimvanleeuwen.the_harry_list_backend.controller.GlobalExceptionHandler}.
 */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }

    /** For example {@code NotFoundException.of("Reservation", 42)} gives "Reservation 42 not found". */
    public static NotFoundException of(String what, Object id) {
        return new NotFoundException(what + " " + id + " not found");
    }
}

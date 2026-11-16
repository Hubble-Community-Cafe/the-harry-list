package com.pimvanleeuwen.the_harry_list_backend.exception;

/**
 * A request that is well-formed but breaks a business rule (a form constraint, a status
 * transition that is not allowed, a file that is too large). Answered as a 400 problem
 * response whose detail is the message, so the message must be safe and readable for staff
 * and guests. Expected, so it is not sent to Sentry.
 */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}

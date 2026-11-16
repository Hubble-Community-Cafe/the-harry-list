package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.exception.BusinessRuleException;
import com.pimvanleeuwen.the_harry_list_backend.exception.NotFoundException;
import io.sentry.Sentry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.List;
import java.util.Map;

/**
 * Every error the API returns has one shape: an RFC 9457 problem response
 * ({@code application/problem+json}) with {@code title}, {@code status} and a readable
 * {@code detail}. Validation failures add an {@code errors} list of {@code {field, message}}.
 * The Spring MVC errors (unsupported method, unreadable body, missing parameter, unknown path)
 * come from {@link ResponseEntityExceptionHandler} in the same shape. Only unexpected errors are
 * sent to Sentry.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Validation failures (400): detail is the first field error, all of them are listed. */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                  HttpHeaders headers, HttpStatusCode status,
                                                                  WebRequest request) {
        List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> Map.of("field", e.getField(),
                        "message", e.getDefaultMessage() != null ? e.getDefaultMessage() : "is invalid"))
                .toList();
        String detail = errors.stream()
                .findFirst()
                .map(e -> e.get("field") + ": " + e.get("message"))
                .orElse("Validation failed");
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, detail);
        problem.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(problem);
    }

    /** Bad path or query value (for example an unknown enum value): 400. */
    @Override
    protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException ex, HttpHeaders headers,
                                                        HttpStatusCode status, WebRequest request) {
        return ResponseEntity.badRequest().body(problem(HttpStatus.BAD_REQUEST, "Invalid value: " + ex.getValue()));
    }

    /** Business rule / constraint violations (400). */
    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ProblemDetail> handleBusinessRule(BusinessRuleException ex) {
        return ResponseEntity.badRequest().body(problem(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    /**
     * Older code paths still signal rule violations with IllegalArgumentException (400). New code
     * throws {@link BusinessRuleException} instead.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ProblemDetail> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(problem(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    /** Unknown record (404). */
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem(HttpStatus.NOT_FOUND, ex.getMessage()));
    }

    /** Insufficient role (403). */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(problem(HttpStatus.FORBIDDEN, "You do not have permission to perform this action"));
    }

    /** Anything unexpected: 500 with a generic detail, captured by Sentry. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        Sentry.captureException(ex);
        return ResponseEntity.internalServerError()
                .body(problem(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred"));
    }

    /** Problem response with the standard title for the status and the given detail. */
    public static ProblemDetail problem(HttpStatus status, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(status.getReasonPhrase());
        return problem;
    }
}

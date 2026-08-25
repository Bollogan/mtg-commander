package com.mtg.deckbuilder.forum.web;

import java.time.Instant;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Turns forum-service failures into a stable JSON body so the UI can tell the author *why* a
 * post/comment/forum was not published instead of falling back to "something went wrong".
 *
 * <p>Without this, {@code @ResponseStatus} exceptions answer with Spring's default error body,
 * which omits {@code message} unless {@code server.error.include-message} is enabled — so a
 * moderation rejection reached the browser as a bare status with no reason attached.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    /**
     * @param code    machine-readable reason the client switches on
     * @param message human-readable detail, safe to show to the author
     */
    public record ApiError(int status, String code, String message, Instant timestamp) {
        static ApiError of(HttpStatus status, String code, String message) {
            return new ApiError(status.value(), code, message, Instant.now());
        }
    }

    @ExceptionHandler(ModerationRejectedException.class)
    public ResponseEntity<ApiError> moderationRejected(ModerationRejectedException e) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ApiError.of(HttpStatus.UNPROCESSABLE_ENTITY, "MODERATION_REJECTED", e.getMessage()));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiError> notFound(NotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiError.of(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiError> forbidden(ForbiddenException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiError.of(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage()));
    }

    /** Empty title/body, or one over the length cap. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> invalid(MethodArgumentNotValidException e) {
        String detail = e.getBindingResult().getFieldErrors().stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest()
            .body(ApiError.of(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED",
                detail.isBlank() ? "Invalid request." : detail));
    }

    /**
     * The gateway injects {@code X-User-Id} from a verified JWT, so a missing one means the call
     * arrived unauthenticated. Answering 401 (rather than the default 400) lets the client's
     * token-refresh interceptor retry instead of showing a dead-end error.
     */
    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ApiError> missingHeader(MissingRequestHeaderException e) {
        if ("X-User-Id".equalsIgnoreCase(e.getHeaderName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Sign in to continue."));
        }
        return ResponseEntity.badRequest()
            .body(ApiError.of(HttpStatus.BAD_REQUEST, "MISSING_HEADER", e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> illegalArgument(IllegalArgumentException e) {
        return ResponseEntity.badRequest()
            .body(ApiError.of(HttpStatus.BAD_REQUEST, "BAD_REQUEST", e.getMessage()));
    }

    /**
     * Last resort: log the cause server-side, tell the client only that it can retry. Spring's
     * own web exceptions ({@link ErrorResponse}: unknown route, wrong method, unreadable body)
     * already carry the right status, so they are rethrown for the default handling rather than
     * being flattened into a 500.
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiError> unexpected(RuntimeException e) {
        if (e instanceof ErrorResponse) {
            throw e;
        }
        log.error("Unhandled forum-service error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiError.of(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "Something went wrong on our side. Please try again."));
    }
}

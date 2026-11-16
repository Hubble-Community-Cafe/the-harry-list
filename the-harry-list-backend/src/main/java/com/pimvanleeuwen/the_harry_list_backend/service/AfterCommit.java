package com.pimvanleeuwen.the_harry_list_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Runs side effects (emails, analytics lines, audit entries) only once the current transaction
 * has committed, so a change that rolls back never sends an email or logs an event that did
 * not happen. Outside a transaction the action runs at once.
 *
 * <p>A failing action is logged and swallowed: by then the change is saved, and a failed
 * email or audit write must not turn a successful request into an error.
 */
public final class AfterCommit {

    private static final Logger log = LoggerFactory.getLogger(AfterCommit.class);

    private AfterCommit() {
    }

    public static void run(Runnable action) {
        Runnable safe = () -> {
            try {
                action.run();
            } catch (RuntimeException e) {
                log.error("After-commit action failed; the change itself was saved", e);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    safe.run();
                }
            });
        } else {
            safe.run();
        }
    }
}

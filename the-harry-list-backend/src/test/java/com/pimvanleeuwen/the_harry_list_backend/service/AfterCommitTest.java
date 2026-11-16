package com.pimvanleeuwen.the_harry_list_backend.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronizationUtils;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;

class AfterCommitTest {

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void runsAtOnceOutsideATransaction() {
        AtomicInteger runs = new AtomicInteger();

        AfterCommit.run(runs::incrementAndGet);

        assertEquals(1, runs.get());
    }

    @Test
    void waitsForTheCommit() {
        AtomicInteger runs = new AtomicInteger();
        TransactionSynchronizationManager.initSynchronization();

        AfterCommit.run(runs::incrementAndGet);
        assertEquals(0, runs.get());

        TransactionSynchronizationUtils.triggerAfterCommit();
        assertEquals(1, runs.get());
    }

    @Test
    void neverRunsWhenTheTransactionRollsBack() {
        AtomicInteger runs = new AtomicInteger();
        TransactionSynchronizationManager.initSynchronization();

        AfterCommit.run(runs::incrementAndGet);
        TransactionSynchronizationUtils.invokeAfterCompletion(
                TransactionSynchronizationManager.getSynchronizations(), TransactionSynchronization.STATUS_ROLLED_BACK);

        assertEquals(0, runs.get());
    }

    @Test
    void aFailingActionDoesNotFailTheCaller() {
        assertDoesNotThrow(() -> AfterCommit.run(() -> {
            throw new IllegalStateException("mail server down");
        }));
    }
}

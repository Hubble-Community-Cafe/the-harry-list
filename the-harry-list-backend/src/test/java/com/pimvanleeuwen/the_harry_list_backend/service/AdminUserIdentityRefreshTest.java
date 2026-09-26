package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.AdminRole;
import com.pimvanleeuwen.the_harry_list_backend.model.AdminUser;
import com.pimvanleeuwen.the_harry_list_backend.repository.AdminUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.CannotAcquireLockException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The identity refresh that runs in the role filter on every staff request.
 *
 * <p>It mirrors the token's email and display name onto the stored row, and must never be able to
 * fail the request. When a name changes in Entra, the next burst of concurrent requests all race
 * to write the same new values, and MariaDB 11.6+ (innodb_snapshot_isolation on by default) turns
 * that into an error rather than serialising it.
 */
class AdminUserIdentityRefreshTest {

    private AdminUserRepository repository;
    private AdminUserService service;
    private AdminUser stored;

    @BeforeEach
    void setUp() {
        repository = mock(AdminUserRepository.class);
        service = new AdminUserService(repository, mock(AuditService.class), "");

        stored = new AdminUser();
        stored.setId(1L);
        stored.setAzureOid("oid-1");
        stored.setEmail("old@hubble.cafe");
        stored.setDisplayName("Old Name");
        stored.setRole(AdminRole.EDITOR);
        when(repository.findByAzureOid("oid-1")).thenReturn(Optional.of(stored));
    }

    @Test
    void unchangedClaims_writeNothing() {
        service.getOrCreateUser("oid-1", "old@hubble.cafe", "Old Name");

        verify(repository, never()).updateIdentity(anyLong(), any(), any(), any());
        verify(repository, never()).save(any());
    }

    @Test
    void changedClaims_updateInOneStatement() {
        service.getOrCreateUser("oid-1", "new@hubble.cafe", "New Name");

        verify(repository).updateIdentity(eq(1L), eq("new@hubble.cafe"), eq("New Name"), any(LocalDateTime.class));
        // Never a managed-entity save: a failed flush would linger dirty in the open-in-view
        // persistence context and fail again later in the same request.
        verify(repository, never()).save(any());
    }

    @Test
    void aMissingClaim_keepsTheStoredValue() {
        service.getOrCreateUser("oid-1", "new@hubble.cafe", null);

        verify(repository).updateIdentity(eq(1L), eq("new@hubble.cafe"), eq("Old Name"), any(LocalDateTime.class));
    }

    @Test
    void losingTheWriteRace_doesNotFailTheRequest() {
        when(repository.updateIdentity(anyLong(), any(), any(), any()))
                .thenThrow(new CannotAcquireLockException("Record has changed since last read in table 'admin_user'"));

        AdminUser user = assertThatCodeReturns(() -> service.getOrCreateUser("oid-1", "new@hubble.cafe", "New Name"));

        // The request still gets a usable user, so authorization proceeds normally.
        assertThat(user).isNotNull();
        assertThat(user.getRole()).isEqualTo(AdminRole.EDITOR);
    }

    @Test
    void winningTheWriteRace_returnsTheFreshValues() {
        AdminUser user = service.getOrCreateUser("oid-1", "new@hubble.cafe", "New Name");

        assertThat(user.getEmail()).isEqualTo("new@hubble.cafe");
        assertThat(user.getDisplayName()).isEqualTo("New Name");
    }

    private AdminUser assertThatCodeReturns(ThrowingSupplier supplier) {
        assertThatCode(supplier::get).doesNotThrowAnyException();
        return supplier.get();
    }

    @FunctionalInterface
    private interface ThrowingSupplier {
        AdminUser get();
    }
}

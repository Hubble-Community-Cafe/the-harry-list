package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditAction;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditLog;
import com.pimvanleeuwen.the_harry_list_backend.repository.AuditLogRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    private AuditService auditService;

    @BeforeEach
    void setUp() {
        auditService = new AuditService(auditLogRepository);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void recordUpdate_shouldPersistWithResolvedActorAndSerializedChanges() {
        setJwtAuthentication("oid-123", "staff@example.com", "Staff Member");

        auditService.recordUpdate(AuditEntityType.RESERVATION, 7L, "ABC123 - Party",
                List.of(new FieldChange("contactName", "Old", "New")), "updated contact");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog saved = captor.getValue();

        assertEquals(AuditEntityType.RESERVATION, saved.getEntityType());
        assertEquals(7L, saved.getEntityId());
        assertEquals("ABC123 - Party", saved.getEntityLabel());
        assertEquals(AuditAction.UPDATE, saved.getAction());
        assertEquals("oid-123", saved.getActorOid());
        assertEquals("staff@example.com", saved.getActorEmail());
        assertEquals("Staff Member", saved.getActorName());
        assertEquals("updated contact", saved.getSummary());
        assertNotNull(saved.getChanges());
        assertTrue(saved.getChanges().contains("contactName"));
    }

    @Test
    void recordUpdate_shouldDoNothingWhenNoChanges() {
        setJwtAuthentication("oid-123", "staff@example.com", "Staff");

        auditService.recordUpdate(AuditEntityType.RESERVATION, 7L, "label", List.of(), "noop");

        verify(auditLogRepository, never()).save(any());
    }

    @Test
    void recordDelete_shouldPersistDeleteWithoutChangesJson() {
        setJwtAuthentication("oid-123", "staff@example.com", "Staff");

        auditService.recordDelete(AuditEntityType.RESERVATION, 7L, "ABC123", "deleted");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertEquals(AuditAction.DELETE, captor.getValue().getAction());
        assertNull(captor.getValue().getChanges());
    }

    @Test
    void record_shouldFallBackToNonJwtAuthenticationName() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("mockuser", "n/a",
                        AuthorityUtils.createAuthorityList("ROLE_EDITOR")));

        auditService.recordCreate(AuditEntityType.RESERVATION, 1L, "label", List.of(), "created");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertEquals("mockuser", captor.getValue().getActorName());
        assertNull(captor.getValue().getActorOid());
    }

    @Test
    void record_shouldUseSystemActorWhenUnauthenticated() {
        auditService.recordDelete(AuditEntityType.RESERVATION, 1L, "label", "deleted");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertEquals("system", captor.getValue().getActorName());
    }

    @Test
    void record_shouldSwallowRepositoryExceptions() {
        setJwtAuthentication("oid-123", "staff@example.com", "Staff");
        when(auditLogRepository.save(any())).thenThrow(new RuntimeException("db down"));

        // Must not propagate — auditing can never break the underlying operation.
        assertDoesNotThrow(() -> auditService.recordDelete(
                AuditEntityType.RESERVATION, 1L, "label", "deleted"));
    }

    private void setJwtAuthentication(String oid, String email, String name) {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("oid", oid)
                .claim("preferred_username", email)
                .claim("name", name)
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new JwtAuthenticationToken(jwt, AuthorityUtils.createAuthorityList("ROLE_EDITOR")));
    }
}

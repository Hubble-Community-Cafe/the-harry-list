package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.AdminRole;
import com.pimvanleeuwen.the_harry_list_backend.model.AdminUser;
import com.pimvanleeuwen.the_harry_list_backend.repository.AdminUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private AdminUserRepository adminUserRepository;

    private AdminUserService service;

    private static final String ADMIN_OID = "d7795f0e-32fd-4618-b5da-bf2c0079dd4a";
    private static final String OTHER_OID = "2afebecd-9543-4525-8ee5-c12ec15d7a2b";

    @BeforeEach
    void setUp() {
        service = new AdminUserService(adminUserRepository, ADMIN_OID);
    }

    @Test
    void getOrCreateUser_shouldReturnExistingUser() {
        AdminUser existing = createUser(1L, OTHER_OID, "josselyn@hubble.cafe", "Josselyn", AdminRole.EDITOR);
        when(adminUserRepository.findByAzureOid(OTHER_OID)).thenReturn(Optional.of(existing));

        AdminUser result = service.getOrCreateUser(OTHER_OID, "josselyn@hubble.cafe", "Josselyn");

        assertEquals(existing, result);
        verify(adminUserRepository, never()).save(any());
    }

    @Test
    void getOrCreateUser_shouldCreateViewerForNewUser() {
        when(adminUserRepository.findByAzureOid(OTHER_OID)).thenReturn(Optional.empty());
        when(adminUserRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        AdminUser result = service.getOrCreateUser(OTHER_OID, "josselyn@hubble.cafe", "Josselyn");

        assertEquals(AdminRole.VIEWER, result.getRole());
        assertEquals("josselyn@hubble.cafe", result.getEmail());
        assertEquals("Josselyn", result.getDisplayName());
    }

    @Test
    void getOrCreateUser_shouldCreateAdminForInitialAdminOid() {
        when(adminUserRepository.findByAzureOid(ADMIN_OID)).thenReturn(Optional.empty());
        when(adminUserRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        AdminUser result = service.getOrCreateUser(ADMIN_OID, "pim@hubble.cafe", "Pim");

        assertEquals(AdminRole.ADMIN, result.getRole());
    }

    @Test
    void getOrCreateUser_shouldUpdateEmailIfChanged() {
        AdminUser existing = createUser(1L, OTHER_OID, "old@hubble.cafe", "Josselyn", AdminRole.EDITOR);
        when(adminUserRepository.findByAzureOid(OTHER_OID)).thenReturn(Optional.of(existing));
        when(adminUserRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.getOrCreateUser(OTHER_OID, "new@hubble.cafe", "Josselyn");

        assertEquals("new@hubble.cafe", existing.getEmail());
        verify(adminUserRepository).save(existing);
    }

    @Test
    void getCurrentUser_shouldReturnNullWhenNotFound() {
        when(adminUserRepository.findByAzureOid("unknown")).thenReturn(Optional.empty());

        assertNull(service.getCurrentUser("unknown"));
    }

    @Test
    void getAllUsers_shouldReturnAll() {
        AdminUser user1 = createUser(1L, ADMIN_OID, "pim@hubble.cafe", "Pim", AdminRole.ADMIN);
        AdminUser user2 = createUser(2L, OTHER_OID, "josselyn@hubble.cafe", "Josselyn", AdminRole.EDITOR);
        when(adminUserRepository.findAll()).thenReturn(List.of(user1, user2));

        List<AdminUser> result = service.getAllUsers();

        assertEquals(2, result.size());
    }

    @Test
    void updateRole_shouldUpdateTargetRole() {
        AdminUser target = createUser(2L, OTHER_OID, "josselyn@hubble.cafe", "Josselyn", AdminRole.VIEWER);
        when(adminUserRepository.findById(2L)).thenReturn(Optional.of(target));
        when(adminUserRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        AdminUser result = service.updateRole(2L, AdminRole.EDITOR, ADMIN_OID);

        assertEquals(AdminRole.EDITOR, result.getRole());
        verify(adminUserRepository).save(target);
    }

    @Test
    void updateRole_shouldThrowWhenChangingOwnRole() {
        AdminUser self = createUser(1L, ADMIN_OID, "pim@hubble.cafe", "Pim", AdminRole.ADMIN);
        when(adminUserRepository.findById(1L)).thenReturn(Optional.of(self));

        assertThrows(IllegalArgumentException.class, () ->
                service.updateRole(1L, AdminRole.VIEWER, ADMIN_OID));
    }

    @Test
    void updateRole_shouldThrowWhenUserNotFound() {
        when(adminUserRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
                service.updateRole(999L, AdminRole.EDITOR, ADMIN_OID));
    }

    @Test
    void getOrCreateUser_shouldCreateViewerWhenInitialAdminOidIsEmpty() {
        service = new AdminUserService(adminUserRepository, "");
        when(adminUserRepository.findByAzureOid(ADMIN_OID)).thenReturn(Optional.empty());
        when(adminUserRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        AdminUser result = service.getOrCreateUser(ADMIN_OID, "pim@hubble.cafe", "Pim");

        assertEquals(AdminRole.VIEWER, result.getRole());
    }

    private AdminUser createUser(Long id, String oid, String email, String name, AdminRole role) {
        AdminUser user = new AdminUser();
        user.setId(id);
        user.setAzureOid(oid);
        user.setEmail(email);
        user.setDisplayName(name);
        user.setRole(role);
        return user;
    }
}

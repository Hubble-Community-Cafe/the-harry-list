package com.pimvanleeuwen.the_harry_list_backend.repository;

import com.pimvanleeuwen.the_harry_list_backend.model.EmailAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmailAttachmentRepository extends JpaRepository<EmailAttachment, Long> {
    List<EmailAttachment> findByActiveTrue();
}

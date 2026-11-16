package com.pimvanleeuwen.the_harry_list_backend.repository;

import com.pimvanleeuwen.the_harry_list_backend.model.FormConstraint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FormConstraintRepository extends JpaRepository<FormConstraint, Long> {
    List<FormConstraint> findByEnabledTrue();
}

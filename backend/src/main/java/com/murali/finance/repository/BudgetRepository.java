package com.murali.finance.repository;

import com.murali.finance.model.Budget;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BudgetRepository extends JpaRepository<Budget, Long> {
    List<Budget> findByUserId(Long userId);
    Optional<Budget> findByUserIdAndCategory(Long userId, String category);
    Optional<Budget> findByIdAndUserId(Long id, Long userId);
}

package com.murali.finance.repository;

import com.murali.finance.model.Transaction;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserIdAndDateBetweenOrderByDateDescIdDesc(Long userId, LocalDate from, LocalDate to);
    Optional<Transaction> findByIdAndUserId(Long id, Long userId);
}

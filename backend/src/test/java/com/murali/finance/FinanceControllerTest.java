
package com.murali.finance;

import com.murali.finance.controller.FinanceController;
import com.murali.finance.model.Budget;
import com.murali.finance.model.Transaction;
import com.murali.finance.model.Transaction.Type;
import com.murali.finance.repository.BudgetRepository;
import com.murali.finance.repository.TransactionRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FinanceControllerTest {

    @Mock
    private TransactionRepository txRepo;

    @Mock
    private BudgetRepository budgetRepo;

    @InjectMocks
    private FinanceController controller;

    private final Long userId = 1L;

    private Transaction transaction(
            Type type, String amount, String category) {

        Transaction t = new Transaction();
        t.type = type;
        t.amount = new BigDecimal(amount);
        t.category = category;
        t.date = LocalDate.of(2026, 10, 5);
        return t;
    }

    @Test
    void createTransactionAssignsLoggedInUser() {
        Transaction t = transaction(Type.EXPENSE, "500", "Food");
        t.id = 99L;

        when(txRepo.save(any(Transaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Transaction result = controller.create(userId, t);

        assertNull(result.id);
        assertEquals(userId, result.userId);
        assertEquals(new BigDecimal("500"), result.amount);
        verify(txRepo).save(t);
    }

    @Test
    void listTransactionsUsesLoggedInUserAndMonth() {
        List<Transaction> expected = List.of(
                transaction(Type.EXPENSE, "500", "Food"));

        when(txRepo.findByUserIdAndDateBetweenOrderByDateDescIdDesc(
                eq(userId),
                eq(LocalDate.of(2026, 10, 1)),
                eq(LocalDate.of(2026, 10, 31))))
                .thenReturn(expected);

        List<Transaction> result =
                controller.list(userId, "2026-10");

        assertEquals(1, result.size());
        assertSame(expected, result);

        verify(txRepo)
                .findByUserIdAndDateBetweenOrderByDateDescIdDesc(
                        userId,
                        LocalDate.of(2026, 10, 1),
                        LocalDate.of(2026, 10, 31));
    }

    @Test
    void updateTransactionAssignsOwnerAndId() {
        Long transactionId = 10L;

        Transaction existing =
                transaction(Type.EXPENSE, "200", "Food");
        existing.id = transactionId;
        existing.userId = userId;

        Transaction changes =
                transaction(Type.EXPENSE, "300", "Food");

        when(txRepo.findByIdAndUserId(transactionId, userId))
                .thenReturn(Optional.of(existing));

        when(txRepo.save(any(Transaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Transaction result =
                controller.update(userId, transactionId, changes);

        assertEquals(transactionId, result.id);
        assertEquals(userId, result.userId);
        assertEquals(new BigDecimal("300"), result.amount);
        verify(txRepo).save(changes);
    }

    @Test
    void updateRejectsTransactionNotOwnedByUser() {
        when(txRepo.findByIdAndUserId(10L, userId))
                .thenReturn(Optional.empty());

        Transaction changes =
                transaction(Type.EXPENSE, "300", "Food");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.update(userId, 10L, changes));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        verify(txRepo, never()).save(any(Transaction.class));
    }

    @Test
    void deleteRejectsTransactionNotOwnedByUser() {
        when(txRepo.findByIdAndUserId(10L, userId))
                .thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.delete(userId, 10L));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        verify(txRepo, never()).delete(any(Transaction.class));
    }

    @Test
    void summaryCalculatesIncomeExpensesAndBalance() {
        List<Transaction> transactions = List.of(
                transaction(Type.INCOME, "10000", "Salary"),
                transaction(Type.EXPENSE, "2000", "Food"),
                transaction(Type.EXPENSE, "1000", "Rent"));

        when(txRepo.findByUserIdAndDateBetweenOrderByDateDescIdDesc(
                eq(userId), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(transactions);

        Map<String, Object> summary =
                controller.summary(userId, "2026-10");

        assertEquals(new BigDecimal("10000"), summary.get("income"));
        assertEquals(new BigDecimal("3000"), summary.get("expense"));
        assertEquals(new BigDecimal("7000"), summary.get("balance"));
        assertEquals(70.0, (Double) summary.get("savingsRate"));

        @SuppressWarnings("unchecked")
        Map<String, BigDecimal> categories =
                (Map<String, BigDecimal>) summary.get("byCategory");

        assertEquals(new BigDecimal("2000"), categories.get("Food"));
        assertEquals(new BigDecimal("1000"), categories.get("Rent"));
        assertFalse(categories.containsKey("Salary"));
    }

    @Test
    void saveBudgetAssignsLoggedInUser() {
        Budget budget = new Budget();
        budget.category = "Food";
        budget.limitAmount = new BigDecimal("5000");

        when(budgetRepo.findByUserIdAndCategory(userId, "Food"))
                .thenReturn(Optional.empty());

        when(budgetRepo.save(any(Budget.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Budget result = controller.saveBudget(userId, budget);

        assertEquals(userId, result.userId);
        assertEquals("Food", result.category);
        assertEquals(new BigDecimal("5000"), result.limitAmount);
        verify(budgetRepo).save(any(Budget.class));
    }
}

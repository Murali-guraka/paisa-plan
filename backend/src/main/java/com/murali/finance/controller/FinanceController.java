package com.murali.finance.controller;

import com.murali.finance.model.Budget;
import com.murali.finance.model.Transaction;
import com.murali.finance.model.Transaction.Type;
import com.murali.finance.repository.BudgetRepository;
import com.murali.finance.repository.TransactionRepository;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Every query is scoped to the logged-in user (uid comes from the JWT). */
@RestController
@RequestMapping("/api")
public class FinanceController {

    private final TransactionRepository txRepo;
    private final BudgetRepository budgetRepo;

    public FinanceController(TransactionRepository txRepo, BudgetRepository budgetRepo) {
        this.txRepo = txRepo;
        this.budgetRepo = budgetRepo;
    }

    private List<Transaction> forMonth(Long uid, String month) {
        YearMonth ym = YearMonth.parse(month); // format: 2026-10
        return txRepo.findByUserIdAndDateBetweenOrderByDateDescIdDesc(uid, ym.atDay(1), ym.atEndOfMonth());
    }

    private BigDecimal total(List<Transaction> list, Type type) {
        return list.stream().filter(t -> t.type == type)
                .map(t -> t.amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private <T> T found(Optional<T> o) {
        return o.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    // ---------- Transactions ----------
    @GetMapping("/transactions")
    public List<Transaction> list(@AuthenticationPrincipal Long uid, @RequestParam String month) {
        return forMonth(uid, month);
    }

    @PostMapping("/transactions") @ResponseStatus(HttpStatus.CREATED)
    public Transaction create(@AuthenticationPrincipal Long uid, @Valid @RequestBody Transaction t) {
        t.id = null;
        t.userId = uid;
        return txRepo.save(t);
    }

    @PutMapping("/transactions/{id}")
    public Transaction update(@AuthenticationPrincipal Long uid, @PathVariable Long id, @Valid @RequestBody Transaction t) {
        found(txRepo.findByIdAndUserId(id, uid));
        t.id = id;
        t.userId = uid;
        return txRepo.save(t);
    }

    @DeleteMapping("/transactions/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Long uid, @PathVariable Long id) {
        txRepo.delete(found(txRepo.findByIdAndUserId(id, uid)));
    }

    // ---------- Budgets (one monthly limit per category, per user) ----------
    @GetMapping("/budgets")
    public List<Budget> budgets(@AuthenticationPrincipal Long uid) { return budgetRepo.findByUserId(uid); }

    @PostMapping("/budgets")
    public Budget saveBudget(@AuthenticationPrincipal Long uid, @Valid @RequestBody Budget b) {
        Budget target = budgetRepo.findByUserIdAndCategory(uid, b.category).orElseGet(Budget::new);
        target.userId = uid;
        target.category = b.category;
        target.limitAmount = b.limitAmount;
        return budgetRepo.save(target);
    }

    @DeleteMapping("/budgets/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBudget(@AuthenticationPrincipal Long uid, @PathVariable Long id) {
        budgetRepo.delete(found(budgetRepo.findByIdAndUserId(id, uid)));
    }

    // ---------- Monthly summary ----------
    @GetMapping("/summary")
    public Map<String, Object> summary(@AuthenticationPrincipal Long uid, @RequestParam String month) {
        List<Transaction> list = forMonth(uid, month);
        BigDecimal income = total(list, Type.INCOME);
        BigDecimal expense = total(list, Type.EXPENSE);
        BigDecimal balance = income.subtract(expense);
        double savingsRate = income.signum() == 0 ? 0
                : balance.multiply(BigDecimal.valueOf(100)).divide(income, 1, RoundingMode.HALF_UP).doubleValue();

        Map<String, BigDecimal> byCategory = list.stream()
                .filter(t -> t.type == Type.EXPENSE)
                .collect(Collectors.groupingBy(t -> t.category, TreeMap::new,
                        Collectors.reducing(BigDecimal.ZERO, t -> t.amount, BigDecimal::add)));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("income", income);
        out.put("expense", expense);
        out.put("balance", balance);
        out.put("savingsRate", savingsRate);
        out.put("byCategory", byCategory);
        return out;
    }
}

package com.murali.finance.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "transactions")
public class Transaction {
    public enum Type { INCOME, EXPENSE }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @JsonIgnore @Column(name = "user_id", nullable = false)
    public Long userId;

    @NotBlank @Size(max = 120)
    public String title;

    @NotNull @Positive
    @Column(precision = 12, scale = 2)
    public BigDecimal amount;

    @NotNull @Enumerated(EnumType.STRING)
    public Type type;

    @NotBlank @Size(max = 60)
    public String category;

    @NotNull @Column(name = "tx_date")
    public LocalDate date;

    @Size(max = 255)
    public String note;
}

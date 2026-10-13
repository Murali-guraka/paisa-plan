package com.murali.finance.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

@Entity
@Table(name = "budgets", uniqueConstraints = @UniqueConstraint(columnNames = { "user_id", "category" }))
public class Budget {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @JsonIgnore @Column(name = "user_id", nullable = false)
    public Long userId;

    @NotBlank @Column(length = 60)
    public String category;

    @NotNull @Positive @Column(precision = 12, scale = 2)
    public BigDecimal limitAmount;
}

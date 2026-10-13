package com.murali.finance.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false, length = 80)
    public String name;

    @Column(nullable = false, unique = true, length = 160)
    public String email;

    @Column(nullable = false)
    public String passwordHash;
}

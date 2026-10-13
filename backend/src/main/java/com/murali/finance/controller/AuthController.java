package com.murali.finance.controller;

import com.murali.finance.model.AppUser;
import com.murali.finance.repository.UserRepository;
import com.murali.finance.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

     public record RegisterRequest(@NotBlank @Size(max = 80) String name,
                           @NotBlank @Email String email,
                           @NotBlank @Size(min = 6, max = 100) String password) {}
    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
    public record AuthResponse(String token, String name) {}

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest r) {
        String email = r.email().trim().toLowerCase();
        if (users.existsByEmail(email)) throw new ResponseStatusException(HttpStatus.CONFLICT);
        AppUser u = new AppUser();
        u.name = r.name().trim();
        u.email = email;
        u.passwordHash = encoder.encode(r.password()); // BCrypt hash, never the plain password
        users.save(u);
        return new AuthResponse(jwt.create(u.id), u.name);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest r) {
        AppUser u = users.findByEmail(r.email().trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!encoder.matches(r.password(), u.passwordHash)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return new AuthResponse(jwt.create(u.id), u.name);
    }
}

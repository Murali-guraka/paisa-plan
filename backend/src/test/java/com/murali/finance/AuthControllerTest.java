
package com.murali.finance;

import com.murali.finance.controller.AuthController;
import com.murali.finance.model.AppUser;
import com.murali.finance.repository.UserRepository;
import com.murali.finance.security.JwtService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private UserRepository users;

    @Mock
    private PasswordEncoder encoder;

    @Mock
    private JwtService jwt;

    private AuthController controller;

    @BeforeEach
    void setUp() {
        controller = new AuthController(users, encoder, jwt);
    }

    @Test
    void registerCreatesUserAndReturnsToken() {
        when(users.existsByEmail("murali@example.com"))
                .thenReturn(false);

        when(encoder.encode("secret123"))
                .thenReturn("bcrypt-hash");

        when(users.save(any(AppUser.class)))
                .thenAnswer(invocation -> {
                    AppUser user = invocation.getArgument(0);
                    user.id = 1L;
                    return user;
                });

        when(jwt.create(1L)).thenReturn("test-jwt");

        AuthController.RegisterRequest request =
                new AuthController.RegisterRequest(
                        " Murali ",
                        " MURALI@example.com ",
                        "secret123");

        AuthController.AuthResponse response =
                controller.register(request);

        assertEquals("Murali", response.name());
        assertEquals("test-jwt", response.token());

        verify(users).existsByEmail("murali@example.com");
        verify(encoder).encode("secret123");
        verify(users).save(any(AppUser.class));
        verify(jwt).create(1L);
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(users.existsByEmail("murali@example.com"))
                .thenReturn(true);

        AuthController.RegisterRequest request =
                new AuthController.RegisterRequest(
                        "Murali",
                        "Murali@example.com",
                        "secret123");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.register(request));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());

        verify(users, never()).save(any(AppUser.class));
        verify(encoder, never()).encode(anyString());
    }

    @Test
    void loginSucceedsWithCorrectPassword() {
        AppUser user = new AppUser();
        user.id = 1L;
        user.name = "Murali";
        user.email = "murali@example.com";
        user.passwordHash = "bcrypt-hash";

        when(users.findByEmail("murali@example.com"))
                .thenReturn(Optional.of(user));
        when(encoder.matches("secret123", "bcrypt-hash"))
                .thenReturn(true);
        when(jwt.create(1L)).thenReturn("test-jwt");

        AuthController.LoginRequest request =
                new AuthController.LoginRequest(
                        " MURALI@example.com ",
                        "secret123");

        AuthController.AuthResponse response =
                controller.login(request);

        assertEquals("Murali", response.name());
        assertEquals("test-jwt", response.token());

        verify(encoder).matches("secret123", "bcrypt-hash");
        verify(jwt).create(1L);
    }

    @Test
    void loginRejectsIncorrectPassword() {
        AppUser user = new AppUser();
        user.id = 1L;
        user.email = "murali@example.com";
        user.passwordHash = "bcrypt-hash";

        when(users.findByEmail("murali@example.com"))
                .thenReturn(Optional.of(user));
        when(encoder.matches("wrong-password", "bcrypt-hash"))
                .thenReturn(false);

        AuthController.LoginRequest request =
                new AuthController.LoginRequest(
                        "murali@example.com",
                        "wrong-password");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.login(request));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        verify(jwt, never()).create(anyLong());
    }

    @Test
    void loginRejectsUnknownEmail() {
        when(users.findByEmail("unknown@example.com"))
                .thenReturn(Optional.empty());

        AuthController.LoginRequest request =
                new AuthController.LoginRequest(
                        "unknown@example.com",
                        "secret123");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.login(request));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        verify(encoder, never()).matches(anyString(), anyString());
        verify(jwt, never()).create(anyLong());
    }
}

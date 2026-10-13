
package com.murali.finance;

import com.murali.finance.security.JwtService;

import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;

    // Must be at least 32 bytes for the HMAC signing key.
    private static final String SECRET =
            "this-is-a-test-secret-key-at-least-32-characters-long";

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET);
    }

    @Test
    void createGeneratesToken() {
        String token = jwtService.create(1L);

        assertNotNull(token);
        assertFalse(token.isBlank());
        assertEquals(1L, jwtService.parseUserId(token));
    }

    @Test
    void parseUserIdReturnsCorrectUserId() {
        String token = jwtService.create(123L);

        Long userId = jwtService.parseUserId(token);

        assertEquals(123L, userId);
    }

    @Test
    void differentUsersReceiveDifferentTokens() {
        String firstToken = jwtService.create(1L);
        String secondToken = jwtService.create(2L);

        assertNotEquals(firstToken, secondToken);
        assertEquals(1L, jwtService.parseUserId(firstToken));
        assertEquals(2L, jwtService.parseUserId(secondToken));
    }

    @Test
    void rejectsTokenSignedWithDifferentSecret() {
        JwtService anotherService = new JwtService(
                "a-completely-different-test-secret-key-32-chars");

        String token = jwtService.create(1L);

        assertThrows(
                JwtException.class,
                () -> anotherService.parseUserId(token)
        );
    }

    @Test
    void rejectsMalformedToken() {
        assertThrows(
                JwtException.class,
                () -> jwtService.parseUserId("not-a-valid-jwt")
        );
    }
}

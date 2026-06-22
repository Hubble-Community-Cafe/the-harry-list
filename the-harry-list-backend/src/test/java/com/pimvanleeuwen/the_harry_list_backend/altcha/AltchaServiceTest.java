package com.pimvanleeuwen.the_harry_list_backend.altcha;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AltchaServiceTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final AltchaService altcha = new AltchaService(true, "test-secret-key", 2000, 300);

    /** Solve the challenge the way the browser widget does: find n with SHA-256(salt+n) == challenge. */
    private long solve(String salt, String challenge, int maxNumber) throws Exception {
        for (long n = 0; n <= maxNumber; n++) {
            if (sha256Hex(salt + n).equals(challenge)) return n;
        }
        throw new IllegalStateException("unsolvable challenge");
    }

    private String payload(AltchaService.Challenge ch, long number) throws Exception {
        String json = mapper.writeValueAsString(Map.of(
                "algorithm", ch.algorithm(),
                "challenge", ch.challenge(),
                "number", number,
                "salt", ch.salt(),
                "signature", ch.signature()));
        return Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private String sha256Hex(String value) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void solvedChallenge_verifies() throws Exception {
        AltchaService.Challenge ch = altcha.createChallenge();
        long number = solve(ch.salt(), ch.challenge(), ch.maxnumber());
        assertThat(altcha.verify(payload(ch, number))).isTrue();
    }

    @Test
    void replayedPayload_isRejected() throws Exception {
        AltchaService.Challenge ch = altcha.createChallenge();
        String p = payload(ch, solve(ch.salt(), ch.challenge(), ch.maxnumber()));
        assertThat(altcha.verify(p)).isTrue();
        assertThat(altcha.verify(p)).isFalse();
    }

    @Test
    void wrongNumber_isRejected() throws Exception {
        AltchaService.Challenge ch = altcha.createChallenge();
        long number = solve(ch.salt(), ch.challenge(), ch.maxnumber());
        assertThat(altcha.verify(payload(ch, number == 0 ? 1 : number - 1))).isFalse();
    }

    @Test
    void missingOrGarbagePayload_isRejected() {
        assertThat(altcha.verify(null)).isFalse();
        assertThat(altcha.verify("")).isFalse();
        assertThat(altcha.verify("not-base64-or-json")).isFalse();
    }

    @Test
    void whenDisabled_anyPayloadPasses() {
        AltchaService off = new AltchaService(false, "", 2000, 300);
        assertThat(off.verify(null)).isTrue();
        assertThat(off.verify("garbage")).isTrue();
    }
}

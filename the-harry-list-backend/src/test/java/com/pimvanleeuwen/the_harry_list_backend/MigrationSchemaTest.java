package com.pimvanleeuwen.the_harry_list_backend;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Builds the schema from the Flyway migrations (not from the entities, as the other tests do)
 * on H2 in MariaDB mode, then lets Hibernate validate every entity against it. An entity change
 * without its migration fails here, in {@code ./mvnw test}, instead of first in the e2e stack.
 *
 * <p>H2 is not MariaDB: SQL that only MariaDB accepts can still pass here. The e2e stack runs
 * the same migrations on a real MariaDB.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:migrations;MODE=MariaDB;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
})
class MigrationSchemaTest {

    /** MariaDB's BOOLEAN is stored as tinyint(1); its driver reports it as a boolean, H2's does not. */
    private static final Pattern MARIADB_BOOLEAN = Pattern.compile("\\btinyint\\(1\\)", Pattern.CASE_INSENSITIVE);

    /** One {@code ALTER TABLE} with several comma-separated {@code MODIFY} clauses (MariaDB only). */
    private static final Pattern MULTI_MODIFY = Pattern.compile(
            "ALTER TABLE (\\S+)\\s+(MODIFY\\b[^;]*?,\\s*\\n\\s*MODIFY\\b[^;]*);", Pattern.CASE_INSENSITIVE);

    @Autowired
    private Flyway flyway;

    @DynamicPropertySource
    static void migrationsForH2(DynamicPropertyRegistry registry) {
        registry.add("spring.flyway.locations", () -> "filesystem:" + h2CompatibleCopyOfMigrations());
    }

    @Test
    void theMigrationsBuildASchemaEveryEntityValidatesAgainst() {
        // The context only starts when Hibernate's validation passed; this checks Flyway really ran.
        var applied = flyway.info().applied();
        assertTrue(applied.length > 0, "no migrations were applied");
        assertEquals(flyway.info().all().length, applied.length, "some migrations are still pending");
    }

    @Test
    void theH2ShimOnlyRewritesWhatH2Lacks() {
        String mariaDb = "ALTER TABLE `t`\n  MODIFY `a` varchar(20) NOT NULL,\n  MODIFY `b` decimal(10,2) DEFAULT NULL;";
        assertEquals("ALTER TABLE `t` MODIFY `a` varchar(20) NOT NULL;\nALTER TABLE `t` MODIFY `b` decimal(10,2) DEFAULT NULL;",
                forH2(mariaDb));
        assertEquals("ALTER TABLE `t`\n  MODIFY `a` varchar(20) NOT NULL;", forH2("ALTER TABLE `t`\n  MODIFY `a` varchar(20) NOT NULL;"));
        assertEquals("`soft_block` boolean NOT NULL, `n` tinyint(4)", forH2("`soft_block` tinyint(1) NOT NULL, `n` tinyint(4)"));
    }

    /**
     * The real migrations, copied to a temporary folder with the two rewrites H2 needs. H2 does not
     * accept several MODIFY clauses in one ALTER TABLE, so those become one statement per column;
     * and MariaDB's {@code tinyint(1)} (its BOOLEAN) becomes {@code boolean}. Applied migrations
     * must never change (Flyway checksums), so the files themselves stay as they are.
     */
    private static Path h2CompatibleCopyOfMigrations() {
        try {
            Path dir = Files.createTempDirectory("migrations-h2");
            for (Resource script : new PathMatchingResourcePatternResolver().getResources("classpath:db/migration/*.sql")) {
                String sql = new String(script.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                Files.writeString(dir.resolve(script.getFilename()), forH2(sql));
            }
            dir.toFile().deleteOnExit();
            return dir;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    static String forH2(String sql) {
        Matcher m = MULTI_MODIFY.matcher(MARIADB_BOOLEAN.matcher(sql).replaceAll("boolean"));
        StringBuilder out = new StringBuilder();
        while (m.find()) {
            String table = m.group(1);
            StringBuilder statements = new StringBuilder();
            for (String clause : m.group(2).split(",\\s*\\n\\s*(?=MODIFY\\b)")) {
                if (!statements.isEmpty()) statements.append('\n');
                statements.append("ALTER TABLE ").append(table).append(' ').append(clause.strip()).append(';');
            }
            m.appendReplacement(out, Matcher.quoteReplacement(statements.toString()));
        }
        m.appendTail(out);
        return out.toString();
    }
}

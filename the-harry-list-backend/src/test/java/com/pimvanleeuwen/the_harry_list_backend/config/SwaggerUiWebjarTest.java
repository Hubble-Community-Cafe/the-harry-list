package com.pimvanleeuwen.the_harry_list_backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URL;
import java.util.Collections;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The Swagger UI webjar is overridden in pom.xml (patched DOMPurify). springdoc serves the webjar path
 * of springdoc.swagger-ui.version, so the main application.properties must name the webjar that is on
 * the classpath, or Swagger UI answers 404.
 */
@SpringBootTest
@AutoConfigureMockMvc
class SwaggerUiWebjarTest {

    private static final String VERSION_KEY = "springdoc.swagger-ui.version";

    @Autowired
    private MockMvc mockMvc;

    // The test application.properties shadows the main one, so pass the main value in explicitly.
    @DynamicPropertySource
    static void useMainSwaggerUiVersion(DynamicPropertyRegistry registry) {
        registry.add(VERSION_KEY, SwaggerUiWebjarTest::mainSwaggerUiVersion);
    }

    @Test
    void mainConfigNamesTheWebjarOnTheClasspath() {
        String version = mainSwaggerUiVersion();
        assertThat(version).doesNotContain("@");
        assertThat(getClass().getClassLoader()
                .getResource("META-INF/resources/webjars/swagger-ui/" + version + "/swagger-ui-bundle.js"))
                .as("swagger-ui webjar %s on the classpath", version)
                .isNotNull();
    }

    @Test
    void servesSwaggerUi() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("swagger-ui-bundle.js")));
        mockMvc.perform(get("/swagger-ui/swagger-ui-bundle.js"))
                .andExpect(status().isOk());
    }

    private static String mainSwaggerUiVersion() {
        try {
            for (URL url : Collections.list(SwaggerUiWebjarTest.class.getClassLoader()
                    .getResources("application.properties"))) {
                Properties properties = new Properties();
                try (InputStream in = url.openStream()) {
                    properties.load(in);
                }
                if (properties.containsKey(VERSION_KEY)) {
                    return properties.getProperty(VERSION_KEY);
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        throw new IllegalStateException(VERSION_KEY + " not found in the main application.properties");
    }
}

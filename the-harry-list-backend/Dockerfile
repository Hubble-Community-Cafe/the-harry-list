# Stage 1: Build backend
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run backend
FROM eclipse-temurin:21-jre
WORKDIR /app

# Install curl for health checks and create non-root user
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=build /app/target/the-harry-list-backend-*.jar app.jar

# Switch to non-root user
USER appuser

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]

# Future: Add frontend build and serve stages here

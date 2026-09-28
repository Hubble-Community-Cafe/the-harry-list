# Stage 1: Build backend
FROM maven:3-eclipse-temurin-24 AS build
WORKDIR /app
COPY pom.xml .
# Resolve dependencies in their own layer, so a source-only change does not download them again.
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

# Stage 2: Run backend
# Alpine/musl JRE: a much smaller image with far fewer OS packages to trip vulnerability scanners
# than the Ubuntu-based tag. Safe for this app: it is pure Java (no native libraries), the PDF
# export uses OpenPDF's built-in fonts (no system fonts needed), and the JDK bundles its own
# timezone data, so TZ=Europe/Amsterdam works without the OS tzdata package.
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

# Pull the latest Alpine security fixes: the temurin base image is rebuilt less often than Alpine
# patches OpenSSL, expat and friends, so without this the image ships known, already-fixed CVEs.
# Then curl for the health check, and a non-root user (busybox addgroup/adduser syntax).
RUN apk upgrade --no-cache \
    && apk add --no-cache curl \
    && addgroup -S appgroup && adduser -S -G appgroup appuser

COPY --from=build /app/target/the-harry-list-backend-*.jar app.jar

# Switch to non-root user
USER appuser

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]

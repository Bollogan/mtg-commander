# Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy sources
COPY pom-parent.xml ./pom-parent.xml
COPY search-service ./search-service

# Build the project
RUN cd search-service && mvn -DskipTests clean package

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy JAR from builder
COPY --from=builder /app/search-service/target/search-service-*.jar search-service.jar

EXPOSE 11030

ENTRYPOINT ["java", "-jar", "search-service.jar"]

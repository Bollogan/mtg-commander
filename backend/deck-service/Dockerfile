# Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy sources
COPY pom-parent.xml ./pom-parent.xml
COPY deck-service ./deck-service

# Build the project
RUN cd deck-service && mvn -DskipTests clean package

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy JAR from builder
COPY --from=builder /app/deck-service/target/deck-service-*.jar deck-service.jar

EXPOSE 8084

ENTRYPOINT ["java", "-jar", "deck-service.jar"]

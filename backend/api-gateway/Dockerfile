# Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy sources
COPY pom-parent.xml ./pom-parent.xml
COPY api-gateway ./api-gateway

# Build the project
RUN cd api-gateway && mvn -DskipTests clean package

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy JAR from builder
COPY --from=builder /app/api-gateway/target/api-gateway-*.jar api-gateway.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "api-gateway.jar"]

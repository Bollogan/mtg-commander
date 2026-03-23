# Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy sources
COPY pom-parent.xml ./pom-parent.xml
COPY auth-service ./auth-service

# Build the project
RUN cd auth-service && mvn -DskipTests clean package

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy JAR from builder
COPY --from=builder /app/auth-service/target/auth-service-*.jar auth-service.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "auth-service.jar"]

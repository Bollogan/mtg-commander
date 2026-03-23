# Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy sources
COPY pom-parent.xml ./pom-parent.xml
COPY eureka-server ./eureka-server

# Build the project
RUN cd eureka-server && mvn -DskipTests clean package

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy JAR from builder
COPY --from=builder /app/eureka-server/target/eureka-server-*.jar eureka-server.jar

EXPOSE 8761

ENTRYPOINT ["java", "-jar", "eureka-server.jar"]

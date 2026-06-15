FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom-parent.xml ./pom-parent.xml
COPY ai-service ./ai-service
RUN cd ai-service && mvn -DskipTests clean package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/ai-service/target/ai-service-*.jar ai-service.jar
EXPOSE 8086
ENTRYPOINT ["java", "-jar", "ai-service.jar"]

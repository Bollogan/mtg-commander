FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom-parent.xml ./pom-parent.xml
COPY notification-service ./notification-service
RUN cd notification-service && mvn -DskipTests clean package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/notification-service/target/notification-service-*.jar notification-service.jar
EXPOSE 8087
ENTRYPOINT ["java", "-jar", "notification-service.jar"]

FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom-parent.xml ./pom-parent.xml
COPY user-service ./user-service
RUN cd user-service && mvn -DskipTests clean package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/user-service/target/user-service-*.jar user-service.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "user-service.jar"]

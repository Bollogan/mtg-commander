FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom-parent.xml ./pom-parent.xml
COPY game-service ./game-service
RUN cd game-service && mvn -DskipTests clean package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/game-service/target/game-service-*.jar game-service.jar
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "game-service.jar"]

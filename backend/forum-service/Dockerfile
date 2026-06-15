FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom-parent.xml ./pom-parent.xml
COPY forum-service ./forum-service
RUN cd forum-service && mvn -DskipTests clean package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/forum-service/target/forum-service-*.jar forum-service.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "forum-service.jar"]

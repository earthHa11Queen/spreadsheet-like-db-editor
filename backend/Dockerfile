# ========= Build Stage =========
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /workspace/app

# Gradle関連ファイルとソースコードをコピー
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .
COPY src src

# 実行権限を付与してビルド（テストはスキップ）
RUN chmod +x ./gradlew
RUN ./gradlew build -x test

# ========= Run Stage =========
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Buildステージで生成されたJarファイルのみをコピーして実行
COPY --from=build /workspace/app/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
    // One version catalog for the shared module and the app.
    versionCatalogs {
        create("libs") { from(files("../mobile-shared/gradle/libs.versions.toml")) }
    }
}

rootProject.name = "padel-android"
include(":app")
// Wear OS watch app: same applicationId as :app so the Data Layer pairs them.
include(":wear")

// Kotlin Multiplatform engine (+ data layer later); substitutes app.americanoo:shared.
includeBuild("../mobile-shared")

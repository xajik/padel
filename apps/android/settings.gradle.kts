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

// Kotlin Multiplatform engine (+ data layer later); substitutes app.padel:shared.
includeBuild("../mobile-shared")

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}

// Consumed by apps/android through includeBuild; the coordinates app.americanoo:shared resolve here.
rootProject.name = "shared"

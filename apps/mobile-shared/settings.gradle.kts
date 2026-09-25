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

// Consumed by apps/android through includeBuild; the coordinates app.padel:shared resolve here.
rootProject.name = "shared"

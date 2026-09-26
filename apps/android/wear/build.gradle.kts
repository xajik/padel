import java.util.Properties

val mobileVersion = Properties().apply { rootProject.file("../mobile-version.properties").inputStream().use { load(it) } }

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    // Same applicationId and signing key as :app: the Data Layer only pairs apps that match.
    namespace = "app.americanoo.wear"
    compileSdk = libs.versions.android.compileSdk.get().toInt()

    defaultConfig {
        applicationId = "app.americanoo.android"
        minSdk = libs.versions.wear.minSdk.get().toInt()
        targetSdk = libs.versions.android.compileSdk.get().toInt()
        // apps/mobile-version.properties, bumped on every tag (make tag / make release).
        // Play needs version codes distinct from the phone app's.
        versionCode = 1_000_000 + mobileVersion.getProperty("build").toInt()
        versionName = mobileVersion.getProperty("version")
        buildConfigField("String", "PADEL_BASE_URL", "\"${providers.gradleProperty("padel.baseUrl").getOrElse("https://padel-americanoo.com")}\"")
    }

    val keystoreProps = rootProject.file("keystore.properties").takeIf { it.exists() }
        ?.let { f -> Properties().apply { f.inputStream().use { load(it) } } }
    signingConfigs {
        if (keystoreProps != null) create("release") {
            storeFile = rootProject.file(keystoreProps.getProperty("storeFile"))
            storePassword = keystoreProps.getProperty("storePassword")
            keyAlias = keystoreProps.getProperty("keyAlias")
            keyPassword = keystoreProps.getProperty("keyPassword")
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.findByName("release")
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

kotlin { jvmToolchain(17) }

dependencies {
    implementation("app.americanoo:shared")
    implementation(libs.core.ktx)
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)
    implementation(libs.wear.compose.material3)
    implementation(libs.wear.compose.foundation)
    implementation(libs.wear.compose.navigation)
    implementation(libs.play.services.wearable)
    implementation(libs.coroutines.play.services)

    testImplementation(libs.junit)
}

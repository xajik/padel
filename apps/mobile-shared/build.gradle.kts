import org.jetbrains.kotlin.gradle.plugin.mpp.apple.XCFramework

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.android.kmp.library)
}

group = "app.americanoo"
version = "0.1.0"

// Golden fixtures produced by the TS engine (packages/engine: npm run fixtures).
val fixturesDir: String = rootDir.resolve("../../packages/engine/fixtures").canonicalPath
val fixturesSource = tasks.register("fixturesSource") {
    val out = layout.buildDirectory.dir("generated/fixtures")
    val path = fixturesDir
    inputs.property("path", path)
    outputs.dir(out)
    doLast {
        val file = out.get().file("app/americanoo/engine/FixturesDir.kt").asFile
        file.parentFile.mkdirs()
        file.writeText("package app.americanoo.engine\n\ninternal const val FIXTURES_DIR = \"$path\"\n")
    }
}

kotlin {
    jvmToolchain(17)

    androidLibrary {
        namespace = "app.americanoo.shared"
        compileSdk = libs.versions.android.compileSdk.get().toInt()
        minSdk = libs.versions.android.minSdk.get().toInt()
    }

    // JVM target runs the fixture suite quickly on any machine (CI, Linux).
    jvm()

    // One XCFramework for the iPhone app and the Apple Watch app (watchOS: arm64_32, arm64, simulator).
    val xcf = XCFramework("PadelShared")
    listOf(iosArm64(), iosSimulatorArm64(), watchosArm64(), watchosDeviceArm64(), watchosSimulatorArm64()).forEach {
        it.binaries.framework {
            baseName = "PadelShared"
            isStatic = true
            xcf.add(this)
        }
    }

    sourceSets {
        all {
            languageSettings.optIn("kotlin.experimental.ExperimentalObjCName")
            languageSettings.optIn("kotlin.time.ExperimentalTime")
        }
        commonMain.dependencies {
            api(libs.kotlinx.serialization.json)
            api(libs.coroutines.core)
            implementation(libs.ktor.client.core)
            implementation(libs.ktor.client.content.negotiation)
            implementation(libs.ktor.serialization.json)
        }
        androidMain.dependencies {
            implementation(libs.ktor.client.android)
        }
        jvmMain.dependencies {
            implementation(libs.ktor.client.okhttp)
        }
        appleMain.dependencies {
            implementation(libs.ktor.client.darwin)
        }
        commonTest {
            kotlin.srcDir(fixturesSource)
            dependencies {
                implementation(kotlin("test"))
                implementation(libs.ktor.client.mock)
                implementation(libs.coroutines.test)
            }
        }
    }
}

package app.americanoo.data

import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.android.Android

internal actual fun defaultEngine(): HttpClientEngine = Android.create()
